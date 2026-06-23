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

  @prop({ required: true, trim: true, type: () => String })
  public name!: string;

  @prop({ required: true, type: () => Date })
  public date!: Date;

  @prop({ required: true, trim: true, type: () => String })
  public speakerName!: string;

  @prop({ required: true, trim: true, type: () => String })
  public speakerDesignation!: string;

  public createdAt?: Date;

  public updatedAt?: Date;
}

export const EventModel = getModelForClass(Event);
