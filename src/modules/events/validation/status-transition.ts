import { STATUS_LIFECYCLE, type EventStatus } from "../interfaces/event.types.js";

export class InvalidStatusTransitionError extends Error {
  constructor(from: EventStatus, to: EventStatus) {
    super(`Invalid status transition from "${from}" to "${to}"`);
    this.name = "InvalidStatusTransitionError";
  }
}

export function getNextStatus(current: EventStatus): EventStatus | null {
  const index = STATUS_LIFECYCLE.indexOf(current);
  if (index === -1 || index >= STATUS_LIFECYCLE.length - 1) {
    return null;
  }
  return STATUS_LIFECYCLE[index + 1] ?? null;
}

export function assertValidStatusTransition(from: EventStatus, to: EventStatus): void {
  if (from === to) {
    return;
  }

  const next = getNextStatus(from);
  if (next !== to) {
    throw new InvalidStatusTransitionError(from, to);
  }
}
