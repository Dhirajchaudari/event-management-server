import { Schema, model, type InferSchemaType } from "mongoose";

const eventSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    speakerName: { type: String, required: true, trim: true },
    speakerDesignation: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export type EventDocument = InferSchemaType<typeof eventSchema> & { _id: Schema.Types.ObjectId };

export const EventModel = model("Event", eventSchema);
