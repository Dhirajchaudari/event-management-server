import { describe, expect, it } from "vitest";

import {
  assertValidStatusTransition,
  getNextStatus,
  InvalidStatusTransitionError
} from "../src/modules/events/validation/status-transition.js";

describe("status transitions", () => {
  it("allows forward lifecycle steps", () => {
    expect(() => assertValidStatusTransition("draft", "published")).not.toThrow();
    expect(() => assertValidStatusTransition("published", "live")).not.toThrow();
    expect(() => assertValidStatusTransition("live", "completed")).not.toThrow();
  });

  it("allows no-op transitions", () => {
    expect(() => assertValidStatusTransition("published", "published")).not.toThrow();
  });

  it("rejects backwards and skipped transitions", () => {
    expect(() => assertValidStatusTransition("published", "draft")).toThrow(InvalidStatusTransitionError);
    expect(() => assertValidStatusTransition("live", "published")).toThrow(InvalidStatusTransitionError);
    expect(() => assertValidStatusTransition("draft", "live")).toThrow(InvalidStatusTransitionError);
    expect(() => assertValidStatusTransition("completed", "live")).toThrow(InvalidStatusTransitionError);
  });

  it("returns the next status in the lifecycle", () => {
    expect(getNextStatus("draft")).toBe("published");
    expect(getNextStatus("completed")).toBeNull();
  });
});
