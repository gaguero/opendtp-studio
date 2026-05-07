import { layoutDocumentSchema, type LayoutDocument } from "./schema.js";

const PAGE_PRESETS = {
  a4: { name: "A4", widthMm: 210, heightMm: 297 },
  letter: { name: "Letter", widthMm: 215.9, heightMm: 279.4 },
  square: { name: "Square", widthMm: 210, heightMm: 210 }
} as const;

export type PromptLayoutOptions = {
  prompt: string;
  seed?: string;
};

export function generateFallbackLayout({ prompt, seed = "local" }: PromptLayoutOptions): LayoutDocument {
  const normalized = prompt.trim() || "Create an editorial one-page article";
  const lower = normalized.toLowerCase();
  const preset = lower.includes("letter") ? PAGE_PRESETS.letter : lower.includes("square") ? PAGE_PRESETS.square : PAGE_PRESETS.a4;
  const columns = extractColumns(lower);
  const title = extractTitle(normalized);
  const body = buildBodyCopy(normalized, title);
  const marginMm = 16;
  const pageWidth = preset.widthMm;
  const pageHeight = preset.heightMm;
  const contentWidth = pageWidth - marginMm * 2;

  const document: LayoutDocument = {
    id: `layout-${slugify(seed)}-${Date.now().toString(36)}`,
    title,
    intent: normalized,
    colorMode: "cmyk-soft-proof",
    pageSize: {
      ...preset,
      bleedMm: lower.includes("bleed") ? 3 : 0,
      marginMm
    },
    typography: {
      fontFamily: "Aptos",
      baseSizePt: lower.includes("poster") ? 12 : 10.5,
      leading: 1.42,
      measure: 68
    },
    stories: [
      {
        id: "story-main",
        title,
        content: body
      }
    ],
    pages: [
      {
        id: "page-1",
        number: 1,
        frames: [
          {
            id: "headline",
            type: "text",
            storyId: "story-main",
            xMm: marginMm,
            yMm: marginMm,
            widthMm: contentWidth,
            heightMm: lower.includes("poster") ? 54 : 34,
            columns: 1,
            columnGapMm: 0,
            role: "headline"
          },
          {
            id: "image-1",
            type: "image",
            xMm: marginMm,
            yMm: lower.includes("poster") ? 76 : 58,
            widthMm: contentWidth * 0.42,
            heightMm: 64,
            fit: "cover",
            alt: "Generated visual placeholder"
          },
          {
            id: "body",
            type: "text",
            storyId: "story-main",
            xMm: marginMm + contentWidth * 0.48,
            yMm: lower.includes("poster") ? 76 : 58,
            widthMm: contentWidth * 0.52,
            heightMm: pageHeight - marginMm - (lower.includes("poster") ? 76 : 58),
            columns,
            columnGapMm: 5,
            role: "body"
          }
        ]
      }
    ],
    preflight: {
      warnings: [
        "MVP uses browser CSS columns for live flow; long-form linked frames are planned for the export worker.",
        "CMYK is represented as soft-proof metadata until PDF/X conversion is enabled."
      ],
      estimatedPages: Math.max(1, Math.ceil(body.length / 2600))
    }
  };

  return layoutDocumentSchema.parse(document);
}

export function validateLayout(candidate: unknown): LayoutDocument {
  return layoutDocumentSchema.parse(candidate);
}

function extractColumns(prompt: string): number {
  const match = prompt.match(/(\d+)\s*(columns|columnas|cols)/i);
  const parsed = match?.[1] ? Number(match[1]) : prompt.includes("magazine") || prompt.includes("revista") ? 3 : 2;
  return Math.min(4, Math.max(1, parsed));
}

function extractTitle(prompt: string): string {
  const titleMatch = prompt.match(/(?:title|titulo|título)\s*[:"-]\s*([^.;\n]+)/i);
  if (titleMatch?.[1]) return titleMatch[1].trim().slice(0, 80);
  const sentence = prompt.split(/[.;\n]/)[0]?.trim();
  return sentence ? sentence.replace(/^create\s+/i, "").slice(0, 80) : "Untitled Layout";
}

function buildBodyCopy(prompt: string, title: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  return [
    `${title}.`,
    clean,
    "This generated draft establishes hierarchy, printable page geometry, flowing text columns, and editable frames. Use natural-language edits to change tone, density, page format, or column count while preserving a validated layout contract.",
    "The document remains plain JSON so designers, developers, and prepress tooling can inspect every decision."
  ].join(" ");
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seed";
}
