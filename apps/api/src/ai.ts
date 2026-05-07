import OpenAI from "openai";
import {
  applyLayoutPatches,
  generateFallbackLayout,
  validateLayout,
  type LayoutDocument,
  type LayoutPatch,
  type StoryEdit
} from "@opendtp/dtp-core";
import { createHash, randomUUID } from "node:crypto";

export type AiProviderConfig = {
  apiKey?: string;
  model: string;
};

export type LayoutEditResult = {
  layout: LayoutDocument;
  patches: LayoutPatch[];
  provider: string;
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

export async function editTextWithAi(text: string, instruction: string, config: AiProviderConfig): Promise<{ text: string; edit: StoryEdit; provider: string }> {
  const editMode = inferEditMode(instruction);
  if (!config.apiKey) {
    const revised = localEdit(text, instruction);
    return {
      text: revised,
      edit: {
        storyId: "story-main",
        originalTextHash: hashText(text),
        revisedText: revised,
        editMode,
        summary: "Applied deterministic local text edit.",
        riskFlags: []
      },
      provider: "local-fallback"
    };
  }

  const client = new OpenAI({ apiKey: config.apiKey });
  const response = await client.responses.create({
    model: config.model,
    input: `Edit this editorial copy. Instruction: ${instruction}\n\nText:\n${text}`
  });

  const revised = response.output_text.trim();
  return {
    text: revised,
    edit: {
      storyId: "story-main",
      originalTextHash: hashText(text),
      revisedText: revised,
      editMode,
      summary: "Edited with configured OpenAI model.",
      riskFlags: []
    },
    provider: "openai"
  };
}

export function applyLayoutInstruction(layout: LayoutDocument, instruction: string): LayoutEditResult {
  const patches = inferLayoutPatches(layout, instruction);
  return {
    layout: applyLayoutPatches(layout, patches),
    patches,
    provider: "local-layout-patches"
  };
}

export function inferLayoutPatches(layout: LayoutDocument, instruction: string): LayoutPatch[] {
  const lower = instruction.toLowerCase();
  const patches: LayoutPatch[] = [];
  const bodyFrame = layout.pages.flatMap((page) => page.frames).find((frame) => frame.type === "text" && frame.role === "body");
  if (lower.includes("3 columns") || lower.includes("3 columnas")) {
    if (bodyFrame) patches.push({ op: "set_text_columns", frameId: bodyFrame.id, columns: 3, columnGapMm: 5 });
  }
  if (lower.includes("2 columns") || lower.includes("2 columnas")) {
    if (bodyFrame) patches.push({ op: "set_text_columns", frameId: bodyFrame.id, columns: 2, columnGapMm: 5 });
  }
  if (lower.includes("bleed") || lower.includes("sangrado")) patches.push({ op: "set_page_bleed", bleedMm: 3 });
  if (lower.includes("larger") || lower.includes("bigger") || lower.includes("más grande")) {
    patches.push({ op: "set_typography", baseSizePt: Math.min(96, layout.typography.baseSizePt + 1) });
  }
  if (lower.includes("tighter") || lower.includes("denser") || lower.includes("denso")) {
    patches.push({ op: "set_typography", leading: Math.max(0.9, layout.typography.leading - 0.08) });
  }
  return patches.length ? patches : [{ op: "set_page_bleed", bleedMm: layout.pageSize.bleedMm }];
}

function localEdit(text: string, instruction: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (instruction.toLowerCase().includes("short")) return `${trimmed.slice(0, 220)}${trimmed.length > 220 ? "..." : ""}`;
  return trimmed.replace(/\bai\b/gi, "AI");
}

export function createAiRunRecord(task: string, provider: string, model: string, input: unknown, output: unknown, latencyMs: number, valid: boolean) {
  return {
    id: `airun-${randomUUID()}`,
    task,
    provider,
    model,
    promptVersion: "2026-05-07",
    inputHash: hashText(JSON.stringify(input)),
    outputHash: hashText(JSON.stringify(output)),
    latencyMs,
    valid,
    createdAt: new Date().toISOString()
  };
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function inferEditMode(instruction: string): StoryEdit["editMode"] {
  const lower = instruction.toLowerCase();
  if (lower.includes("short") || lower.includes("fit") || lower.includes("reduce")) return "shorten";
  if (lower.includes("expand") || lower.includes("longer")) return "expand";
  if (lower.includes("headline")) return "headline";
  if (lower.includes("caption")) return "caption";
  if (lower.includes("translate")) return "translate";
  if (lower.includes("tone")) return "tone";
  return "grammar";
}
