import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

// Preload .env.test before any test runs
dotenv.config({ path: path.resolve(__dirname, "./.env.test") });

const sharedConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(
        __dirname,
        "./node_modules/server-only/empty.js",
      ),
    },
  },
};

export default defineConfig({
  ...sharedConfig,
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    projects: [
      {
        ...sharedConfig,
        test: {
          name: "unit",
          include: ["tests/unit/*.test.ts"],
          environment: "node",
          globals: true,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: "components",
          include: ["tests/unit/components/**/*.test.tsx"],
          environment: "jsdom",
          globals: true,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globals: true,
        },
      },
    ],
  },
});
