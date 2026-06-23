import type { DocumentType } from "@typegoose/typegoose";

import type { CreateEventInput, EventContent, EventType, UpdateEventInput } from "../schema/event.schema.js";
import type { EventStatus } from "../interfaces/event.types.js";
import { EVENT_STATUSES } from "../interfaces/event.types.js";
import type { Event } from "../model/event.model.js";
import { EventModel } from "../model/event.model.js";
import {
  EventAiGenerationError,
  generateEventContentWithGemini
} from "./event-ai.service.js";
import { getEnvConfig } from "../../../config/env.js";
import {
  validateCreateInput,
  validateEventId,
  validateEventStatus,
  validateUpdateInput,
  type ValidatedCreateEventInput,
  type ValidatedUpdateEventInput
} from "../validation/event.validation.js";
import {
  assertValidStatusTransition
} from "../validation/status-transition.js";

export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found");
    this.name = "EventNotFoundError";
  }
}

export class EventService {
  public async createFromInput(input: CreateEventInput): Promise<EventType> {
    const validation = validateCreateInput(input);
    if (!validation.ok) {
      throw new Error(validation.message);
    }
    return this.create(validation.data);
  }

  public async findById(id: string): Promise<EventType | null> {
    this.assertValidEventId(id);

    try {
      return await this.getById(id);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  public async updateFromInput(id: string, input: UpdateEventInput): Promise<EventType> {
    this.assertValidEventId(id);

    const validation = validateUpdateInput(input);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    try {
      return await this.update(id, validation.data);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  public async deleteById(id: string): Promise<boolean> {
    this.assertValidEventId(id);

    try {
      return await this.delete(id);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  public async updateStatusFromInput(eventId: string, status: EventStatus): Promise<EventType> {
    this.assertValidEventId(eventId);

    const statusValidation = validateEventStatus(status);
    if (!statusValidation.ok) {
      throw new Error(statusValidation.message);
    }

    try {
      return await this.updateStatus(eventId, statusValidation.status);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  public toEventType(doc: DocumentType<Event>): EventType {
    const status = EVENT_STATUSES.includes(doc.status as EventStatus) ? doc.status : "draft";

    return {
      id: doc._id.toString(),
      name: doc.name,
      date: doc.date.toISOString(),
      speakerName: doc.speakerName,
      speakerDesignation: doc.speakerDesignation,
      speakerPhotoUrl: doc.speakerPhotoUrl,
      status,
      attendeeCount: doc.attendeeCount ?? 0,
      aiDescription: doc.aiDescription,
      aiSpeakerIntro: doc.aiSpeakerIntro,
      aiGeneratedAt: doc.aiGeneratedAt?.toISOString(),
      createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString()
    };
  }

  public async create(input: ValidatedCreateEventInput): Promise<EventType> {
    const event = await EventModel.create({
      name: input.name,
      date: new Date(input.date),
      speakerName: input.speakerName,
      speakerDesignation: input.speakerDesignation,
      speakerPhotoUrl: input.speakerPhotoUrl,
      status: "draft",
      attendeeCount: input.attendeeCount ?? 0
    });
    return this.toEventType(event);
  }

  public async list(): Promise<EventType[]> {
    const events = await EventModel.find().sort({ date: 1 }).exec();
    return events.map((event) => this.toEventType(event));
  }

  public async getById(id: string): Promise<EventType> {
    const event = await EventModel.findById(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }
    return this.toEventType(event);
  }

  public async update(id: string, input: ValidatedUpdateEventInput): Promise<EventType> {
    const setUpdate: Partial<Event> = {};
    const fieldsToUnset: string[] = [];

    if (input.name !== undefined) setUpdate.name = input.name;
    if (input.speakerName !== undefined) setUpdate.speakerName = input.speakerName;
    if (input.speakerDesignation !== undefined) setUpdate.speakerDesignation = input.speakerDesignation;
    if (input.date !== undefined) setUpdate.date = new Date(input.date);
    if (input.attendeeCount !== undefined) setUpdate.attendeeCount = input.attendeeCount;

    if ("speakerPhotoUrl" in input) {
      if (input.speakerPhotoUrl === undefined) {
        fieldsToUnset.push("speakerPhotoUrl");
      } else {
        setUpdate.speakerPhotoUrl = input.speakerPhotoUrl;
      }
    }

    if ("aiDescription" in input) {
      if (!input.aiDescription) {
        fieldsToUnset.push("aiDescription");
      } else {
        setUpdate.aiDescription = input.aiDescription;
      }
    }

    if ("aiSpeakerIntro" in input) {
      if (!input.aiSpeakerIntro) {
        fieldsToUnset.push("aiSpeakerIntro");
      } else {
        setUpdate.aiSpeakerIntro = input.aiSpeakerIntro;
      }
    }

    const mongoUpdate: Record<string, unknown> = { ...setUpdate };
    if (fieldsToUnset.length > 0) {
      mongoUpdate.$unset = Object.fromEntries(fieldsToUnset.map((field) => [field, 1]));
    }

    const event = await EventModel.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true
    }).exec();

    if (!event) {
      throw new EventNotFoundError();
    }
    return this.toEventType(event);
  }

  public async updateStatus(id: string, status: EventStatus): Promise<EventType> {
    const event = await EventModel.findById(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }

    assertValidStatusTransition(event.status, status);

    event.status = status;
    await event.save();

    return this.toEventType(event);
  }

  public async generateEventContent(eventId: string): Promise<EventContent> {
    this.assertValidEventId(eventId);

    const event = await EventModel.findById(eventId).exec();
    if (!event) {
      throw new EventNotFoundError();
    }

    const { geminiApiKey } = getEnvConfig();

    try {
      const generated = await generateEventContentWithGemini(geminiApiKey ?? "", {
        name: event.name,
        date: event.date.toISOString(),
        speakerName: event.speakerName,
        speakerDesignation: event.speakerDesignation
      });

      event.aiDescription = generated.eventDescription;
      event.aiSpeakerIntro = generated.speakerIntro;
      event.aiGeneratedAt = new Date();
      await event.save();

      return {
        eventDescription: generated.eventDescription,
        speakerIntro: generated.speakerIntro
      };
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      if (error instanceof EventAiGenerationError) {
        throw error;
      }
      throw new EventAiGenerationError("Failed to generate event content");
    }
  }

  public async delete(id: string): Promise<boolean> {
    const event = await EventModel.findByIdAndDelete(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }
    return true;
  }

  private assertValidEventId(id: string): void {
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      throw new Error(idValidation.message);
    }
  }
}
