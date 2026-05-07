import type { LayoutDocument } from "./schema.js";

export const sampleLayout: LayoutDocument = {
  id: "sample-editorial-brief",
  title: "Civic Type Specimen",
  intent: "A compact editorial spread for testing text flow and prepress metadata.",
  colorMode: "cmyk-soft-proof",
  pageSize: {
    name: "A4",
    widthMm: 210,
    heightMm: 297,
    bleedMm: 3,
    marginMm: 16
  },
  typography: {
    fontFamily: "Aptos",
    baseSizePt: 10.5,
    leading: 1.42,
    measure: 68
  },
  stories: [
    {
      id: "story-main",
      title: "Civic Type Specimen",
      content:
        "OpenDTP Studio turns structured editorial intent into precise page objects. This sample story is deliberately long enough to demonstrate browser-native column flow, text rhythm, and proofing metadata. Designers can begin with a prompt, refine the generated JSON, and keep the result inspectable rather than hidden inside a black-box canvas. The first milestone focuses on professional constraints: page size, bleed, margins, repeatable typography, text frames, image frames, and a clear export path. Future milestones add hyphenation dictionaries, linked story threading across pages, font subsetting, separations, and PDF/X validation."
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
          xMm: 16,
          yMm: 18,
          widthMm: 178,
          heightMm: 36,
          columns: 1,
          columnGapMm: 0,
          role: "headline"
        },
        {
          id: "hero-art",
          type: "image",
          xMm: 16,
          yMm: 62,
          widthMm: 84,
          heightMm: 62,
          fit: "cover",
          alt: "Abstract proofing block"
        },
        {
          id: "body-copy",
          type: "text",
          storyId: "story-main",
          xMm: 108,
          yMm: 62,
          widthMm: 86,
          heightMm: 190,
          columns: 2,
          columnGapMm: 5,
          role: "body"
        }
      ]
    }
  ],
  preflight: {
    warnings: ["CMYK is soft-proof metadata in MVP; PDF/X conversion requires a dedicated export worker."],
    estimatedPages: 1
  }
};
