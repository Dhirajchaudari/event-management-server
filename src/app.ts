import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";

import { getEnvConfig } from "./config/env.js";
import { checkDatabaseConnection, connectMongo, disconnectMongo } from "./db/connection.js";
import { registerEventRoutes } from "./modules/events/event.routes.js";

export function buildApp(): FastifyInstance {
  const env = getEnvConfig();
  const app = Fastify({
    logger: true
  });

  app.get("/health", async (_request, reply) => {
    const base = {
      service: "event-management-server",
      timestamp: new Date().toISOString()
    };

    if (env.nodeEnv === "test") {
      return { status: "ok", db: "skipped", ...base };
    }

    try {
      await checkDatabaseConnection();
      return { status: "ok", db: "ok", ...base };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database unreachable";
      app.log.error({ err: error }, "Health check database probe failed");
      return reply.code(503).send({
        status: "degraded",
        db: "error",
        message,
        ...base
      });
    }
  });

  void app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS_ORIGIN_NOT_ALLOWED"), false);
    }
  });

  void app.register(registerEventRoutes);

  if (env.nodeEnv !== "test") {
    app.addHook("onReady", async () => {
      try {
        await connectMongo();
        app.log.info("MongoDB connection verified");
      } catch (error) {
        app.log.error({ err: error }, "MongoDB connection failed at startup");
        throw error;
      }
    });

    app.addHook("onClose", async () => {
      await disconnectMongo();
    });
  }

  return app;
}
