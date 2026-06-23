import { validateEmail } from "../../auth/validation/auth.validation.js";
import { validateEventId } from "../../events/validation/event.validation.js";

export interface ValidatedRsvpInput {
  eventId: string;
  name: string;
  email: string;
  specialty?: string;
}

export function validateAttendeeId(id: string): { ok: true } | { ok: false; message: string } {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return { ok: false, message: "Invalid attendee id" };
  }
  return { ok: true };
}

export function validateRsvpInput(input: {
  eventId: string;
  name: string;
  email: string;
  specialty?: string | null;
}): { ok: true; data: ValidatedRsvpInput } | { ok: false; message: string } {
  const eventIdValidation = validateEventId(input.eventId);
  if (!eventIdValidation.ok) {
    return eventIdValidation;
  }

  const name = input.name?.trim() ?? "";
  if (!name) {
    return { ok: false, message: "Name is required" };
  }

  const emailValidation = validateEmail(input.email);
  if (!emailValidation.ok) {
    return emailValidation;
  }

  const specialty = input.specialty?.trim();
  return {
    ok: true,
    data: {
      eventId: input.eventId,
      name,
      email: emailValidation.value,
      ...(specialty ? { specialty } : {})
    }
  };
}
