import "reflect-metadata";

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import mercurius from "mercurius";
import { buildSchemaSync } from "type-graphql";

import { getEnvConfig } from "./config/env.js";
import { checkDatabaseConnection, connectMongo, disconnectMongo } from "./db/connection.js";
import { AUTH_SESSION_COOKIE } from "./modules/auth/auth.constants.js";
import { AuthResolver, resolveSessionUserFromCookie } from "./modules/auth/resolvers/auth.resolver.js";
import { AttendeeResolver } from "./modules/attendees/resolvers/attendee.resolver.js";
import { EventResolver } from "./modules/events/resolvers/event.resolver.js";
import { registerUploadRoutes } from "./modules/uploads/routes/upload.routes.js";
import type Context from "./types/context.type.js";

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
    credentials: true,
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

  void app.register(cookie);

  void app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1
    }
  });

  void registerUploadRoutes(app);

  const gqlSchema = buildSchemaSync({
    resolvers: [AuthResolver, EventResolver, AttendeeResolver],
    validate: false
  });

  void app.register(mercurius as any, {
    schema: gqlSchema,
    graphiql: env.nodeEnv !== "production",
    path: "/graphql",
    context: async (request: FastifyRequest, reply: FastifyReply): Promise<Context> => {
      const token = request.cookies[AUTH_SESSION_COOKIE];
      const sessionUser = await resolveSessionUserFromCookie(token);
      return {
        request,
        reply,
        appReply: reply,
        sessionUser
      };
    }
  });

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
