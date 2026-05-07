import OpenAI from "openai";
import { generateFallbackLayout, validateLayout, type LayoutDocument } from "@opendtp/dtp-core";

export type AiProviderConfig = {
  apiKey?: string;
  model: string;
};

export async function promptToLayout(prompt: string, config: AiProviderConfig): Promise<{ layout: LayoutDocument; provider: string }> {
  if (!config.apiKey) {
    return { layout: generateFallbackLayout({ prompt, seed: "fallback" }), provider: "local-fallback" };
  }

  const client = new OpenAI({ apiKey: config.apiKey });
  const response = await client.responses.create({
    model: config.model,
    input: [
      {
        role: "system",
        content:
          "You generate browser-DTP layout JSON. Return only valid JSON matching the requested document model. Use millimeters for geometry and include preflight warnings for print limitations."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "layout_document",
        strict: false,
        schema: {
          type: "object",
          additionalProperties: true
        }
      }
    }
  });

  const raw = response.output_text;
  try {
    return { layout: validateLayout(JSON.parse(raw)), provider: "openai" };
  } catch {
    return { layout: generateFallbackLayout({ prompt, seed: "openai-repair" }), provider: "openai-with-local-repair" };
  }
}

export async function editTextWithAi(text: string, instruction: string, config: AiProviderConfig): Promise<{ text: string; provider: string }> {
  if (!config.apiKey) {
    return { text: localEdit(text, instruction), provider: "local-fallback" };
  }

  const client = new OpenAI({ apiKey: config.apiKey });
  const response = await client.responses.create({
    model: config.model,
    input: `Edit this editorial copy. Instruction: ${instruction}\n\nText:\n${text}`
  });

  return { text: response.output_text.trim(), provider: "openai" };
}

export function applyLayoutInstruction(layout: LayoutDocument, instruction: string): LayoutDocument {
  const lower = instruction.toLowerCase();
  const next = structuredClone(layout);
  if (lower.includes("3 columns") || lower.includes("3 columnas")) {
    for (const page of next.pages) {
      for (const frame of page.frames) {
        if (frame.type === "text" && frame.role === "body") frame.columns = 3;
      }
    }
  }
  if (lower.includes("2 columns") || lower.includes("2 columnas")) {
    for (const page of next.pages) {
      for (const frame of page.frames) {
        if (frame.type === "text" && frame.role === "body") frame.columns = 2;
      }
    }
  }
  if (lower.includes("bleed") || lower.includes("sangrado")) next.pageSize.bleedMm = 3;
  next.preflight.warnings = Array.from(new Set([...next.preflight.warnings, `Applied instruction: ${instruction}`]));
  return validateLayout(next);
}

function localEdit(text: string, instruction: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (instruction.toLowerCase().includes("short")) return `${trimmed.slice(0, 220)}${trimmed.length > 220 ? "..." : ""}`;
  return trimmed.replace(/\bai\b/gi, "AI");
}
