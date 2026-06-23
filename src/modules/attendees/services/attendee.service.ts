import type { DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";

import { EventModel } from "../../events/model/event.model.js";
import { EventNotFoundError } from "../../events/services/event.service.js";
import type { Attendee } from "../model/attendee.model.js";
import { AttendeeModel } from "../model/attendee.model.js";
import type { AttendeeType } from "../schema/attendee.schema.js";
import {
  validateAttendeeId,
  validateRsvpInput,
  type ValidatedRsvpInput
} from "../validation/attendee.validation.js";

export class AttendeeNotFoundError extends Error {
  constructor() {
    super("Attendee not found");
    this.name = "AttendeeNotFoundError";
  }
}

export class DuplicateRsvpError extends Error {
  constructor() {
    super("This email has already RSVP'd to this event");
    this.name = "DuplicateRsvpError";
  }
}

export class AttendeeService {
  public toAttendeeType(doc: DocumentType<Attendee>): AttendeeType {
    return {
      id: doc._id.toString(),
      eventId: doc.eventId.toString(),
      name: doc.name,
      email: doc.email,
      specialty: doc.specialty,
      rsvpAt: doc.rsvpAt.toISOString()
    };
  }

  public async countForEvent(eventId: string): Promise<number> {
    return AttendeeModel.countDocuments({ eventId: new Types.ObjectId(eventId) }).exec();
  }

  public async countByEventIds(eventIds: string[]): Promise<Map<string, number>> {
    if (eventIds.length === 0) {
      return new Map();
    }

    const objectIds = eventIds.map((id) => new Types.ObjectId(id));
    const rows = await AttendeeModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { eventId: { $in: objectIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } }
    ]).exec();

    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  public async syncEventAttendeeCount(eventId: string): Promise<number> {
    const count = await this.countForEvent(eventId);
    await EventModel.findByIdAndUpdate(eventId, { attendeeCount: count }).exec();
    return count;
  }

  public async listForEvent(eventId: string): Promise<AttendeeType[]> {
    const attendees = await AttendeeModel.find({ eventId: new Types.ObjectId(eventId) })
      .sort({ rsvpAt: -1 })
      .exec();
    return attendees.map((attendee) => this.toAttendeeType(attendee));
  }

  public async rsvpFromInput(
    eventId: string,
    name: string,
    email: string,
    specialty?: string | null
  ): Promise<AttendeeType> {
    const validation = validateRsvpInput({ eventId, name, email, specialty });
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    return this.rsvp(validation.data);
  }

  public async cancelById(attendeeId: string): Promise<boolean> {
    const idValidation = validateAttendeeId(attendeeId);
    if (!idValidation.ok) {
      throw new Error(idValidation.message);
    }

    const attendee = await AttendeeModel.findByIdAndDelete(attendeeId).exec();
    if (!attendee) {
      throw new AttendeeNotFoundError();
    }

    await this.syncEventAttendeeCount(attendee.eventId.toString());
    return true;
  }

  public async deleteForEvent(eventId: string): Promise<void> {
    await AttendeeModel.deleteMany({ eventId: new Types.ObjectId(eventId) }).exec();
  }

  private async rsvp(input: ValidatedRsvpInput): Promise<AttendeeType> {
    const event = await EventModel.findById(input.eventId).exec();
    if (!event) {
      throw new EventNotFoundError();
    }

    const existing = await AttendeeModel.findOne({
      eventId: new Types.ObjectId(input.eventId),
      email: input.email
    }).exec();

    if (existing) {
      throw new DuplicateRsvpError();
    }

    try {
      const attendee = await AttendeeModel.create({
        eventId: new Types.ObjectId(input.eventId),
        name: input.name,
        email: input.email,
        specialty: input.specialty,
        rsvpAt: new Date()
      });

      await this.syncEventAttendeeCount(input.eventId);
      return this.toAttendeeType(attendee);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === 11000) {
        throw new DuplicateRsvpError();
      }
      throw error;
    }
  }
}
