import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
export class AttendeeType {
  @Field(() => ID)
  public id!: string;

  @Field(() => ID)
  public eventId!: string;

  @Field(() => String)
  public name!: string;

  @Field(() => String)
  public email!: string;

  @Field(() => String, { nullable: true })
  public specialty?: string;

  @Field(() => String)
  public rsvpAt!: string;
}
