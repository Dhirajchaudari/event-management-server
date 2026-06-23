import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import type { Types } from "mongoose";

import type { EventStatus } from "../interfaces/event.types.js";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "events"
  }
})
export class Event {
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true, type: () => String })
  public name!: string;

  @prop({ required: true, type: () => Date })
  public date!: Date;

  @prop({ required: true, trim: true, type: () => String })
  public speakerName!: string;

  @prop({ required: true, trim: true, type: () => String })
  public speakerDesignation!: string;

  @prop({ trim: true, type: () => String })
  public speakerPhotoUrl?: string;

  @prop({
    required: true,
    enum: ["draft", "published", "live", "completed"],
    default: "draft",
    type: () => String
  })
  public status!: EventStatus;

  @prop({ required: true, default: 0, type: () => Number })
  public attendeeCount!: number;

  public createdAt?: Date;

  public updatedAt?: Date;
}

export const EventModel = getModelForClass(Event);
