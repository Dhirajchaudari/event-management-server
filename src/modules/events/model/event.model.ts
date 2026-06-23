import { getModelForClass, index, modelOptions, prop } from "@typegoose/typegoose";
import { Schema, type Types } from "mongoose";

import type { EventStatus } from "../interfaces/event.types.js";

@index({ slug: 1 }, { unique: true, sparse: true })
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

  @prop({ trim: true, type: () => String })
  public slug?: string;

  @prop({ type: () => Schema.Types.ObjectId })
  public organizerId?: Types.ObjectId;

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
    enum: ["pending_approval", "draft", "published", "live", "completed"],
    default: "draft",
    type: () => String
  })
  public status!: EventStatus;

  @prop({ required: true, default: 0, type: () => Number })
  public attendeeCount!: number;

  @prop({ trim: true, type: () => String })
  public aiDescription?: string;

  @prop({ trim: true, type: () => String })
  public aiSpeakerIntro?: string;

  @prop({ type: () => Date })
  public aiGeneratedAt?: Date;

  public createdAt?: Date;

  public updatedAt?: Date;
}

export const EventModel = getModelForClass(Event);
