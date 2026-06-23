import type { CreateEventInput, UpdateEventInput } from "../schema/event.schema.js";
import { EVENT_STATUSES, type EventStatus } from "../interfaces/event.types.js";

export interface ValidatedCreateEventInput {
  name: string;
  date: string;
  speakerName: string;
  speakerDesignation: string;
  speakerPhotoUrl?: string;
  attendeeCount?: number;
}

export interface ValidatedUpdateEventInput {
  name?: string;
  date?: string;
  speakerName?: string;
  speakerDesignation?: string;
  speakerPhotoUrl?: string;
  attendeeCount?: number;
  aiDescription?: string;
  aiSpeakerIntro?: string;
}

const REQUIRED_FIELDS = ["name", "date", "speakerName", "speakerDesignation"] as const;

export function validateCreateInput(
  input: CreateEventInput
): { ok: true; data: ValidatedCreateEventInput } | { ok: false; message: string } {
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = input[field];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missing.length > 0) {
    return { ok: false, message: `Missing or empty required fields: ${missing.join(", ")}` };
  }

  const parsedDate = parseEventDate(input.date);
  if (!parsedDate.ok) {
    return { ok: false, message: parsedDate.message };
  }

  const speakerPhotoUrl = parseOptionalString(input.speakerPhotoUrl);
  if (speakerPhotoUrl.error) {
    return { ok: false, message: speakerPhotoUrl.error };
  }

  const attendeeCount = parseOptionalAttendeeCount(input.attendeeCount);
  if (attendeeCount.error) {
    return { ok: false, message: attendeeCount.error };
  }

  return {
    ok: true,
    data: {
      name: input.name.trim(),
      date: parsedDate.isoDate,
      speakerName: input.speakerName.trim(),
      speakerDesignation: input.speakerDesignation.trim(),
      ...(speakerPhotoUrl.value !== undefined ? { speakerPhotoUrl: speakerPhotoUrl.value } : {}),
      ...(attendeeCount.value !== undefined ? { attendeeCount: attendeeCount.value } : {})
    }
  };
}

export function validateUpdateInput(
  input: UpdateEventInput
): { ok: true; data: ValidatedUpdateEventInput } | { ok: false; message: string } {
  const data: ValidatedUpdateEventInput = {};

  for (const field of REQUIRED_FIELDS) {
    if (input[field] === undefined) {
      continue;
    }
    if (typeof input[field] !== "string" || input[field]!.trim() === "") {
      return { ok: false, message: `Field "${field}" must be a non-empty string` };
    }
    data[field] = input[field]!.trim();
  }

  if (input.speakerPhotoUrl !== undefined) {
    const speakerPhotoUrl = parseOptionalString(input.speakerPhotoUrl);
    if (speakerPhotoUrl.error) {
      return { ok: false, message: speakerPhotoUrl.error };
    }
    data.speakerPhotoUrl = speakerPhotoUrl.value;
  }

  if (input.attendeeCount !== undefined) {
    const attendeeCount = parseOptionalAttendeeCount(input.attendeeCount);
    if (attendeeCount.error) {
      return { ok: false, message: attendeeCount.error };
    }
    data.attendeeCount = attendeeCount.value;
  }

  if (input.aiDescription !== undefined) {
    if (typeof input.aiDescription !== "string") {
      return { ok: false, message: "aiDescription must be a string" };
    }
    data.aiDescription = input.aiDescription.trim();
  }

  if (input.aiSpeakerIntro !== undefined) {
    if (typeof input.aiSpeakerIntro !== "string") {
      return { ok: false, message: "aiSpeakerIntro must be a string" };
    }
    data.aiSpeakerIntro = input.aiSpeakerIntro.trim();
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "At least one field is required to update" };
  }

  if (data.date !== undefined) {
    const parsedDate = parseEventDate(data.date);
    if (!parsedDate.ok) {
      return { ok: false, message: parsedDate.message };
    }
    data.date = parsedDate.isoDate;
  }

  return { ok: true, data };
}

export function validateEventId(id: string): { ok: true } | { ok: false; message: string } {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return { ok: false, message: "Invalid event id" };
  }
  return { ok: true };
}

function parseOptionalString(
  value: string | undefined
): { value?: string; error?: string } {
  if (value === undefined) {
    return {};
  }
  if (typeof value !== "string") {
    return { error: "speakerPhotoUrl must be a string" };
  }
  const trimmed = value.trim();
  return { value: trimmed === "" ? undefined : trimmed };
}

export function validateEventStatus(value: EventStatus): { ok: true; status: EventStatus } | { ok: false; message: string } {
  if (!EVENT_STATUSES.includes(value)) {
    return { ok: false, message: "Invalid event status" };
  }
  return { ok: true, status: value };
}

function parseOptionalAttendeeCount(
  value: number | undefined
): { value?: number; error?: string } {
  if (value === undefined) {
    return {};
  }
  if (!Number.isInteger(value) || value < 0) {
    return { error: "attendeeCount must be a non-negative integer" };
  }
  return { value };
}

function parseEventDate(value: string): { ok: true; isoDate: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: "Event date must be a valid date (e.g. 2026-08-15 or 15 August 2026)" };
  }

  return { ok: true, isoDate: parsed.toISOString() };
}
