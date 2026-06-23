import { Arg, Mutation, Query, Resolver } from "type-graphql";

import {
  CreateEventInput,
  EventType,
  UpdateEventInput
} from "../inputs/event.inputs.js";
import { EventNotFoundError, EventService } from "../services/event.service.js";
import { validateCreateInput, validateEventId, validateUpdateInput } from "../validation/event.validation.js";

const eventService = new EventService();

@Resolver(() => EventType)
export class EventResolver {
  @Query(() => [EventType])
  public async events(): Promise<EventType[]> {
    return eventService.list();
  }

  @Query(() => EventType, { nullable: true })
  public async eventById(@Arg("id", () => String) id: string): Promise<EventType | null> {
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      throw new Error(idValidation.message);
    }

    try {
      return await eventService.getById(id);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  @Mutation(() => EventType)
  public async createEvent(@Arg("input", () => CreateEventInput) input: CreateEventInput): Promise<EventType> {
    const validation = validateCreateInput(input);
    if (!validation.ok) {
      throw new Error(validation.message);
    }
    return eventService.create(validation.data);
  }

  @Mutation(() => EventType)
  public async updateEvent(
    @Arg("id", () => String) id: string,
    @Arg("input", () => UpdateEventInput) input: UpdateEventInput
  ): Promise<EventType> {
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      throw new Error(idValidation.message);
    }

    const validation = validateUpdateInput(input);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    try {
      return await eventService.update(id, validation.data);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }

  @Mutation(() => Boolean)
  public async deleteEvent(@Arg("id", () => String) id: string): Promise<boolean> {
    const idValidation = validateEventId(id);
    if (!idValidation.ok) {
      throw new Error(idValidation.message);
    }

    try {
      return await eventService.delete(id);
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        throw new Error("Event not found");
      }
      throw error;
    }
  }
}
