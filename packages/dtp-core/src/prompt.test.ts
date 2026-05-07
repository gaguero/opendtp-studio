import { describe, expect, it } from "vitest";
import { generateFallbackLayout, validateLayout } from "./prompt.js";
import { sampleLayout } from "./sample.js";
import { estimateCharactersPerFrame } from "./metrics.js";
import { runPreflight } from "./preflight.js";

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
});
