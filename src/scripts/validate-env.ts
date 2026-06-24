import { getEnvConfig } from "../config/env.js";

try {
  const env = getEnvConfig();
  console.log("Environment OK:");
  console.log(`  NODE_ENV=${env.nodeEnv}`);
  console.log(`  HOST=${env.host}`);
  console.log(`  PORT=${env.port}`);
  console.log(`  MONGODB_URI=${env.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`);
  console.log(`  CORS_ORIGINS=${env.corsOrigins.join(",")}`);
  console.log(`  CLOUDINARY=${env.cloudinaryCloudName ? "configured" : "missing"}`);
  console.log(`  GEMINI=${env.geminiApiKey ? "configured" : "missing"}`);
  if (env.geminiApiKey && !env.geminiApiKey.startsWith("AIza") && !env.geminiApiKey.startsWith("AQ.")) {
    console.warn("  GEMINI warning: key format looks unusual — use a Google AI Studio API key");
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Environment validation failed: ${message}`);
  process.exit(1);
}
