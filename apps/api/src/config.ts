import { fileURLToPath } from "node:url";

export type AppConfig = {
  port: number;
  host: string;
  openAiApiKey?: string;
  openAiModel: string;
  webDistPath: string;
  dataDir: string;
};

export function readConfig(env = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? "0.0.0.0",
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_MODEL ?? "gpt-4o-mini",
    webDistPath: env.WEB_DIST_PATH ?? fileURLToPath(new URL("../../web/dist", import.meta.url)),
    dataDir: env.DATA_DIR ?? fileURLToPath(new URL("../../../data", import.meta.url))
  };
}
