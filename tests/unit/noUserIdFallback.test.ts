import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { INVENTORY_MOVEMENT_TYPE } from "@/constants";

/**
 * Audit fields (orderStatusHistories.changedBy, inventoryMovements.userId, ...)
 * must always identify the acting user. Silently falling back to a hardcoded ID
 * attributes the change to whoever owns that ID and corrupts the audit trail.
 */

const SERVER_DIR = path.resolve(__dirname, "../../src/server");

const FALLBACK_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: "nullish/or fallback to a literal", regex: /\b(userId|changedBy)\b[^\n;]*?(\?\?|\|\|)\s*\d+\b/ },
  { label: "default parameter literal", regex: /\buserId\s*(:\s*number)?\s*=\s*\d+\b/ },
];

function listTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listTsFiles(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("user ID fallbacks", () => {
  it("src/server contains no hardcoded user ID fallbacks", () => {
    // Arrange
    const files = listTsFiles(SERVER_DIR);

    // Act
    const violations = files.flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, i) =>
          FALLBACK_PATTERNS.filter(({ regex }) => regex.test(line)).map(
            ({ label }) => `${path.relative(SERVER_DIR, file)}:${i + 1} (${label}) ${line.trim()}`,
          ),
        ),
    );

    // Assert
    expect(violations).toEqual([]);
  });

  it.each([undefined, null, 0, Number.NaN])(
    "inventoryIncrease rejects userId=%s before touching the database",
    async (userId) => {
      await expect(
        inventoryServerService.inventoryIncrease(
          { combinationId: 1, quantity: 1 },
          INVENTORY_MOVEMENT_TYPE.IN,
          null,
          null,
          null,
          userId as unknown as number,
        ),
      ).rejects.toThrow("A valid userId is required");
    },
  );

  it.each([undefined, null, 0, Number.NaN])(
    "inventoryDecrease rejects userId=%s before touching the database",
    async (userId) => {
      await expect(
        inventoryServerService.inventoryDecrease(
          { combinationId: 1, quantity: 1 },
          INVENTORY_MOVEMENT_TYPE.OUT,
          null,
          null,
          null,
          userId as unknown as number,
        ),
      ).rejects.toThrow("A valid userId is required");
    },
  );
});
