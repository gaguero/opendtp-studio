import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { layoutDocumentSchema, runPreflight, sampleLayout } from "@opendtp/dtp-core";
import { applyLayoutInstruction, createAiRunRecord, editTextWithAi, promptToLayout } from "./ai.js";
import type { AppConfig } from "./config.js";
import { AssetStore } from "./assets.js";
import { DocumentStore } from "./documents.js";
import { ExportJobStore } from "./export-jobs.js";
import { renderPdf } from "./pdf.js";

const promptRequestSchema = z.object({ prompt: z.string().min(1).max(8000) });
const grammarRequestSchema = z.object({
  text: z.string().min(1).max(20000),
  instruction: z.string().min(1).max(1000)
});
const layoutEditRequestSchema = z.object({
  layout: layoutDocumentSchema,
  instruction: z.string().min(1).max(1000)
});

export function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });
  const documents = new DocumentStore(config.dataDir);
  const assets = new AssetStore(config.dataDir);
  const exportJobs = new ExportJobStore(config.dataDir);

  app.register(helmet, {
    contentSecurityPolicy: false
  });
  app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute"
  });
  app.register(cors, { origin: true });
  app.register(multipart, {
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 1
    }
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const candidate = error as { statusCode?: number; message?: string };
    const statusCode = candidate.statusCode && candidate.statusCode >= 400 ? candidate.statusCode : 500;
    return reply.code(statusCode).send({
      error: {
        message: statusCode >= 500 ? "Unexpected server error" : candidate.message ?? "Request failed",
        requestId: request.id
      }
    });
  });

  app.get("/api/health", async () => ({
    ok: true,
    version: "1.0.0",
    ai: Boolean(config.openAiApiKey),
    renderer: "pdfkit-live"
  }));

  app.get("/api/sample", async () => ({ layout: sampleLayout, preflight: runPreflight(sampleLayout) }));

  app.get("/api/documents", async () => ({ documents: await documents.list() }));

  app.get("/api/assets", async () => ({ assets: await assets.list() }));

  app.post("/api/assets/images", async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: { message: "Image file is required", requestId: request.id } });
    if (!file.mimetype.startsWith("image/")) return reply.code(400).send({ error: { message: "Only image uploads are supported", requestId: request.id } });
    const bytes = await file.toBuffer();
    const asset = await assets.createImage({ filename: file.filename, mimeType: file.mimetype, bytes });
    return reply.code(201).send({ asset, url: `/api/assets/${asset.storageKey}` });
  });

  app.get("/api/assets/:storageKey", async (request, reply) => {
    const params = z.object({ storageKey: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    const blob = await assets.readBlob(params.data.storageKey);
    return reply.send(blob);
  });

  app.post("/api/documents", async (request, reply) => {
    const body = z.object({ layout: layoutDocumentSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const document = await documents.create(body.data.layout);
    return reply.code(201).send({ document, preflight: runPreflight(document.layout) });
  });

  app.get("/api/documents/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    try {
      const document = await documents.read(params.data.id);
      return { document, preflight: runPreflight(document.layout) };
    } catch {
      return reply.code(404).send({ error: { message: "Document not found", requestId: request.id } });
    }
  });

  app.put("/api/documents/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = z.object({ layout: layoutDocumentSchema }).safeParse(request.body);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    try {
      const document = await documents.update(params.data.id, body.data.layout);
      return { document, preflight: runPreflight(document.layout) };
    } catch {
      return reply.code(404).send({ error: { message: "Document not found", requestId: request.id } });
    }
  });

  app.delete("/api/documents/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    await documents.delete(params.data.id);
    return reply.code(204).send();
  });

  app.post("/api/layouts/generate", async (request, reply) => {
    const body = promptRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const started = Date.now();
    const result = await promptToLayout(body.data.prompt, { apiKey: config.openAiApiKey, model: config.openAiModel });
    const run = createAiRunRecord("layout.generate", result.provider, config.openAiModel, body.data, result.layout, Date.now() - started, true);
    return { ...result, preflight: runPreflight(result.layout), run };
  });

  app.post("/api/layouts/edit", async (request, reply) => {
    const body = layoutEditRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const started = Date.now();
    const result = applyLayoutInstruction(body.data.layout, body.data.instruction);
    const run = createAiRunRecord("layout.patch", result.provider, "local-patch-engine", body.data, result.patches, Date.now() - started, true);
    return { ...result, preflight: runPreflight(result.layout), run };
  });

  app.post("/api/text/edit", async (request, reply) => {
    const body = grammarRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const started = Date.now();
    const result = await editTextWithAi(body.data.text, body.data.instruction, { apiKey: config.openAiApiKey, model: config.openAiModel });
    const run = createAiRunRecord("story.edit", result.provider, config.openAiModel, body.data, result.edit, Date.now() - started, true);
    return { ...result, run };
  });

  app.post("/api/export/pdf", async (request, reply) => {
    const body = z.object({ layout: layoutDocumentSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const pdf = await renderPdf(body.data.layout);
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${safeFilename(body.data.layout.title)}.pdf"`)
      .send(pdf);
  });

  app.post("/api/export/jobs", async (request, reply) => {
    const body = z.object({ layout: layoutDocumentSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const pdf = await renderPdf(body.data.layout);
    const job = await exportJobs.createCompleted(body.data.layout.title, pdf);
    return reply.code(201).send({ job, downloadUrl: `/api/export/jobs/${job.id}/pdf` });
  });

  app.get("/api/export/jobs/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    const job = await exportJobs.read(params.data.id);
    return { job, downloadUrl: job.artifactKey ? `/api/export/jobs/${job.id}/pdf` : null };
  });

  app.get("/api/export/jobs/:id/pdf", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: params.error.flatten() });
    const job = await exportJobs.read(params.data.id);
    if (!job.artifactKey) return reply.code(404).send({ error: { message: "Export artifact not found", requestId: request.id } });
    const pdf = await exportJobs.readArtifact(job.artifactKey);
    return reply.header("Content-Type", "application/pdf").send(pdf);
  });

  const webDist = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../web/dist");
  const staticRoot = config.webDistPath || webDist;
  if (existsSync(staticRoot)) {
    app.register(fastifyStatic, {
      root: staticRoot,
      prefix: "/"
    });
  }

  app.setNotFoundHandler(async (_request, reply) => {
    if (existsSync(staticRoot)) return reply.sendFile("index.html");
    return reply.code(404).send({ error: "Not found" });
  });

  return app;
}

function safeFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "opendtp-document";
}
