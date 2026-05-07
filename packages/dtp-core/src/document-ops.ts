import { layoutDocumentSchema, type ImageFrame, type LayoutDocument } from "./schema.js";

export type ImageAssetLike = {
  id: string;
  storageKey: string;
  metadata: {
    width?: number;
    height?: number;
  };
};

export function addPageWithLinkedStory(document: LayoutDocument, storyId = "story-main"): LayoutDocument {
  const next = structuredClone(document) as LayoutDocument;
  const pageNumber = next.pages.length + 1;
  const margin = next.pageSize.marginMm;
  const width = next.pageSize.widthMm - margin * 2;
  const height = next.pageSize.heightMm - margin * 2;
  next.pages.push({
    id: `page-${pageNumber}`,
    number: pageNumber,
    frames: [
      {
        id: `body-${pageNumber}`,
        type: "text",
        storyId,
        xMm: margin,
        yMm: margin,
        widthMm: width,
        heightMm: height,
        columns: 2,
        columnGapMm: 5,
        role: "body"
      }
    ]
  });
  next.preflight.estimatedPages = next.pages.length;
  return layoutDocumentSchema.parse(next);
}

export function updateStoryContent(document: LayoutDocument, storyId: string, content: string): LayoutDocument {
  const next = structuredClone(document) as LayoutDocument;
  const story = next.stories.find((candidate) => candidate.id === storyId);
  if (story) story.content = content;
  return layoutDocumentSchema.parse(next);
}

export function placedImageDpi(frame: ImageFrame, asset: ImageAssetLike): number | null {
  const widthPx = asset.metadata.width;
  const heightPx = asset.metadata.height;
  if (!widthPx || !heightPx) return null;
  const widthIn = frame.widthMm / 25.4;
  const heightIn = frame.heightMm / 25.4;
  const dpiX = widthPx / widthIn;
  const dpiY = heightPx / heightIn;
  return Math.round(Math.min(dpiX, dpiY));
}
