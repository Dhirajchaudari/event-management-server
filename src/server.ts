import { buildApp } from "./app.js";
import { getEnvConfig } from "./config/env.js";

const app = buildApp();
const env = getEnvConfig();
const port = env.port;
const host = env.host;

async function start(): Promise<void> {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down server");
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

void start();
