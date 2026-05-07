import { describe, expect, it } from "vitest";
import { generateFallbackLayout, validateLayout } from "./prompt.js";
import { sampleLayout } from "./sample.js";
import { estimateCharactersPerFrame } from "./metrics.js";
import { runPreflight } from "./preflight.js";
import { applyLayoutPatches, type LayoutPatch } from "./ai-contracts.js";
import { addPageWithLinkedStory, placedImageDpi, updateStoryContent } from "./document-ops.js";

describe("dtp-core", () => {
  it("validates the sample layout", () => {
    expect(validateLayout(sampleLayout).title).toBe("Civic Type Specimen");
  });

  it("generates a valid layout from a prompt", () => {
    const layout = generateFallbackLayout({
      prompt: "Create an A4 magazine spread title: Solar Food Systems with 3 columns and bleed",
      seed: "test"
    });

    expect(layout.pageSize.name).toBe("A4");
    expect(layout.pageSize.bleedMm).toBe(3);
    expect(layout.pages[0]?.frames.some((frame) => frame.type === "text")).toBe(true);
  });

  it("estimates text capacity for body frames", () => {
    const body = sampleLayout.pages[0]?.frames.find((frame) => frame.id === "body-copy");
    if (!body || body.type !== "text") throw new Error("Expected body text frame");
    expect(estimateCharactersPerFrame(sampleLayout, body)).toBeGreaterThan(1000);
  });

  it("reports preflight issues and score", () => {
    const report = runPreflight(sampleLayout);
    expect(report.score).toBeLessThan(100);
    expect(report.issues.some((issue) => issue.code === "missing-image")).toBe(true);
    expect(report.textCapacity).toBeGreaterThan(report.textLength);
  });

  it("applies typed layout patches", () => {
    const patches: LayoutPatch[] = [
      { op: "set_page_bleed", bleedMm: 3 },
      { op: "set_text_columns", frameId: "body-copy", columns: 3, columnGapMm: 4 }
    ];
    const next = applyLayoutPatches(sampleLayout, patches);
    const body = next.pages[0]?.frames.find((frame) => frame.id === "body-copy");
    expect(next.pageSize.bleedMm).toBe(3);
    expect(body?.type === "text" ? body.columns : 0).toBe(3);
  });

  it("adds pages with linked story frames", () => {
    const next = addPageWithLinkedStory(sampleLayout);
    expect(next.pages).toHaveLength(2);
    const frame = next.pages[1]?.frames[0];
    expect(frame?.type === "text" ? frame.storyId : "").toBe("story-main");
  });

  it("updates story content and estimates placed image DPI", () => {
    const next = updateStoryContent(sampleLayout, "story-main", "Updated copy");
    const image = sampleLayout.pages[0]?.frames.find((frame) => frame.type === "image");
    if (!image || image.type !== "image") throw new Error("Expected image frame");
    expect(next.stories[0]?.content).toBe("Updated copy");
    expect(placedImageDpi(image, { id: "asset", storageKey: "asset.png", metadata: { width: 2400, height: 1800 } })).toBeGreaterThan(300);
  });

  it("flags low placed image DPI in preflight context", () => {
    const layout = structuredClone(sampleLayout);
    const image = layout.pages[0]?.frames.find((frame) => frame.type === "image");
    if (!image || image.type !== "image") throw new Error("Expected image frame");
    image.src = "/api/assets/low.png";
    const report = runPreflight(layout, { assets: [{ id: "a", storageKey: "low.png", metadata: { width: 320, height: 240 } }] });
    expect(report.issues.some((issue) => issue.code === "low-dpi")).toBe(true);
  });
});
