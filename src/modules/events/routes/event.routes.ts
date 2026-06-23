import type { FastifyInstance } from "fastify";

import type { CreateEventInput, UpdateEventInput } from "../inputs/event.inputs.js";
import { EventNotFoundError, EventService } from "../services/event.service.js";
import { validateCreateInput, validateEventId, validateUpdateInput } from "../validation/event.validation.js";

const eventService = new EventService();

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/events", async (request, reply) => {
    const validation = validateCreateInput(request.body as CreateEventInput);
    if (!validation.ok) {
      return reply.code(400).send({ error: validation.message });
    }

    try {
      const data = await eventService.create(validation.data);
      return reply.code(201).send({ data });
    } catch (error) {
      request.log.error({ err: error }, "Failed to create event");
      return reply.code(500).send({ error: "Failed to create event" });
    }
  });

  app.get("/api/events", async (request, reply) => {
    try {
      const data = await eventService.list();
      return reply.send({ data });
    } catch (error) {
      request.log.error({ err: error }, "Failed to list events");
      return reply.code(500).send({ error: "Failed to list events" });
    }
  });

  app.get("/api/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      return reply.code(400).send({ error: idValidation.message });
    }

    try {
      const data = await eventService.getById(id);
      return reply.send({ data });
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        return reply.code(404).send({ error: "Event not found" });
      }
      request.log.error({ err: error }, "Failed to get event");
      return reply.code(500).send({ error: "Failed to get event" });
    }
  });

  app.put("/api/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      return reply.code(400).send({ error: idValidation.message });
    }

    const validation = validateUpdateInput(request.body as UpdateEventInput);
    if (!validation.ok) {
      return reply.code(400).send({ error: validation.message });
    }

    try {
      const data = await eventService.update(id, validation.data);
      return reply.send({ data });
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        return reply.code(404).send({ error: "Event not found" });
      }
      request.log.error({ err: error }, "Failed to update event");
      return reply.code(500).send({ error: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      return reply.code(400).send({ error: idValidation.message });
    }

    try {
      await eventService.delete(id);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        return reply.code(404).send({ error: "Event not found" });
      }
      request.log.error({ err: error }, "Failed to delete event");
      return reply.code(500).send({ error: "Failed to delete event" });
    }
  });
}
