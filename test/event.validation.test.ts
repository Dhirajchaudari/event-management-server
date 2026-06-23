import { describe, expect, it } from "vitest";

import { validateCreateInput, validateUpdateInput } from "../src/modules/events/event.validation.js";

describe("validateCreateInput", () => {
  it("accepts valid event payload", () => {
    const result = validateCreateInput({
      name: "Advances in Fetal Medicine",
      date: "15 August 2026",
      speakerName: "Dr. Jane Smith",
      speakerDesignation: "Senior Consultant, ABC Hospital"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Advances in Fetal Medicine");
      expect(result.data.speakerName).toBe("Dr. Jane Smith");
    }
  });

  it("rejects missing fields", () => {
    const result = validateCreateInput({ name: "Only name" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("required fields");
    }
  });

  it("rejects invalid date", () => {
    const result = validateCreateInput({
      name: "Test Event",
      date: "not-a-date",
      speakerName: "Speaker",
      speakerDesignation: "Role"
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateUpdateInput", () => {
  it("requires at least one field", () => {
    const result = validateUpdateInput({});
    expect(result.ok).toBe(false);
  });

  it("accepts partial updates", () => {
    const result = validateUpdateInput({ name: "Updated name" });
    expect(result.ok).toBe(true);
  });
});
