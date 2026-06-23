import { getModelForClass, index, modelOptions, prop } from "@typegoose/typegoose";
import { Schema, type Types } from "mongoose";

@index({ eventId: 1, email: 1 }, { unique: true })
@modelOptions({
  schemaOptions: {
    timestamps: false,
    collection: "attendees"
  }
})
export class Attendee {
  public _id!: Types.ObjectId;

  @prop({ required: true, type: () => Schema.Types.ObjectId })
  public eventId!: Types.ObjectId;

  @prop({ required: true, trim: true, type: () => String })
  public name!: string;

  @prop({ required: true, trim: true, lowercase: true, type: () => String })
  public email!: string;

  @prop({ trim: true, type: () => String })
  public specialty?: string;

  @prop({ required: true, type: () => Date, default: () => new Date() })
  public rsvpAt!: Date;
}

export const AttendeeModel = getModelForClass(Attendee);
