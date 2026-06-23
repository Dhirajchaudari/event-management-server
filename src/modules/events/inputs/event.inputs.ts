import { Field, ID, InputType, ObjectType } from "type-graphql";

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
}
