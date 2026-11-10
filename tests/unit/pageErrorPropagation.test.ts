import fs from "fs";
import path from "path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server pages must let read failures reach the route error boundary
 * (`src/app/(dashboard)/error.tsx`) and Sentry's `onRequestError`. A page that
 * catches and renders defaults shows "no sales" during a DB outage, and the
 * error is never reported.
 */

vi.mock("@/server/auth/guards", () => ({
  requirePermission: vi.fn().mockResolvedValue({ id: 1, role: "ADMIN" }),
  requireSession: vi.fn().mockResolvedValue({ id: 1, role: "ADMIN" }),
}));

const dbDown = new Error("connect ECONNREFUSED 127.0.0.1:5432");

vi.mock("@/server/services/reportsServer.service", () => ({
  reportsServerService: {
    getProfitSummary: vi.fn(),
    getProfitProducts: vi.fn(),
  },
}));

vi.mock("@/server/services/salesServer.service", () => ({
  salesServerService: { get: vi.fn() },
}));

import { reportsServerService } from "@/server/services/reportsServer.service";
import { salesServerService } from "@/server/services/salesServer.service";

// Page modules pull in large widget trees; importing them is slow under the parallel suite.
const IMPORT_TIMEOUT_MS = 60_000;

describe("server pages surface read failures", () => {
  let ProfitReportPage: (props: any) => Promise<unknown>;
  let SalesOrderDetailsPage: (props: any) => Promise<unknown>;

  beforeAll(async () => {
    ProfitReportPage = (await import("@/app/(dashboard)/reports/profit/page")).default;
    SalesOrderDetailsPage = (await import("@/app/(dashboard)/sales-orders/[id]/page")).default;
  }, IMPORT_TIMEOUT_MS);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("profit report throws on a DB failure instead of rendering zero profit", async () => {
    vi.mocked(reportsServerService.getProfitSummary).mockRejectedValue(dbDown);
    vi.mocked(reportsServerService.getProfitProducts).mockRejectedValue(dbDown);

    await expect(ProfitReportPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(dbDown);
  });

  it("sales order detail throws on a DB failure instead of showing a misleading 404", async () => {
    vi.mocked(salesServerService.get).mockRejectedValue(dbDown);

    await expect(SalesOrderDetailsPage({ params: Promise.resolve({ id: "1" }) })).rejects.toThrow(
      dbDown,
    );
  });

  it("sales order detail still returns 404 when the order really doesn't exist", async () => {
    vi.mocked(salesServerService.get).mockResolvedValue(null);

    await expect(SalesOrderDetailsPage({ params: Promise.resolve({ id: "999" }) })).rejects.toThrow(
      /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/,
    );
  });
});

describe("server page catch guard", () => {
  const appDir = path.resolve(__dirname, "../../src/app");

  const serverPages = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return serverPages(full);
      if (entry.name !== "page.tsx") return [];
      const source = fs.readFileSync(full, "utf8");
      return /^\s*["']use client["']/.test(source) ? [] : [full];
    });

  it("no server page.tsx catches errors (let them reach error.tsx and Sentry)", () => {
    const offenders = serverPages(appDir)
      .filter((file) => /\bcatch\s*[({]/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(appDir, file));

    expect(offenders).toEqual([]);
  });
});
