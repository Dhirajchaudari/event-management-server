import { Field, ID, InputType, Int, ObjectType, registerEnumType } from "type-graphql";

import { EVENT_STATUSES, type EventStatus } from "../interfaces/event.types.js";

export enum EventStatusEnum {
  draft = "draft",
  published = "published",
  completed = "completed",
  cancelled = "cancelled"
}

registerEnumType(EventStatusEnum, {
  name: "EventStatus"
});

@ObjectType()
export class EventType {
  @Field(() => ID)
  public id!: string;

  @Field(() => String)
  public name!: string;

  @Field(() => String)
  public date!: string;

  @Field(() => String)
  public speakerName!: string;

  @Field(() => String)
  public speakerDesignation!: string;

  @Field(() => String, { nullable: true })
  public speakerPhotoUrl?: string;

  @Field(() => EventStatusEnum)
  public status!: EventStatus;

  @Field(() => Int)
  public attendeeCount!: number;

  @Field(() => String)
  public createdAt!: string;

  @Field(() => String)
  public updatedAt!: string;
}

@InputType()
export class CreateEventInput {
  @Field(() => String)
  public name!: string;

  @Field(() => String)
  public date!: string;

  @Field(() => String)
  public speakerName!: string;

  @Field(() => String)
  public speakerDesignation!: string;

  @Field(() => String, { nullable: true })
  public speakerPhotoUrl?: string;

  @Field(() => EventStatusEnum, { nullable: true })
  public status?: EventStatus;

  @Field(() => Int, { nullable: true })
  public attendeeCount?: number;
}

@InputType()
export class UpdateEventInput {
  @Field(() => String, { nullable: true })
  public name?: string;

  @Field(() => String, { nullable: true })
  public date?: string;

  @Field(() => String, { nullable: true })
  public speakerName?: string;

  @Field(() => String, { nullable: true })
  public speakerDesignation?: string;

  @Field(() => String, { nullable: true })
  public speakerPhotoUrl?: string;

  @Field(() => EventStatusEnum, { nullable: true })
  public status?: EventStatus;

  @Field(() => Int, { nullable: true })
  public attendeeCount?: number;
}

export { EVENT_STATUSES };
