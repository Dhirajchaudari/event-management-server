import mongoose from "mongoose";

import { getEnvConfig } from "../config/env.js";

let connected = false;

export async function connectMongo(): Promise<void> {
  if (connected) {
    return;
  }

  const { mongodbUri } = getEnvConfig();
  await mongoose.connect(mongodbUri);
  connected = true;
}

export async function checkDatabaseConnection(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    await connectMongo();
  }
  await mongoose.connection.db?.admin().ping();
}

export async function disconnectMongo(): Promise<void> {
  if (!connected) {
    return;
  }
  await mongoose.disconnect();
  connected = false;
}
