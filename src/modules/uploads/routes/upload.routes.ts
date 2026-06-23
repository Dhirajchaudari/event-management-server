import type { FastifyInstance } from "fastify";

import { AUTH_SESSION_COOKIE } from "../../auth/auth.constants.js";
import { resolveSessionUserFromCookie } from "../../auth/resolvers/auth.resolver.js";
import {
  getMaxSpeakerImageBytes,
  isAllowedSpeakerImage,
  uploadSpeakerPhoto
} from "../../../utils/cloudinary.util.js";

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/uploads/speaker-photo", async (request, reply) => {
    const sessionUser = await resolveSessionUserFromCookie(request.cookies[AUTH_SESSION_COOKIE]);
    if (!sessionUser) {
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "FILE_REQUIRED" });
    }

    if (!isAllowedSpeakerImage(file.mimetype)) {
      return reply.code(400).send({ error: "INVALID_IMAGE_TYPE" });
    }

    const buffer = await file.toBuffer();
    if (buffer.length > getMaxSpeakerImageBytes()) {
      return reply.code(400).send({ error: "IMAGE_TOO_LARGE" });
    }

    try {
      const uploaded = await uploadSpeakerPhoto(buffer, file.filename);
      return reply.send({
        url: uploaded.url,
        publicId: uploaded.publicId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
      if (message === "CLOUDINARY_NOT_CONFIGURED") {
        return reply.code(503).send({ error: message });
      }
      request.log.error({ err: error }, "Speaker photo upload failed");
      return reply.code(500).send({ error: "UPLOAD_FAILED" });
    }
  });
}
