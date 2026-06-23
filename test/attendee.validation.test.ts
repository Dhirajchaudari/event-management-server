import { describe, expect, it } from "vitest";

import {
  validateAttendeeId,
  validateRsvpInput
} from "../src/modules/attendees/validation/attendee.validation.js";

describe("validateRsvpInput", () => {
  it("accepts valid RSVP input", () => {
    const result = validateRsvpInput({
      eventId: "507f1f77bcf86cd799439011",
      name: "Dr. Jane Smith",
      email: "Jane@Hospital.org",
      specialty: "Cardiology"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("jane@hospital.org");
      expect(result.data.specialty).toBe("Cardiology");
    }
  });

  it("rejects invalid email", () => {
    const result = validateRsvpInput({
      eventId: "507f1f77bcf86cd799439011",
      name: "Dr. Jane Smith",
      email: "not-an-email"
    });

    expect(result.ok).toBe(false);
  });
});

describe("validateAttendeeId", () => {
  it("rejects invalid attendee id", () => {
    const result = validateAttendeeId("bad-id");
    expect(result.ok).toBe(false);
  });
});
