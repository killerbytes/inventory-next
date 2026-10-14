import { describe, expect, it, vi } from "vitest";
import { truncateQty } from "@/lib/compute";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { db } from "@/server/db/drizzle";

describe("truncateQty IEEE-754 Precision (Unit)", () => {
  it("should not drop a centavo on floating-point trap values (e.g. 1.14, 1.29, 1.57, 1.58, 29.58)", () => {
    // In standard JS Math.trunc(1.14 * 100) / 100 yields 1.13 due to 113.99999999999999
    expect(truncateQty(1.14, 2)).toBe(1.14);
    expect(truncateQty(1.29, 2)).toBe(1.29);
    expect(truncateQty(1.57, 2)).toBe(1.57);
    expect(truncateQty(1.58, 2)).toBe(1.58);
    expect(truncateQty(29.58, 2)).toBe(29.58);
  });

  it("should maintain 100% accuracy on 6 decimal places without floating-point artifacts", () => {
    expect(truncateQty(9.032258, 6)).toBe(9.032258);
    expect(truncateQty(33.333333, 6)).toBe(33.333333);
    expect(truncateQty(0.000001, 6)).toBe(0.000001);
  });

  it("should handle 0, NaN, and string representations cleanly", () => {
    expect(truncateQty(0)).toBe(0);
    expect(truncateQty("0")).toBe(0);
    expect(truncateQty("1.14", 2)).toBe(1.14);
    expect(truncateQty("invalid")).toBe(0);
  });
});

describe("inventoryIncrease with exact totalCost (Unit)", () => {
  it("should preserve exact injected totalCost in inventoryMovements even with repeating fractions", async () => {
    // Arrange: 3 PCS with costPerUnit = 33.333333.
    // If re-multiplied (3 * 33.333333), it would be 99.999999.
    // With explicit totalCost = 100, movement must record 100.
    const mockInventory = {
      id: 20,
      combinationId: 5,
      quantity: "0",
      averagePrice: "0",
    };

    let capturedMovementValues: any = null;

    const mockTx = {
      select: () => ({
        from: () => ({
          where: () => ({
            for: async () => [mockInventory],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => [{ ...mockInventory, quantity: "3" }],
          }),
        }),
      }),
      insert: () => ({
        values: async (values: any) => {
          capturedMovementValues = values;
          return [values];
        },
      }),
    };

    await inventoryServerService.inventoryIncrease(
      {
        combinationId: 5,
        quantity: 3,
        averagePrice: 33.333333,
        costPerUnit: 33.333333,
        totalCost: 100.0, // Exact batch cost from source transfer
      },
      "BREAK_PACK_IN",
      888,
      "BREAK_PACK",
      mockTx as any,
      1
    );

    expect(capturedMovementValues).toBeDefined();
    // Must be exact 100, not 99.999999
    expect(Number(capturedMovementValues.totalCost)).toBe(100);
    expect(capturedMovementValues.costPerUnit).toBe("33.333333");
  });
});

describe("breakPack with non-divisible fraction ledger parity (Unit)", () => {
  it("should pass exact source transfer totalCost to target inventoryIncrease (e.g. 1 BOX @ 100 -> 3 PCS)", async () => {
    // Arrange: 1 BOX (id: 10) @ 100.00. conversionFactor = 3.
    const mockFrom = {
      id: 10,
      productId: 99,
      conversionFactor: "3",
      inventory: { id: 10, combinationId: 10, quantity: "1", averagePrice: "100.00" },
    };

    const mockTo = {
      id: 11,
      productId: 99,
      conversionFactor: "1",
      isBreakPackOfId: 10,
      inventory: { id: 11, combinationId: 11, quantity: "0", averagePrice: "0" },
    };

    let increaseCalledWith: any = null;

    vi.spyOn(inventoryServerService, "inventoryDecrease").mockResolvedValue({} as any);
    vi.spyOn(inventoryServerService, "inventoryIncrease").mockImplementation(async (item: any) => {
      increaseCalledWith = item;
      return {} as any;
    });

    const mockTx = {
      query: {
        productCombinations: {
          findFirst: vi.fn()
            .mockResolvedValueOnce(mockFrom)
            .mockResolvedValueOnce(mockTo)
            .mockResolvedValueOnce(mockFrom)
            .mockResolvedValueOnce(mockTo),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 999 }]),
        }),
      }),
    };

    vi.spyOn(db, "transaction").mockImplementation(async (cb: any) => cb(mockTx));

    // Act: break 1 BOX into 3 PCS
    await productCombinationServerService.breakPack(
      {
        fromCombinationId: 10,
        quantity: 1,
        toCombinationId: 11,
      },
      1
    );

    // Assert
    expect(increaseCalledWith).toBeDefined();
    expect(increaseCalledWith.quantity).toBe(3);
    // Explicit totalCost must be 100 (matching the 1 * 100 cost removed from source)
    expect(increaseCalledWith.totalCost).toBe(100);

    vi.restoreAllMocks();
  });
});
