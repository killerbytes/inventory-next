import * as clientInstrumentation from "@/instrumentation-client";
import * as rootInstrumentation from "@/instrumentation";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("Sentry Configuration & Instrumentation (Unit)", () => {
  it("should export register and onRequestError from root instrumentation", () => {
    expect(typeof rootInstrumentation.register).toBe("function");
    expect(typeof rootInstrumentation.onRequestError).toBe("function");
  });

  it("should export onRouterTransitionStart from client instrumentation", () => {
    expect("onRouterTransitionStart" in clientInstrumentation).toBe(true);
  });

  it("should configure withSentryConfig with correct org and project in next.config.mjs", () => {
    const configPath = path.resolve(process.cwd(), "next.config.mjs");
    const configContent = fs.readFileSync(configPath, "utf-8");

    expect(configContent).toContain("withSentryConfig");
    expect(configContent).toContain('org: "joel-carlos"');
    expect(configContent).toContain('project: "inventory-next"');
    expect(configContent).toContain('tunnelRoute: "/monitoring"');
    expect(configContent).toContain('output: "standalone"');
  });

  it("should ensure server and edge configs contain valid DSN entries", () => {
    const serverConfig = fs.readFileSync(path.resolve(process.cwd(), "sentry.server.config.ts"), "utf-8");
    const edgeConfig = fs.readFileSync(path.resolve(process.cwd(), "sentry.edge.config.ts"), "utf-8");

    expect(serverConfig).toContain("dsn:");
    expect(edgeConfig).toContain("dsn:");
    expect(serverConfig).toContain("Sentry.init");
    expect(edgeConfig).toContain("Sentry.init");
  });
});
