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
    expect(json.run.valid).toBe(true);
    await rm(dataDir, { recursive: true, force: true });
  });

  it("edits layouts through typed patches", async () => {
    const { app, dataDir } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/layouts/edit",
      payload: { layout: sampleLayout, instruction: "Make body copy 3 columns and add bleed" }
    });
    const json = response.json();
    expect(response.statusCode).toBe(200);
    expect(json.patches.length).toBeGreaterThan(0);
    expect(json.layout.pageSize.bleedMm).toBe(3);
    expect(json.run.task).toBe("layout.patch");
    await rm(dataDir, { recursive: true, force: true });
  });

  it("edits story text with metadata", async () => {
    const { app, dataDir } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/text/edit",
      payload: { text: "ai copy should be shorter and polished for print", instruction: "shorten" }
    });
    const json = response.json();
    expect(response.statusCode).toBe(200);
    expect(json.edit.originalTextHash).toHaveLength(64);
    expect(json.run.task).toBe("story.edit");
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

  it("creates completed export jobs with downloadable artifacts", async () => {
    const { app, dataDir } = await testApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/export/jobs",
      payload: { layout: sampleLayout }
    });
    expect(response.statusCode).toBe(201);
    const { job, downloadUrl } = response.json();
    expect(job.status).toBe("completed");
    const pdf = await app.inject({ method: "GET", url: downloadUrl });
    expect(pdf.rawPayload.subarray(0, 4).toString()).toBe("%PDF");
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

  it("uploads image assets with metadata", async () => {
    const { app, dataDir } = await testApp();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lP0sNwAAAABJRU5ErkJggg==",
      "base64"
    );
    const response = await app.inject({
      method: "POST",
      url: "/api/assets/images",
      headers: {
        "content-type": "multipart/form-data; boundary=----opendtp"
      },
      payload: Buffer.concat([
        Buffer.from("------opendtp\r\nContent-Disposition: form-data; name=\"file\"; filename=\"pixel.png\"\r\nContent-Type: image/png\r\n\r\n"),
        png,
        Buffer.from("\r\n------opendtp--\r\n")
      ])
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().asset.metadata.width).toBe(1);
    const list = await app.inject({ method: "GET", url: "/api/assets" });
    expect(list.json().assets).toHaveLength(1);
    await rm(dataDir, { recursive: true, force: true });
  });
});
