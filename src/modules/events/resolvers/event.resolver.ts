import { Arg, Ctx, FieldResolver, ID, Int, Mutation, Query, Resolver, Root, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import {
  assertNotAttendeeRole,
  requireAdmin,
  requireOrganizerOrAdmin
} from "../../../middlewares/authorization.js";
import { isAdminRole } from "../../auth/interfaces/auth.types.js";
import { AttendeeType } from "../../attendees/schema/attendee.schema.js";
import { AttendeeService } from "../../attendees/services/attendee.service.js";
import type Context from "../../../types/context.type.js";
import {
  CreateEventInput,
  EventContent,
  EventStatusEnum,
  EventType,
  PublicEventLookup,
  PublicEventLookupCodeEnum,
  PublicEventSitemapEntry,
  UpdateEventInput
} from "../schema/event.schema.js";
import { EventService } from "../services/event.service.js";

const eventService = new EventService();
const attendeeService = new AttendeeService();

@Resolver(() => EventType)
export class EventResolver {
  @FieldResolver(() => Int)
  public async attendeeCount(@Root() event: EventType, @Ctx() context: Context): Promise<number> {
    const cached = context.attendeeCountByEventId?.get(event.id);
    if (cached !== undefined) {
      return cached;
    }
    return attendeeService.countForEvent(event.id);
  }

  @FieldResolver(() => [AttendeeType])
  @UseMiddleware(isAuthenticated)
  public async attendees(@Root() event: EventType, @Ctx() context: Context): Promise<AttendeeType[]> {
    const cached = context.attendeesByEventId?.get(event.id);
    if (cached) {
      return cached;
    }
    return attendeeService.listForEvent(event.id);
  }

  @Query(() => [EventType])
  @UseMiddleware(isAuthenticated)
  public async events(@Ctx() context: Context): Promise<EventType[]> {
    assertNotAttendeeRole(context.sessionUser!);

    const list = await eventService.listForSessionUser(context.sessionUser!);
    context.attendeeCountByEventId = await attendeeService.countByEventIds(list.map((event) => event.id));
    context.attendeesByEventId = await attendeeService.listByEventIds(list.map((event) => event.id));
    return list;
  }

  @Query(() => [PublicEventSitemapEntry])
  public async publicEventSitemap(): Promise<PublicEventSitemapEntry[]> {
    return eventService.listPublicSitemapEntries();
  }

  @Query(() => PublicEventLookup)
  public async publicEventLookup(
    @Arg("slug", () => String) slug: string,
    @Ctx() context: Context
  ): Promise<PublicEventLookup> {
    const result = await eventService.lookupPublicBySlug(slug);

    if (result.event) {
      context.attendeeCountByEventId = await attendeeService.countByEventIds([result.event.id]);
    }

    return {
      code: result.code as PublicEventLookupCodeEnum,
      event: result.event,
      status: result.status
    };
  }

  @Query(() => EventType, { nullable: true })
  public async getPublicEvent(
    @Arg("slug", () => String) slug: string,
    @Ctx() context: Context
  ): Promise<EventType | null> {
    try {
      const event = await eventService.findPublicBySlug(slug);
      if (!event) {
        return null;
      }
      context.attendeeCountByEventId = await attendeeService.countByEventIds([event.id]);
      return event;
    } catch {
      return null;
    }
  }

  @Query(() => EventType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public async eventById(
    @Arg("id", () => String) id: string,
    @Ctx() context: Context
  ): Promise<EventType | null> {
    const event = await eventService.findById(id);
    if (!event) {
      return null;
    }
    context.attendeeCountByEventId = await attendeeService.countByEventIds([event.id]);
    context.attendeesByEventId = await attendeeService.listByEventIds([event.id]);
    return event;
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireOrganizerOrAdmin)
  public async createEvent(
    @Arg("input", () => CreateEventInput) input: CreateEventInput,
    @Ctx() context: Context
  ): Promise<EventType> {
    return eventService.createFromInput(input, context.sessionUser);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireOrganizerOrAdmin)
  public async updateEvent(
    @Arg("id", () => String) id: string,
    @Arg("input", () => UpdateEventInput) input: UpdateEventInput,
    @Ctx() context: Context
  ): Promise<EventType> {
    return eventService.updateFromInput(id, input, context.sessionUser);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  public async updateEventStatus(
    @Arg("eventId", () => ID) eventId: string,
    @Arg("status", () => EventStatusEnum) status: EventStatusEnum,
    @Ctx() context: Context
  ): Promise<EventType> {
    if (!isAdminRole(context.sessionUser!.role)) {
      throw new Error("FORBIDDEN");
    }
    return eventService.updateStatusFromInput(eventId, status, context.sessionUser);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireOrganizerOrAdmin)
  public async submitEventForApproval(
    @Arg("eventId", () => ID) eventId: string,
    @Ctx() context: Context
  ): Promise<EventType> {
    return eventService.submitForApproval(eventId, context.sessionUser!);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireAdmin)
  public async approveEvent(@Arg("eventId", () => ID) eventId: string): Promise<EventType> {
    return eventService.approveEvent(eventId);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireAdmin)
  public async rejectEvent(@Arg("eventId", () => ID) eventId: string): Promise<EventType> {
    return eventService.rejectEvent(eventId);
  }

  @Mutation(() => EventContent)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireOrganizerOrAdmin)
  public async generateEventContent(
    @Arg("eventId", () => ID) eventId: string
  ): Promise<EventContent> {
    return eventService.generateEventContent(eventId);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  @UseMiddleware(requireOrganizerOrAdmin)
  public async deleteEvent(
    @Arg("id", () => String) id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    return eventService.deleteById(id, context.sessionUser);
  }
}
