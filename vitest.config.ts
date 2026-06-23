import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test"
    },
    fileParallelism: false,
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    setupFiles: ["test/setup.ts"]
  }
});
