import type { FastifyReply, FastifyRequest } from "fastify";

import type { AttendeeType } from "../modules/attendees/schema/attendee.schema.js";
import type { SessionUser } from "../modules/auth/interfaces/auth.types.js";

export default interface Context {
  request: FastifyRequest;
  reply: FastifyReply;
  appReply: FastifyReply;
  sessionUser: SessionUser | null;
  attendeeCountByEventId?: Map<string, number>;
  attendeesByEventId?: Map<string, AttendeeType[]>;
}
