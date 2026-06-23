import { Arg, Ctx, FieldResolver, ID, Int, Mutation, Query, Resolver, Root, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { AttendeeType } from "../../attendees/schema/attendee.schema.js";
import { AttendeeService } from "../../attendees/services/attendee.service.js";
import type Context from "../../../types/context.type.js";
import {
  CreateEventInput,
  EventContent,
  EventStatusEnum,
  EventType,
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
    const list = await eventService.list();
    const eventIds = list.map((event) => event.id);
    context.attendeeCountByEventId = await attendeeService.countByEventIds(eventIds);
    context.attendeesByEventId = await attendeeService.listByEventIds(eventIds);
    return list;
  }

  @Query(() => EventType, { nullable: true })
  public async getPublicEvent(
    @Arg("id", () => ID) id: string,
    @Ctx() context: Context
  ): Promise<EventType | null> {
    const event = await eventService.findById(id);
    if (!event) {
      return null;
    }
    context.attendeeCountByEventId = await attendeeService.countByEventIds([event.id]);
    return event;
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
  public async createEvent(@Arg("input", () => CreateEventInput) input: CreateEventInput): Promise<EventType> {
    return eventService.createFromInput(input);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  public async updateEvent(
    @Arg("id", () => String) id: string,
    @Arg("input", () => UpdateEventInput) input: UpdateEventInput
  ): Promise<EventType> {
    return eventService.updateFromInput(id, input);
  }

  @Mutation(() => EventType)
  @UseMiddleware(isAuthenticated)
  public async updateEventStatus(
    @Arg("eventId", () => ID) eventId: string,
    @Arg("status", () => EventStatusEnum) status: EventStatusEnum
  ): Promise<EventType> {
    return eventService.updateStatusFromInput(eventId, status);
  }

  @Mutation(() => EventContent)
  @UseMiddleware(isAuthenticated)
  public async generateEventContent(
    @Arg("eventId", () => ID) eventId: string
  ): Promise<EventContent> {
    return eventService.generateEventContent(eventId);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  public async deleteEvent(@Arg("id", () => String) id: string): Promise<boolean> {
    return eventService.deleteById(id);
  }
}
