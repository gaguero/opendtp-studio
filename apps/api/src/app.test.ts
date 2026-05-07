import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

const app = buildApp({
  port: 0,
  host: "127.0.0.1",
  openAiModel: "gpt-4o-mini",
  webDistPath: fileURLToPath(new URL("../../../apps/web/dist", import.meta.url))
});

describe("api", () => {
  it("reports health", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
  });

  it("generates layout without OpenAI credentials", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/layouts/generate",
      payload: { prompt: "Create an A4 editorial brief with 3 columns and bleed" }
    });
    const json = response.json();
    expect(response.statusCode).toBe(200);
    expect(json.provider).toBe("local-fallback");
    expect(json.layout.pageSize.name).toBe("A4");
    expect(json.preflight.score).toBeGreaterThan(0);
  });

  it("exports a real PDF", async () => {
    const sample = await app.inject({ method: "GET", url: "/api/sample" });
    const response = await app.inject({
      method: "POST",
      url: "/api/export/pdf",
      payload: { layout: sample.json().layout }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.rawPayload.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("returns structured validation errors", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/layouts/generate",
      payload: { prompt: "" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBeTruthy();
  });
});
