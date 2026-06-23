export type UserRole = "admin" | "organizer" | "attendee" | "user";

export type ActiveUserRole = "admin" | "organizer" | "attendee";

export enum UserRoleEnum {
  admin = "admin",
  organizer = "organizer",
  attendee = "attendee",
  user = "user"
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export function normalizeUserRole(role: UserRole): ActiveUserRole {
  if (role === "user") {
    return "organizer";
  }
  return role;
}

export function isAdminRole(role: UserRole): boolean {
  return normalizeUserRole(role) === "admin";
}

export function isOrganizerRole(role: UserRole): boolean {
  return normalizeUserRole(role) === "organizer";
}

export function isAttendeeRole(role: UserRole): boolean {
  return normalizeUserRole(role) === "attendee";
}
