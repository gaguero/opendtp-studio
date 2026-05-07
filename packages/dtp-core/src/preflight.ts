import type { ImageFrame, LayoutDocument, TextFrame } from "./schema.js";
import { estimateCharactersPerFrame, storyForFrame } from "./metrics.js";

export type PreflightIssue = {
  code: "overset-risk" | "missing-image" | "soft-cmyk" | "no-bleed" | "tiny-frame";
  severity: "info" | "warning" | "error";
  message: string;
  frameId?: string;
};

export type PreflightReport = {
  score: number;
  issues: PreflightIssue[];
  textCapacity: number;
  textLength: number;
};

export function runPreflight(document: LayoutDocument): PreflightReport {
  const issues: PreflightIssue[] = [];
  let textCapacity = 0;
  let textLength = 0;

  for (const page of document.pages) {
    for (const frame of page.frames) {
      if (frame.type === "text") {
        const textFrame = frame as TextFrame;
        const storyText = storyForFrame(document, textFrame);
        const capacity = estimateCharactersPerFrame(document, textFrame);
        textCapacity += capacity;
        if (textFrame.role === "body") textLength += storyText.length;
        if (capacity < 120 && textFrame.role !== "headline") {
          issues.push({
            code: "tiny-frame",
            severity: "warning",
            frameId: textFrame.id,
            message: `Text frame "${textFrame.id}" is very small and may hide copy.`
          });
        }
      }

      if (frame.type === "image") {
        const imageFrame = frame as ImageFrame;
        if (!imageFrame.src) {
          issues.push({
            code: "missing-image",
            severity: "warning",
            frameId: imageFrame.id,
            message: `Image frame "${imageFrame.id}" is using a generated placeholder.`
          });
        }
      }
    }
  }

  if (textLength > textCapacity) {
    issues.push({
      code: "overset-risk",
      severity: "error",
      message: `Story copy is longer than estimated frame capacity (${textLength}/${textCapacity} characters).`
    });
  }

  if (document.colorMode === "cmyk-soft-proof") {
    issues.push({
      code: "soft-cmyk",
      severity: "info",
      message: "CMYK is currently soft-proof metadata; validate final PDF with ICC/PDF-X tooling."
    });
  }

  if (document.pageSize.bleedMm <= 0) {
    issues.push({
      code: "no-bleed",
      severity: "warning",
      message: "No bleed is set. Print jobs with edge-to-edge artwork usually need 3 mm bleed."
    });
  }

  const penalty = issues.reduce((total, issue) => total + (issue.severity === "error" ? 32 : issue.severity === "warning" ? 12 : 4), 0);
  return {
    score: Math.max(0, 100 - penalty),
    issues,
    textCapacity,
    textLength
  };
}
