export type EventStatus =
  | "pending_approval"
  | "draft"
  | "published"
  | "live"
  | "completed";

export const EVENT_STATUSES: EventStatus[] = [
  "pending_approval",
  "draft",
  "published",
  "live",
  "completed"
];

export const STATUS_LIFECYCLE: EventStatus[] = ["draft", "published", "live", "completed"];

export const PUBLIC_EVENT_STATUSES: EventStatus[] = ["published", "live", "completed"];
