import { z } from "zod";
import { layoutDocumentSchema, type LayoutDocument } from "./schema.js";

export const layoutPatchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_frame_geometry"),
    frameId: z.string().min(1),
    xMm: z.number().min(0),
    yMm: z.number().min(0),
    widthMm: z.number().positive(),
    heightMm: z.number().positive()
  }),
  z.object({
    op: z.literal("set_text_columns"),
    frameId: z.string().min(1),
    columns: z.number().int().min(1).max(8),
    columnGapMm: z.number().min(0).max(24)
  }),
  z.object({
    op: z.literal("set_page_bleed"),
    bleedMm: z.number().min(0).max(20)
  }),
  z.object({
    op: z.literal("replace_story"),
    storyId: z.string().min(1),
    content: z.string().min(1)
  }),
  z.object({
    op: z.literal("set_typography"),
    fontFamily: z.string().min(1).optional(),
    baseSizePt: z.number().min(6).max(96).optional(),
    leading: z.number().min(0.8).max(3).optional()
  })
]);

export const storyEditSchema = z.object({
  storyId: z.string().min(1),
  originalTextHash: z.string().min(1),
  revisedText: z.string().min(1),
  editMode: z.enum(["grammar", "shorten", "expand", "tone", "headline", "caption", "translate"]),
  summary: z.string(),
  riskFlags: z.array(z.string())
});

export const assetGenerationJobSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  frameId: z.string().min(1),
  kind: z.enum(["generate", "edit", "variation"]),
  prompt: z.string().min(1),
  referenceAssetIds: z.array(z.string()),
  maskAssetId: z.string().optional(),
  output: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    format: z.enum(["png", "jpeg", "webp"]),
    transparentBackground: z.boolean()
  })
});

export const aiRunRecordSchema = z.object({
  id: z.string().min(1),
  task: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  inputHash: z.string().min(1),
  outputHash: z.string().min(1),
  latencyMs: z.number().min(0),
  valid: z.boolean(),
  createdAt: z.string().datetime()
});

export type LayoutPatch = z.infer<typeof layoutPatchSchema>;
export type StoryEdit = z.infer<typeof storyEditSchema>;
export type AssetGenerationJob = z.infer<typeof assetGenerationJobSchema>;
export type AiRunRecord = z.infer<typeof aiRunRecordSchema>;

export function applyLayoutPatches(document: LayoutDocument, patches: LayoutPatch[]): LayoutDocument {
  const next = structuredClone(document) as LayoutDocument;
  for (const patch of patches) {
    switch (patch.op) {
      case "set_frame_geometry":
        for (const page of next.pages) {
          for (const frame of page.frames) {
            if (frame.id === patch.frameId) {
              frame.xMm = patch.xMm;
              frame.yMm = patch.yMm;
              frame.widthMm = patch.widthMm;
              frame.heightMm = patch.heightMm;
            }
          }
        }
        break;
      case "set_text_columns":
        for (const page of next.pages) {
          for (const frame of page.frames) {
            if (frame.type === "text" && frame.id === patch.frameId) {
              frame.columns = patch.columns;
              frame.columnGapMm = patch.columnGapMm;
            }
          }
        }
        break;
      case "set_page_bleed":
        next.pageSize.bleedMm = patch.bleedMm;
        break;
      case "replace_story":
        for (const story of next.stories) {
          if (story.id === patch.storyId) story.content = patch.content;
        }
        break;
      case "set_typography":
        next.typography = {
          ...next.typography,
          ...(patch.fontFamily ? { fontFamily: patch.fontFamily } : {}),
          ...(patch.baseSizePt ? { baseSizePt: patch.baseSizePt } : {}),
          ...(patch.leading ? { leading: patch.leading } : {})
        };
        break;
    }
  }
  return layoutDocumentSchema.parse(next);
}
