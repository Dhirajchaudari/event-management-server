import "reflect-metadata";

import { hash } from "bcryptjs";

import { connectMongo, disconnectMongo } from "../db/connection.js";
import { UserModel } from "../modules/auth/model/user.model.js";

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@orbitalops.net";
const password = process.env.SEED_ADMIN_PASSWORD ?? "EventAdmin@123";

async function seedAdmin(): Promise<void> {
  await connectMongo();

  const existing = await UserModel.findOne({ email }).exec();
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await disconnectMongo();
    return;
  }

  const passwordHash = await hash(password, 10);
  await UserModel.create({
    email,
    passwordHash,
    role: "admin"
  });

  console.log(`Seeded admin user: ${email}`);
  await disconnectMongo();
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
