import type { DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";

import { AttendeeModel } from "../../attendees/model/attendee.model.js";

import type { CreateEventInput, EventContent, EventType, PublicEventSitemapEntry, UpdateEventInput } from "../schema/event.schema.js";
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
import type { SessionUser } from "../../auth/interfaces/auth.types.js";
import { isAdminRole, isOrganizerRole, normalizeUserRole } from "../../auth/interfaces/auth.types.js";
import {
  buildCollisionSlug,
  buildEventSlug,
  stripLegacyIdSlugSuffix
} from "../utils/event-slug.util.js";
import { PUBLIC_EVENT_STATUSES } from "../interfaces/event.types.js";
import {
  assertAdminApprovalTransition,
  assertValidStatusTransition
} from "../validation/status-transition.js";

export class EventNotFoundError extends Error {
  constructor() {
    super("Event not found");
    this.name = "EventNotFoundError";
  }
}

export class EventNotPublishedError extends Error {
  public readonly status: EventStatus;

  constructor(status: EventStatus) {
    super("Event is not publicly available");
    this.name = "EventNotPublishedError";
    this.status = status;
  }
}

export class EventService {
  public async createFromInput(
    input: CreateEventInput,
    sessionUser?: SessionUser | null
  ): Promise<EventType> {
    const validation = validateCreateInput(input);
    if (!validation.ok) {
      throw new Error(validation.message);
    }
    return this.create(validation.data, sessionUser);
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

  public async updateFromInput(
    id: string,
    input: UpdateEventInput,
    sessionUser?: SessionUser | null
  ): Promise<EventType> {
    this.assertValidEventId(id);

    const validation = validateUpdateInput(input);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    try {
      return await this.update(id, validation.data, sessionUser);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  public async deleteById(id: string, sessionUser?: SessionUser | null): Promise<boolean> {
    this.assertValidEventId(id);

    try {
      return await this.delete(id, sessionUser);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  public async updateStatusFromInput(
    eventId: string,
    status: EventStatus,
    sessionUser?: SessionUser | null
  ): Promise<EventType> {
    this.assertValidEventId(eventId);

    const statusValidation = validateEventStatus(status);
    if (!statusValidation.ok) {
      throw new Error(statusValidation.message);
    }

    try {
      return await this.updateStatus(eventId, statusValidation.status, {
        isAdmin: sessionUser ? isAdminRole(sessionUser.role) : false
      });
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  public async findBySlug(slug: string): Promise<EventType | null> {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    let event = await EventModel.findOne({ slug: normalized }).exec();

    if (!event && Types.ObjectId.isValid(normalized)) {
      event = await EventModel.findById(normalized).exec();
    }

    if (!event) {
      await this.backfillAllEventSlugs();
      event = await EventModel.findOne({ slug: normalized }).exec();

      if (!event) {
        const legacyBase = stripLegacyIdSlugSuffix(normalized);
        if (legacyBase) {
          event = await EventModel.findOne({ slug: legacyBase }).exec();
        }
      }

      if (!event && Types.ObjectId.isValid(normalized)) {
        event = await EventModel.findById(normalized).exec();
      }
    }

    if (!event) {
      return null;
    }

    await this.ensureSlug(event);
    return this.toEventType(event);
  }

  public async findPublicBySlug(slug: string): Promise<EventType | null> {
    const event = await this.findBySlug(slug);
    if (!event) {
      return null;
    }

    if (!PUBLIC_EVENT_STATUSES.includes(event.status)) {
      throw new EventNotPublishedError(event.status);
    }

    return event;
  }

  public async lookupPublicBySlug(slug: string): Promise<{
    code: "OK" | "NOT_FOUND" | "NOT_PUBLISHED" | "PENDING_APPROVAL";
    event?: EventType;
    status?: EventStatus;
  }> {
    const event = await this.findBySlug(slug);
    if (!event) {
      return { code: "NOT_FOUND" };
    }

    if (event.status === "pending_approval") {
      return { code: "PENDING_APPROVAL", status: event.status };
    }

    if (!PUBLIC_EVENT_STATUSES.includes(event.status)) {
      return { code: "NOT_PUBLISHED", status: event.status };
    }

    return { code: "OK", event };
  }

  public async backfillAllEventSlugs(): Promise<number> {
    const events = await EventModel.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }]
    }).exec();

    let updated = 0;
    for (const event of events) {
      await this.ensureSlug(event);
      updated += 1;
    }

    return updated;
  }

  public async normalizeAllEventSlugs(): Promise<number> {
    const events = await EventModel.find().sort({ createdAt: 1 }).exec();

    let updated = 0;
    for (const event of events) {
      const nextSlug = await this.generateUniqueSlug(event.name, event._id.toString());
      if (event.slug !== nextSlug) {
        event.slug = nextSlug;
        await event.save();
        updated += 1;
      }
    }

    return updated;
  }

  public async submitForApproval(eventId: string, sessionUser: SessionUser): Promise<EventType> {
    this.assertValidEventId(eventId);

    const event = await EventModel.findById(eventId).exec();
    if (!event) {
      throw new EventNotFoundError();
    }

    if (!isOrganizerRole(sessionUser.role)) {
      throw new Error("FORBIDDEN");
    }

    if (event.organizerId?.toString() !== sessionUser.id) {
      throw new Error("FORBIDDEN");
    }

    if (event.status !== "draft") {
      throw new Error("Only draft events can be submitted for approval");
    }

    event.status = "pending_approval";
    await event.save();
    await this.ensureSlug(event);

    return this.toEventType(event);
  }

  public async listForSessionUser(sessionUser: SessionUser): Promise<EventType[]> {
    const role = normalizeUserRole(sessionUser.role);

    if (role === "admin") {
      return this.list();
    }

    if (role === "organizer") {
      const events = await EventModel.find({ organizerId: new Types.ObjectId(sessionUser.id) })
        .sort({ date: 1 })
        .exec();
      return Promise.all(events.map((event) => this.ensureSlug(event).then(() => this.toEventType(event))));
    }

    return [];
  }

  public async listPublicSitemapEntries(): Promise<PublicEventSitemapEntry[]> {
    const events = await EventModel.find({ status: { $in: PUBLIC_EVENT_STATUSES } })
      .sort({ updatedAt: -1 })
      .exec();

    const entries: PublicEventSitemapEntry[] = [];
    for (const event of events) {
      await this.ensureSlug(event);
      entries.push({
        slug: event.slug ?? buildEventSlug(event.name),
        name: event.name,
        updatedAt: event.updatedAt?.toISOString() ?? new Date().toISOString()
      });
    }
    return entries;
  }

  public async approveEvent(eventId: string): Promise<EventType> {
    const result = await this.setApprovalStatus(eventId, "published");
    await this.ensureSlugOnId(eventId);
    return result;
  }

  public async rejectEvent(eventId: string): Promise<EventType> {
    return this.setApprovalStatus(eventId, "draft");
  }

  public toEventType(doc: DocumentType<Event>): EventType {
    const status = EVENT_STATUSES.includes(doc.status as EventStatus) ? doc.status : "draft";

    return {
      id: doc._id.toString(),
      name: doc.name,
      slug: doc.slug ?? buildEventSlug(doc.name),
      organizerId: doc.organizerId?.toString(),
      date: doc.date.toISOString(),
      speakerName: doc.speakerName,
      speakerDesignation: doc.speakerDesignation,
      speakerPhotoUrl: doc.speakerPhotoUrl,
      status,
      aiDescription: doc.aiDescription,
      aiSpeakerIntro: doc.aiSpeakerIntro,
      aiGeneratedAt: doc.aiGeneratedAt?.toISOString(),
      createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString()
    };
  }

  public async create(
    input: ValidatedCreateEventInput,
    sessionUser?: SessionUser | null
  ): Promise<EventType> {
    const eventId = new Types.ObjectId();
    const slug = await this.generateUniqueSlug(input.name, eventId.toString());
    const status: EventStatus = "draft";

    const event = await EventModel.create({
      _id: eventId,
      name: input.name,
      slug,
      organizerId:
        sessionUser && isOrganizerRole(sessionUser.role)
          ? new Types.ObjectId(sessionUser.id)
          : undefined,
      date: new Date(input.date),
      speakerName: input.speakerName,
      speakerDesignation: input.speakerDesignation,
      speakerPhotoUrl: input.speakerPhotoUrl,
      status
    });
    return this.toEventType(event);
  }

  public async list(): Promise<EventType[]> {
    const events = await EventModel.find().sort({ date: 1 }).exec();
    const result: EventType[] = [];
    for (const event of events) {
      await this.ensureSlug(event);
      result.push(this.toEventType(event));
    }
    return result;
  }

  public async getById(id: string): Promise<EventType> {
    const event = await EventModel.findById(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }
    await this.ensureSlug(event);
    return this.toEventType(event);
  }

  public async update(
    id: string,
    input: ValidatedUpdateEventInput,
    sessionUser?: SessionUser | null
  ): Promise<EventType> {
    const existing = await EventModel.findById(id).exec();
    if (!existing) {
      throw new EventNotFoundError();
    }

    if (sessionUser && !isAdminRole(sessionUser.role)) {
      if (existing.organizerId?.toString() !== sessionUser.id) {
        throw new Error("FORBIDDEN");
      }
    }

    const setUpdate: Partial<Event> = {};
    const fieldsToUnset: string[] = [];

    if (input.name !== undefined) {
      setUpdate.name = input.name;
      setUpdate.slug = await this.generateUniqueSlug(input.name, id);
    }
    if (input.speakerName !== undefined) setUpdate.speakerName = input.speakerName;
    if (input.speakerDesignation !== undefined) setUpdate.speakerDesignation = input.speakerDesignation;
    if (input.date !== undefined) setUpdate.date = new Date(input.date);

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

  public async updateStatus(
    id: string,
    status: EventStatus,
    options?: { isAdmin?: boolean }
  ): Promise<EventType> {
    const event = await EventModel.findById(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }

    if (event.status === "pending_approval") {
      if (!options?.isAdmin) {
        throw new Error("FORBIDDEN");
      }
      assertAdminApprovalTransition(event.status, status);
    } else {
      assertValidStatusTransition(event.status, status);
    }

    event.status = status;
    await event.save();

    return this.toEventType(event);
  }

  private async setApprovalStatus(eventId: string, status: "published" | "draft"): Promise<EventType> {
    this.assertValidEventId(eventId);

    const event = await EventModel.findById(eventId).exec();
    if (!event) {
      throw new EventNotFoundError();
    }

    if (status === "published") {
      if (event.status !== "pending_approval" && event.status !== "draft") {
        throw new Error("Only pending or draft events can be published");
      }

      event.status = "published";
      await event.save();
      await this.ensureSlug(event);
      return this.toEventType(event);
    }

    if (event.status !== "pending_approval") {
      throw new Error("Only pending events can be rejected");
    }

    return this.updateStatus(eventId, status, { isAdmin: true });
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

  public async delete(id: string, sessionUser?: SessionUser | null): Promise<boolean> {
    const existing = await EventModel.findById(id).exec();
    if (!existing) {
      throw new EventNotFoundError();
    }

    if (sessionUser && !isAdminRole(sessionUser.role)) {
      if (existing.organizerId?.toString() !== sessionUser.id) {
        throw new Error("FORBIDDEN");
      }
    }

    await AttendeeModel.deleteMany({ eventId: new Types.ObjectId(id) }).exec();
    const event = await EventModel.findByIdAndDelete(id).exec();
    if (!event) {
      throw new EventNotFoundError();
    }
    return true;
  }

  private async ensureSlugOnId(eventId: string): Promise<void> {
    const event = await EventModel.findById(eventId).exec();
    if (event) {
      await this.ensureSlug(event);
    }
  }

  private async ensureSlug(event: DocumentType<Event>): Promise<void> {
    const current = event.slug?.trim();
    if (current) {
      event.slug = current.toLowerCase();
      if (event.isModified("slug")) {
        await event.save();
      }
      return;
    }

    event.slug = await this.generateUniqueSlug(event.name, event._id.toString());
    await event.save();
  }

  private async generateUniqueSlug(name: string, eventId: string): Promise<string> {
    const base = buildEventSlug(name);
    let candidate = base;
    let attempt = 2;

    while (attempt <= 100) {
      const existing = await EventModel.findOne({
        slug: candidate,
        _id: { $ne: new Types.ObjectId(eventId) }
      }).exec();

      if (!existing) {
        return candidate;
      }

      candidate = buildCollisionSlug(base, attempt);
      attempt += 1;
    }

    return `${base}-${Date.now()}`;
  }

  private assertValidEventId(id: string): void {
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      throw new Error(idValidation.message);
    }
  }
}
