import type { LayoutDocument, TextFrame } from "./schema.js";

export function storyForFrame(document: LayoutDocument, frame: TextFrame): string {
  const story = document.stories.find((candidate) => candidate.id === frame.storyId);
  return story?.content ?? "";
}

export function estimateCharactersPerFrame(document: LayoutDocument, frame: TextFrame): number {
  const averageGlyphWidthMm = (document.typography.baseSizePt * 0.3528 * 0.5);
  const linesPerColumn = Math.floor(frame.heightMm / (document.typography.baseSizePt * 0.3528 * document.typography.leading));
  const columnWidth = (frame.widthMm - frame.columnGapMm * (frame.columns - 1)) / frame.columns;
  const charsPerLine = Math.floor(columnWidth / averageGlyphWidthMm);
  return Math.max(0, linesPerColumn * charsPerLine * frame.columns);
}
