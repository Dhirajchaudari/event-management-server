import { describe, expect, it } from "vitest";

import { CreateEventInput, UpdateEventInput } from "../src/modules/events/schema/event.schema.js";
import { validateCreateInput, validateUpdateInput } from "../src/modules/events/validation/event.validation.js";

describe("validateCreateInput", () => {
  it("accepts valid event payload", () => {
    const input = new CreateEventInput();
    input.name = "Advances in Fetal Medicine";
    input.date = "15 August 2026";
    input.speakerName = "Dr. Jane Smith";
    input.speakerDesignation = "Senior Consultant, ABC Hospital";

    const result = validateCreateInput(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Advances in Fetal Medicine");
      expect(result.data.speakerName).toBe("Dr. Jane Smith");
    }
  });

  it("rejects missing fields", () => {
    const input = new CreateEventInput();
    input.name = "Only name";
    input.date = "";
    input.speakerName = "";
    input.speakerDesignation = "";

    const result = validateCreateInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("required fields");
    }
  });

  it("rejects invalid date", () => {
    const input = new CreateEventInput();
    input.name = "Test Event";
    input.date = "not-a-date";
    input.speakerName = "Speaker";
    input.speakerDesignation = "Role";

    const result = validateCreateInput(input);
    expect(result.ok).toBe(false);
  });
});

describe("validateUpdateInput", () => {
  it("requires at least one field", () => {
    const result = validateUpdateInput(new UpdateEventInput());
    expect(result.ok).toBe(false);
  });

  it("accepts partial updates", () => {
    const input = new UpdateEventInput();
    input.name = "Updated name";
    const result = validateUpdateInput(input);
    expect(result.ok).toBe(true);
  });
});
