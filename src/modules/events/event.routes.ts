import type { FastifyInstance } from "fastify";
import { isValidObjectId } from "mongoose";

import { EventModel } from "./event.model.js";
import {
  toEventResponse,
  validateCreateInput,
  validateUpdateInput
} from "./event.validation.js";

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/events", async (request, reply) => {
    const validation = validateCreateInput(request.body);
    if (!validation.ok) {
      return reply.code(400).send({ error: validation.message });
    }

    try {
      const event = await EventModel.create({
        name: validation.data.name,
        date: new Date(validation.data.date),
        speakerName: validation.data.speakerName,
        speakerDesignation: validation.data.speakerDesignation
      });
      return reply.code(201).send({ data: toEventResponse(event) });
    } catch (error) {
      request.log.error({ err: error }, "Failed to create event");
      return reply.code(500).send({ error: "Failed to create event" });
    }
  });

  app.get("/api/events", async (_request, reply) => {
    try {
      const events = await EventModel.find().sort({ date: 1 }).exec();
      return reply.send({ data: events.map(toEventResponse) });
    } catch (error) {
      _request.log.error({ err: error }, "Failed to list events");
      return reply.code(500).send({ error: "Failed to list events" });
    }
  });

  app.get("/api/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid event id" });
    }

    try {
      const event = await EventModel.findById(id).exec();
      if (!event) {
        return reply.code(404).send({ error: "Event not found" });
      }
      return reply.send({ data: toEventResponse(event) });
    } catch (error) {
      request.log.error({ err: error }, "Failed to get event");
      return reply.code(500).send({ error: "Failed to get event" });
    }
  });

  app.put("/api/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid event id" });
    }

    const validation = validateUpdateInput(request.body);
    if (!validation.ok) {
      return reply.code(400).send({ error: validation.message });
    }

    const update: Record<string, unknown> = { ...validation.data };
    if (validation.data.date) {
      update.date = new Date(validation.data.date);
    }

    try {
      const event = await EventModel.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true
      }).exec();

      if (!event) {
        return reply.code(404).send({ error: "Event not found" });
      }
      return reply.send({ data: toEventResponse(event) });
    } catch (error) {
      request.log.error({ err: error }, "Failed to update event");
      return reply.code(500).send({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!isValidObjectId(id)) {
      return reply.code(400).send({ error: "Invalid event id" });
    }

    try {
      const event = await EventModel.findByIdAndDelete(id).exec();
      if (!event) {
        return reply.code(404).send({ error: "Event not found" });
      }
      return reply.code(204).send();
    } catch (error) {
      request.log.error({ err: error }, "Failed to delete event");
      return reply.code(500).send({ error: "Failed to delete event" });
    }
  });
}
