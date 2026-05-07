import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildApp } from "./app.js";
import { sampleLayout } from "@opendtp/dtp-core";

describe("api", () => {
  async function testApp() {
    const dataDir = await mkdtemp(path.join(tmpdir(), "opendtp-test-"));
    const app = buildApp({
      port: 0,
      host: "127.0.0.1",
      openAiModel: "gpt-4o-mini",
      webDistPath: fileURLToPath(new URL("../../../apps/web/dist", import.meta.url)),
      dataDir
    });
    return { app, dataDir };
  }

  it("reports health", async () => {
    const { app, dataDir } = await testApp();
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    await rm(dataDir, { recursive: true, force: true });
  });

  it("generates layout without OpenAI credentials", async () => {
    const { app, dataDir } = await testApp();
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
    await rm(dataDir, { recursive: true, force: true });
  });

  it("exports a real PDF", async () => {
    const { app, dataDir } = await testApp();
    const sample = await app.inject({ method: "GET", url: "/api/sample" });
    const response = await app.inject({
      method: "POST",
      url: "/api/export/pdf",
      payload: { layout: sample.json().layout }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.rawPayload.subarray(0, 4).toString()).toBe("%PDF");
    await rm(dataDir, { recursive: true, force: true });
  });

  it("returns structured validation errors", async () => {
    const { app, dataDir } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/layouts/generate",
      payload: { prompt: "" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBeTruthy();
    await rm(dataDir, { recursive: true, force: true });
  });

  it("creates, lists, reads, updates, and deletes documents", async () => {
    const { app, dataDir } = await testApp();
    const created = await app.inject({
      method: "POST",
      url: "/api/documents",
      payload: { layout: sampleLayout }
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().document.id;

    const list = await app.inject({ method: "GET", url: "/api/documents" });
    expect(list.json().documents).toHaveLength(1);

    const read = await app.inject({ method: "GET", url: `/api/documents/${id}` });
    expect(read.json().document.title).toBe(sampleLayout.title);

    const updatedLayout = { ...sampleLayout, title: "Updated Document" };
    const updated = await app.inject({
      method: "PUT",
      url: `/api/documents/${id}`,
      payload: { layout: updatedLayout }
    });
    expect(updated.json().document.title).toBe("Updated Document");

    const deleted = await app.inject({ method: "DELETE", url: `/api/documents/${id}` });
    expect(deleted.statusCode).toBe(204);
    await rm(dataDir, { recursive: true, force: true });
  });
});
