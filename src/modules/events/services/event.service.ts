import type { DocumentType } from "@typegoose/typegoose";

import { EventType } from "../inputs/event.inputs.js";
import type { Event } from "../model/event.model.js";
import { EventModel } from "../model/event.model.js";
import type { ValidatedCreateEventInput, ValidatedUpdateEventInput } from "../validation/event.validation.js";

export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found");
    this.name = "EventNotFoundError";
  }
}

export class EventService {
  public toEventType(doc: DocumentType<Event>): EventType {
    return {
      id: doc._id.toString(),
      name: doc.name,
      date: doc.date.toISOString(),
      speakerName: doc.speakerName,
      speakerDesignation: doc.speakerDesignation,
      createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString()
    };
  }

  public async create(input: ValidatedCreateEventInput): Promise<EventType> {
    const event = await EventModel.create({
      name: input.name,
      date: new Date(input.date),
      speakerName: input.speakerName,
      speakerDesignation: input.speakerDesignation
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
    const update: Partial<Event> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.speakerName !== undefined) update.speakerName = input.speakerName;
    if (input.speakerDesignation !== undefined) update.speakerDesignation = input.speakerDesignation;
    if (input.date !== undefined) update.date = new Date(input.date);

    const event = await EventModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true
    }).exec();

    if (!event) {
      throw new EventNotFoundError();
    }
    return this.toEventType(event);
  }

  public async delete(id: string): Promise<boolean> {
    const event = await EventModel.findByIdAndDelete(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }
    return true;
  }
}
