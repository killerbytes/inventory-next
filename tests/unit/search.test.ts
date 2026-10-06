import { describe, expect, it, vi } from "vitest";
import { buildTsQuery } from "@/server/services/productCombinationServer.service";

describe("buildTsQuery (Unit)", () => {
  it("should generate a clean tsQuery even with special characters and operators", () => {
    // Arrange
    const searchString = "channel bar - 2x4 | hd";

    // Act
    const result = buildTsQuery(searchString);

    // Assert
    expect(result).toBe("channel:* & bar:* & 2x4:* & hd:*");
  });

  it("should handle mixed special characters and operators like parentheses and exclamation marks", () => {
    // Arrange
    const searchString = "product! name (test) | or & and";

    // Act
    const result = buildTsQuery(searchString);

    // Assert
    expect(result).toBe("product:* & name:* & test:* & or:* & and:*");
  });

  it("should handle non-string search input gracefully", () => {
    // Act & Assert
    expect(buildTsQuery(null)).toBe("");
    expect(buildTsQuery(undefined)).toBe("");
    expect(buildTsQuery("")).toBe("");
  });

  it("should split hyphens cleanly into tsQuery terms for queries like neltex pipe (s-1000)", () => {
    // Arrange
    const searchString = "neltex pipe (s-1000)";

    // Act
    const result = buildTsQuery(searchString);

    // Assert
    expect(result).toBe("neltex:* & pipe:* & s:* & 1000:*");
  });

  it("should generate clean tsQuery for queries like neltex pipe 1000 and neltex pipe s1000", () => {
    expect(buildTsQuery("neltex pipe 1000")).toBe("neltex:* & pipe:* & 1000:*");
    expect(buildTsQuery("neltex pipe s1000")).toBe("neltex:* & pipe:* & s1000:*");
  });
});

describe("productCombinationServerService.search SQL Parity (Unit)", () => {
  it("should not group by pc.unit or select pc.unit at product level", async () => {
    const { sequelize } = await import("@/server/models");
    const { productCombinationServerService } = await import(
      "@/server/services/productCombinationServer.service"
    );

    const querySpy = vi.spyOn(sequelize, "query").mockResolvedValue([] as any);

    await productCombinationServerService.search({ search: "pipe" });

    expect(querySpy).toHaveBeenCalled();
    const sqlExecuted = querySpy.mock.calls[0][0] as string;

    // Verify it groups strictly by product to avoid splitting combinations
    expect(sqlExecuted).not.toContain('pc."unit",');
    expect(sqlExecuted).not.toContain('GROUP BY p.id, p.name, pc."unit"');
    expect(sqlExecuted).toContain("GROUP BY p.id, p.name");

    querySpy.mockRestore();
  });
});

