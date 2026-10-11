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
  it("should execute search query using Drizzle db.execute and project products with combinations", async () => {
    const { db } = await import("@/server/db/drizzle");
    const { productCombinationServerService } = await import(
      "@/server/services/productCombinationServer.service"
    );

    const mockProductRows = [
      {
        id: 1,
        name: "Steel Pipe",
        description: "Heavy structural pipe",
        categoryId: 5,
        combinations: [
          {
            id: 101,
            productId: 1,
            name: "Steel Pipe - 2 inch",
            sku: "SP-2",
            unit: "PCS",
            price: "150.00",
            inventory: { id: 10, quantity: 10, averagePrice: "120.00" },
          },
        ],
      },
    ];

    const executeSpy = vi
      .spyOn(db, "execute")
      .mockResolvedValue({ rows: mockProductRows } as any);

    const results = await productCombinationServerService.search({ search: "pipe" });

    expect(executeSpy).toHaveBeenCalled();
    const sqlArg = executeSpy.mock.calls[0][0];
    const sqlText = (sqlArg as any)?.queryChunks
      ? (sqlArg as any).queryChunks
        .map((c: any) => (typeof c === "string" ? c : c?.value || ""))
        .join("")
      : "";

    expect(sqlText).toContain('p.id');
    expect(sqlText).toContain('p.name');
    expect(sqlText).toContain('p.description');
    expect(sqlText).toContain('p."categoryId"');
    expect(sqlText).toContain('"combinations"');
    expect(sqlText).toContain('GROUP BY');
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("id", 1);
    expect(results[0]).toHaveProperty("name", "Steel Pipe");
    expect(results[0]).toHaveProperty("description", "Heavy structural pipe");
    expect(results[0]).toHaveProperty("categoryId", 5);
    expect(results[0]).toHaveProperty("combinations");
    expect(results[0].combinations).toHaveLength(1);
    expect(results[0].combinations[0]).toHaveProperty("id", 101);

    executeSpy.mockRestore();
  });
});

