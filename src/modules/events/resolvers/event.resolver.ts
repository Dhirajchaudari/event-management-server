import { Arg, ID, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import {
  CreateEventInput,
  EventContent,
  EventStatusEnum,
  EventType,
  UpdateEventInput
} from "../schema/event.schema.js";
import { EventService } from "../services/event.service.js";

const eventService = new EventService();

@Resolver(() => EventType)
export class EventResolver {
  @Query(() => [EventType])
  @UseMiddleware(isAuthenticated)
  public async events(): Promise<EventType[]> {
    return eventService.list();
  }

  @Query(() => EventType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public async eventById(@Arg("id", () => String) id: string): Promise<EventType | null> {
    return eventService.findById(id);
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
