import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import type { Types } from "mongoose";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "events"
  }
})
export class Event {
  public _id!: Types.ObjectId;

  @prop({ required: true, trim: true })
  public name!: string;

  @prop({ required: true })
  public date!: Date;

  @prop({ required: true, trim: true })
  public speakerName!: string;

  @prop({ required: true, trim: true })
  public speakerDesignation!: string;

  public createdAt?: Date;

  public updatedAt?: Date;
}

export const EventModel = getModelForClass(Event);
