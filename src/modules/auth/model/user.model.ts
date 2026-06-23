import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import type { Types } from "mongoose";

import type { UserRole } from "../interfaces/auth.types.js";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: "users"
  }
})
export class User {
  public _id!: Types.ObjectId;

  @prop({ required: true, unique: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ required: true })
  public passwordHash!: string;

  @prop({ required: true, enum: ["admin", "user"], default: "user" })
  public role!: UserRole;

  public createdAt?: Date;

  public updatedAt?: Date;
}

export const UserModel = getModelForClass(User);
