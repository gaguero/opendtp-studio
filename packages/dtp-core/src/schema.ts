import { z } from "zod";

export const colorModeSchema = z.enum(["rgb", "cmyk-soft-proof"]);

export const pageSizeSchema = z.object({
  name: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  bleedMm: z.number().min(0).max(20),
  marginMm: z.number().min(0).max(80)
});

export const typographySchema = z.object({
  fontFamily: z.string().min(1),
  baseSizePt: z.number().min(6).max(96),
  leading: z.number().min(0.8).max(3),
  measure: z.number().min(24).max(120)
});

export const textFrameSchema = z.object({
  id: z.string().min(1),
  type: z.literal("text"),
  storyId: z.string().min(1),
  xMm: z.number(),
  yMm: z.number(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  columns: z.number().int().min(1).max(8),
  columnGapMm: z.number().min(0).max(24),
  role: z.enum(["headline", "body", "caption", "pullquote"])
});

export const imageFrameSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image"),
  xMm: z.number(),
  yMm: z.number(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  fit: z.enum(["cover", "contain"]),
  alt: z.string(),
  src: z.string().optional()
});

export const frameSchema = z.discriminatedUnion("type", [textFrameSchema, imageFrameSchema]);

export const pageSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  frames: z.array(frameSchema).min(1)
});

export const storySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1)
});

export const layoutDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  intent: z.string().min(1),
  colorMode: colorModeSchema,
  pageSize: pageSizeSchema,
  typography: typographySchema,
  stories: z.array(storySchema).min(1),
  pages: z.array(pageSchema).min(1),
  preflight: z.object({
    warnings: z.array(z.string()),
    estimatedPages: z.number().int().positive()
  })
});

export type LayoutDocument = z.infer<typeof layoutDocumentSchema>;
export type PageFrame = z.infer<typeof frameSchema>;
export type TextFrame = z.infer<typeof textFrameSchema>;
export type ImageFrame = z.infer<typeof imageFrameSchema>;
