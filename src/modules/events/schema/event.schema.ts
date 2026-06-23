import { Field, ID, InputType, ObjectType, registerEnumType } from "type-graphql";

import { EVENT_STATUSES, type EventStatus } from "../interfaces/event.types.js";

export enum EventStatusEnum {
  pending_approval = "pending_approval",
  draft = "draft",
  published = "published",
  live = "live",
  completed = "completed"
}

registerEnumType(EventStatusEnum, {
  name: "EventStatus"
});

export enum PublicEventLookupCodeEnum {
  OK = "OK",
  NOT_FOUND = "NOT_FOUND",
  NOT_PUBLISHED = "NOT_PUBLISHED",
  PENDING_APPROVAL = "PENDING_APPROVAL"
}

registerEnumType(PublicEventLookupCodeEnum, {
  name: "PublicEventLookupCode"
});

@ObjectType()
export class EventType {
  @Field(() => ID)
  public id!: string;

  @Field(() => String)
  public name!: string;

  @Field(() => String)
  public slug!: string;

  @Field(() => ID, { nullable: true })
  public organizerId?: string;

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

  public attendeeCount?: number;

  @Field(() => String, { nullable: true })
  public aiDescription?: string;

  @Field(() => String, { nullable: true })
  public aiSpeakerIntro?: string;

  @Field(() => String, { nullable: true })
  public aiGeneratedAt?: string;

  @Field(() => String)
  public createdAt!: string;

  @Field(() => String)
  public updatedAt!: string;
}

@ObjectType()
export class PublicEventLookup {
  @Field(() => PublicEventLookupCodeEnum)
  public code!: PublicEventLookupCodeEnum;

  @Field(() => EventType, { nullable: true })
  public event?: EventType;

  @Field(() => EventStatusEnum, { nullable: true })
  public status?: EventStatus;
}

@ObjectType()
export class PublicEventSitemapEntry {
  @Field(() => String)
  public slug!: string;

  @Field(() => String)
  public name!: string;

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
}

@ObjectType()
export class EventContent {
  @Field(() => String)
  public eventDescription!: string;

  @Field(() => String)
  public speakerIntro!: string;
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

  @Field(() => String, { nullable: true })
  public aiDescription?: string;

  @Field(() => String, { nullable: true })
  public aiSpeakerIntro?: string;
}

export { EVENT_STATUSES };
