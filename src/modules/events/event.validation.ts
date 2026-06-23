export interface CreateEventInput {
  name: string;
  date: string;
  speakerName: string;
  speakerDesignation: string;
}

export interface UpdateEventInput {
  name?: string;
  date?: string;
  speakerName?: string;
  speakerDesignation?: string;
}

export interface EventResponse {
  id: string;
  name: string;
  date: string;
  speakerName: string;
  speakerDesignation: string;
  createdAt: string;
  updatedAt: string;
}

const REQUIRED_FIELDS = ["name", "date", "speakerName", "speakerDesignation"] as const;

export function validateCreateInput(body: unknown): { ok: true; data: CreateEventInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = record[field];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missing.length > 0) {
    return { ok: false, message: `Missing or empty required fields: ${missing.join(", ")}` };
  }

  const parsedDate = parseEventDate(record.date as string);
  if (!parsedDate.ok) {
    return { ok: false, message: parsedDate.message };
  }

  return {
    ok: true,
    data: {
      name: (record.name as string).trim(),
      date: parsedDate.isoDate,
      speakerName: (record.speakerName as string).trim(),
      speakerDesignation: (record.speakerDesignation as string).trim()
    }
  };
}

export function validateUpdateInput(body: unknown): { ok: true; data: UpdateEventInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const data: UpdateEventInput = {};

  for (const field of REQUIRED_FIELDS) {
    if (record[field] === undefined) {
      continue;
    }
    if (typeof record[field] !== "string" || (record[field] as string).trim() === "") {
      return { ok: false, message: `Field "${field}" must be a non-empty string` };
    }
    data[field] = (record[field] as string).trim();
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

function parseEventDate(value: string): { ok: true; isoDate: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: "Event date must be a valid date (e.g. 2026-08-15 or 15 August 2026)" };
  }

  return { ok: true, isoDate: parsed.toISOString() };
}

export function toEventResponse(doc: {
  _id: { toString(): string };
  name: string;
  date: Date;
  speakerName: string;
  speakerDesignation: string;
  createdAt?: Date;
  updatedAt?: Date;
}): EventResponse {
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
