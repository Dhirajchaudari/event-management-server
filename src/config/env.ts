import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFiles(): void {
  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const candidates =
    nodeEnv === "production"
      ? [".env.production", ".env"]
      : [".env.local", ".env"];

  for (const file of candidates) {
    const path = resolve(cwd, file);
    if (existsSync(path)) {
      dotenv.config({ path });
    }
  }
}

loadEnvFiles();

export interface EnvConfig {
  nodeEnv: string;
  host: string;
  port: number;
  mongodbUri: string;
  corsOrigins: string[];
  jwtPublicKey: string;
  jwtPrivateKey: string;
  passwordMinLength: number;
}

let cachedConfig: EnvConfig | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function decodeBase64Key(value: string): string {
  return Buffer.from(value, "base64").toString("utf8");
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return [
      "http://localhost:3000",
      "https://events.orbitalops.net"
    ];
  }
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resetEnvConfigForTests(): void {
  cachedConfig = null;
}

export function getEnvConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isTest = nodeEnv === "test";
  const hasJwtKeys = Boolean(process.env.PUBLIC_KEY && process.env.PRIVATE_KEY);

  cachedConfig = {
    nodeEnv,
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? "8000"),
    mongodbUri:
      isTest
        ? (process.env.MONGODB_URI ?? "mongodb://localhost:27017/event_management_test")
        : getRequiredEnv("MONGODB_URI"),
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    jwtPublicKey: hasJwtKeys ? decodeBase64Key(getRequiredEnv("PUBLIC_KEY")) : "",
    jwtPrivateKey: hasJwtKeys ? decodeBase64Key(getRequiredEnv("PRIVATE_KEY")) : "",
    passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH ?? "8")
  };

  if (!isTest && !hasJwtKeys) {
    throw new Error("Missing required env vars: PUBLIC_KEY and PRIVATE_KEY");
  }

  return cachedConfig;
}
