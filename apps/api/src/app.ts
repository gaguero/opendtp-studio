import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { z } from "zod";
import { layoutDocumentSchema, sampleLayout } from "@opendtp/dtp-core";
import { applyLayoutInstruction, editTextWithAi, promptToLayout } from "./ai.js";
import type { AppConfig } from "./config.js";

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

  app.register(cors, { origin: true });

  app.get("/api/health", async () => ({
    ok: true,
    version: "1.0.0",
    ai: Boolean(config.openAiApiKey),
    renderer: "css-paged-media-playwright-ready"
  }));

  app.get("/api/sample", async () => ({ layout: sampleLayout }));

  app.post("/api/layouts/generate", async (request, reply) => {
    const body = promptRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    return promptToLayout(body.data.prompt, { apiKey: config.openAiApiKey, model: config.openAiModel });
  });

  app.post("/api/layouts/edit", async (request, reply) => {
    const body = layoutEditRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    return { layout: applyLayoutInstruction(body.data.layout, body.data.instruction), provider: "local-layout-transform" };
  });

  app.post("/api/text/edit", async (request, reply) => {
    const body = grammarRequestSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    return editTextWithAi(body.data.text, body.data.instruction, { apiKey: config.openAiApiKey, model: config.openAiModel });
  });

  app.post("/api/export/pdf", async (request, reply) => {
    const body = z.object({ layout: layoutDocumentSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    return reply.code(202).send({
      status: "queued",
      renderer: "playwright-vivliostyle-worker-planned",
      message: "MVP validates the layout and prepares the export handoff. Production PDF/X export belongs in a worker service."
    });
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
