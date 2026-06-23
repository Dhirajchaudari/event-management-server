import { type MiddlewareFn } from "type-graphql";

import {
  isAdminRole,
  isAttendeeRole,
  isOrganizerRole,
  normalizeUserRole,
  type ActiveUserRole,
  type UserRole
} from "../modules/auth/interfaces/auth.types.js";
import type Context from "../types/context.type.js";

function hasRole(role: UserRole, allowed: ActiveUserRole[]): boolean {
  const normalized = normalizeUserRole(role);
  return allowed.includes(normalized);
}

export function requireRoles(...roles: ActiveUserRole[]): MiddlewareFn<Context> {
  return async ({ context }, next) => {
    if (!context.sessionUser) {
      throw new Error("UNAUTHENTICATED");
    }

    if (!hasRole(context.sessionUser.role, roles)) {
      throw new Error("FORBIDDEN");
    }

    return next();
  };
}

export const requireAdmin = requireRoles("admin");

export const requireOrganizerOrAdmin = requireRoles("admin", "organizer");

export function assertEventAccess(
  sessionUser: NonNullable<Context["sessionUser"]>,
  organizerId?: string | null
): void {
  if (isAdminRole(sessionUser.role)) {
    return;
  }

  if (isOrganizerRole(sessionUser.role) && organizerId === sessionUser.id) {
    return;
  }

  throw new Error("FORBIDDEN");
}

export function assertNotAttendeeRole(sessionUser: NonNullable<Context["sessionUser"]>): void {
  if (isAttendeeRole(sessionUser.role)) {
    throw new Error("FORBIDDEN");
  }
}
