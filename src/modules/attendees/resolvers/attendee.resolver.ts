import { Arg, ID, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { AttendeeType } from "../schema/attendee.schema.js";
import {
  AttendeeNotFoundError,
  AttendeeService,
  DuplicateRsvpError
} from "../services/attendee.service.js";
import { EventNotFoundError } from "../../events/services/event.service.js";
import { validateEventId } from "../../events/validation/event.validation.js";

const attendeeService = new AttendeeService();

@Resolver(() => AttendeeType)
export class AttendeeResolver {
  @Query(() => [AttendeeType])
  @UseMiddleware(isAuthenticated)
  public async getEventAttendees(@Arg("eventId", () => ID) eventId: string): Promise<AttendeeType[]> {
    const validation = validateEventId(eventId);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    return attendeeService.listForEvent(eventId);
  }

  @Mutation(() => AttendeeType)
  public async rsvpToEvent(
    @Arg("eventId", () => ID) eventId: string,
    @Arg("name", () => String) name: string,
    @Arg("email", () => String) email: string,
    @Arg("specialty", () => String, { nullable: true }) specialty?: string
  ): Promise<AttendeeType> {
    try {
      return await attendeeService.rsvpFromInput(eventId, name, email, specialty);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      if (error instanceof DuplicateRsvpError) {
        throw error;
      }
      throw error;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  public async cancelRsvp(@Arg("attendeeId", () => ID) attendeeId: string): Promise<boolean> {
    try {
      return await attendeeService.cancelById(attendeeId);
    } catch (error) {
      if (error instanceof AttendeeNotFoundError) {
        throw new Error("Attendee not found");
      }
      throw error;
    }
  }
}
