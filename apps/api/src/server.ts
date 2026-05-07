import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const app = buildApp(config);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
