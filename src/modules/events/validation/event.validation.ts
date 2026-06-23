import type { CreateEventInput, UpdateEventInput } from "../inputs/event.inputs.js";

export interface ValidatedCreateEventInput {
  name: string;
  date: string;
  speakerName: string;
  speakerDesignation: string;
}

export interface ValidatedUpdateEventInput {
  name?: string;
  date?: string;
  speakerName?: string;
  speakerDesignation?: string;
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

  return {
    ok: true,
    data: {
      name: input.name.trim(),
      date: parsedDate.isoDate,
      speakerName: input.speakerName.trim(),
      speakerDesignation: input.speakerDesignation.trim()
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

function parseEventDate(value: string): { ok: true; isoDate: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: "Event date must be a valid date (e.g. 2026-08-15 or 15 August 2026)" };
  }

  return { ok: true, isoDate: parsed.toISOString() };
}
