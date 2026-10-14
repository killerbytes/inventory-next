import { describe, expect, it, vi } from "vitest";
import { calculateMovingAverageCost, inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { db } from "@/server/db/drizzle";

describe("calculateMovingAverageCost (Unit)", () => {
  it("should adopt incoming unit cost directly when existing quantity is 0", () => {
    // Arrange: 0 existing stock, incoming 24 units at 5.00
    const result = calculateMovingAverageCost({
      existingQuantity: 0,
      existingAveragePrice: 0,
      incomingQuantity: 24,
      incomingUnitCost: 5,
    });

    // Assert
    expect(result).toBe(5);
  });

  it("should adopt incoming unit cost directly when existing quantity is negative or invalid", () => {
    const result = calculateMovingAverageCost({
      existingQuantity: -5,
      existingAveragePrice: 10,
      incomingQuantity: 10,
      incomingUnitCost: 4,
    });

    expect(result).toBe(4);
  });

  it("should calculate correct weighted moving average when existing stock has a cost basis", () => {
    // Arrange: 100 PCS at 10.00/pc (1,000.00 value) + 24 PCS at 5.00/pc (120.00 value)
    // Expected: (1,000 + 120) / 124 = 1,120 / 124 = 9.032258...
    const result = calculateMovingAverageCost({
      existingQuantity: 100,
      existingAveragePrice: 10,
      incomingQuantity: 24,
      incomingUnitCost: 5,
    });

    expect(result).toBeCloseTo(9.032258, 5);
  });

  it("should calculate correct moving average for RePack operation into existing parent stock", () => {
    // Arrange: 1 BOX existing at 100.00 + 1 BOX repacked at 120.00
    // Expected: (100 + 120) / 2 = 110.00
    const result = calculateMovingAverageCost({
      existingQuantity: 1,
      existingAveragePrice: 100,
      incomingQuantity: 1,
      incomingUnitCost: 120,
    });

    expect(result).toBe(110);
  });

  it("should return existing average price if incoming quantity is 0", () => {
    const result = calculateMovingAverageCost({
      existingQuantity: 50,
      existingAveragePrice: 15.5,
      incomingQuantity: 0,
      incomingUnitCost: 20,
    });

    expect(result).toBe(15.5);
  });
});

describe("inventoryIncrease with distinct costPerUnit and averagePrice (Unit)", () => {
  it("should update inventories table with blended averagePrice and record batch costPerUnit in movements", async () => {
    // Mock db transaction / update and insert
    const mockInventory = {
      id: 10,
      combinationId: 2,
      quantity: "100",
      averagePrice: "10.00",
    };

    const updatedInventory = {
      id: 10,
      combinationId: 2,
      quantity: "124",
      averagePrice: "9.032258",
    };

    let capturedUpdateValues: any = null;
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
        set: (values: any) => {
          capturedUpdateValues = values;
          return {
            where: () => ({
              returning: async () => [updatedInventory],
            }),
          };
        },
      }),
      insert: () => ({
        values: async (values: any) => {
          capturedMovementValues = values;
          return [values];
        },
      }),
    };

    const result = await inventoryServerService.inventoryIncrease(
      {
        combinationId: 2,
        quantity: 24,
        averagePrice: 9.032258, // Blended shelf cost
        costPerUnit: 5.0, // Batch transfer cost
      },
      "BREAK_PACK_IN",
      101,
      "BREAK_PACK",
      mockTx as any,
      1
    );

    expect(capturedUpdateValues).toBeDefined();
    // inventories table gets the blended moving average price
    expect(capturedUpdateValues.averagePrice).toBe("9.032258");
    expect(capturedUpdateValues.quantity).toBe("124");

    expect(capturedMovementValues).toBeDefined();
    // inventoryMovements table gets the exact batch unit cost and total cost
    expect(capturedMovementValues.costPerUnit).toBe("5");
    expect(Number(capturedMovementValues.totalCost)).toBe(120);
    expect(capturedMovementValues.type).toBe("BREAK_PACK_IN");
  });
});

describe("productCombinationServerService.breakPack Moving Average Cost (Unit)", () => {
  it("should blend existing destination stock cost when breaking pack", async () => {
    // Arrange: 1 BOX (id: 1) has 1 BOX @ 120.00. conversionFactor = 24.
    // Target PCS (id: 2) has 100 PCS @ 10.00.
    const mockFrom = {
      id: 1,
      productId: 10,
      conversionFactor: "24",
      inventory: { id: 1, combinationId: 1, quantity: "2", averagePrice: "120.00" },
    };

    const mockTo = {
      id: 2,
      productId: 10,
      conversionFactor: "1",
      isBreakPackOfId: 1,
      inventory: { id: 2, combinationId: 2, quantity: "100", averagePrice: "10.00" },
    };

    let decreaseCalledWith: any = null;
    let increaseCalledWith: any = null;

    vi.spyOn(inventoryServerService, "inventoryDecrease").mockImplementation(async (item: any) => {
      decreaseCalledWith = item;
      return {} as any;
    });

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
            .mockResolvedValueOnce({ ...mockFrom, inventory: { ...mockFrom.inventory, quantity: "1" } })
            .mockResolvedValueOnce({ ...mockTo, inventory: { ...mockTo.inventory, quantity: "124" } }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 501 }]),
        }),
      }),
    };

    vi.spyOn(db, "transaction").mockImplementation(async (cb: any) => cb(mockTx));

    // Act: break 1 BOX (id: 1) into PCS (id: 2)
    const result = await productCombinationServerService.breakPack(
      {
        fromCombinationId: 1,
        quantity: 1,
        toCombinationId: 2,
      },
      1
    );

    // Assert
    expect(decreaseCalledWith).toBeDefined();
    expect(decreaseCalledWith.combinationId).toBe(1);
    expect(decreaseCalledWith.quantity).toBe(1);

    expect(increaseCalledWith).toBeDefined();
    expect(increaseCalledWith.combinationId).toBe(2);
    expect(increaseCalledWith.quantity).toBe(24);
    // Batch unit cost was 120 / 24 = 5.00
    expect(increaseCalledWith.costPerUnit).toBe(5);
    // Blended moving average: (100 * 10 + 24 * 5) / 124 = 1,120 / 124 ≈ 9.032258
    expect(increaseCalledWith.averagePrice).toBeCloseTo(9.032258, 5);
    expect(result.averagePrice).toBeCloseTo(9.032258, 5);

    vi.restoreAllMocks();
  });

  it("should blend existing destination stock cost when repacking PCS to BOX", async () => {
    // Arrange: 24 PCS (id: 2) @ 5.00 repacked to BOX (id: 1, conversionFactor: 24).
    // Target BOX has existing stock: 1 BOX @ 100.00.
    const mockFrom = {
      id: 2,
      productId: 10,
      conversionFactor: "1",
      isBreakPackOfId: 1,
      inventory: { id: 2, combinationId: 2, quantity: "48", averagePrice: "5.00" },
    };

    const mockTo = {
      id: 1,
      productId: 10,
      conversionFactor: "24",
      inventory: { id: 1, combinationId: 1, quantity: "1", averagePrice: "100.00" },
    };

    let decreaseCalledWith: any = null;
    let increaseCalledWith: any = null;

    vi.spyOn(inventoryServerService, "inventoryDecrease").mockImplementation(async (item: any) => {
      decreaseCalledWith = item;
      return {} as any;
    });

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
            .mockResolvedValueOnce({ ...mockFrom, inventory: { ...mockFrom.inventory, quantity: "24" } })
            .mockResolvedValueOnce({ ...mockTo, inventory: { ...mockTo.inventory, quantity: "2" } }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 502 }]),
        }),
      }),
    };

    vi.spyOn(db, "transaction").mockImplementation(async (cb: any) => cb(mockTx));

    // Act: repack 24 PCS into BOX
    const result = await productCombinationServerService.breakPack(
      {
        fromCombinationId: 2,
        quantity: 24,
        toCombinationId: 1,
      },
      1
    );

    // Assert
    expect(decreaseCalledWith).toBeDefined();
    expect(decreaseCalledWith.combinationId).toBe(2);
    expect(decreaseCalledWith.quantity).toBe(24);

    expect(increaseCalledWith).toBeDefined();
    expect(increaseCalledWith.combinationId).toBe(1);
    expect(increaseCalledWith.quantity).toBe(1);
    // Batch unit cost was (24 * 5) / 1 = 120.00
    expect(increaseCalledWith.costPerUnit).toBe(120);
    // Blended moving average: (1 * 100 + 1 * 120) / 2 = 110.00
    expect(increaseCalledWith.averagePrice).toBe(110);
    expect(result.averagePrice).toBe(110);

    vi.restoreAllMocks();
  });
});

