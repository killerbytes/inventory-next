import { describe, it, expect, vi, beforeEach } from "vitest";
import { salesServerService } from "@/server/services/salesServer.service";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { db } from "@/server/db/drizzle";
import { ORDER_STATUS, RETURN_TYPE } from "@/constants";

describe("salesServerService.returnExchange validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(inventoryServerService, "inventoryIncrease").mockResolvedValue({} as any);
    vi.spyOn(inventoryServerService, "inventoryDecrease").mockResolvedValue({} as any);
  });

  const setupMockTx = (options: {
    salesOrder: any;
    priorReturnTransactions?: any[];
  }) => {
    const insertedReturnItems: any[] = [];
    const mockTx = {
      query: {
        salesOrders: {
          findFirst: vi.fn().mockResolvedValue(options.salesOrder),
        },
        returnTransactions: {
          findMany: vi.fn().mockResolvedValue(options.priorReturnTransactions || []),
        },
        productCombinations: {
          findFirst: vi.fn().mockResolvedValue({ id: 99, price: "100" }),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((val) => {
          if (val.returnTransactionId) {
            insertedReturnItems.push(val);
          }
          return {
            returning: vi.fn().mockResolvedValue([{ id: 1, ...val }]),
          };
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    vi.spyOn(db, "transaction").mockImplementation(async (cb: any) => {
      return await cb(mockTx);
    });

    return { mockTx, insertedReturnItems };
  };

  it("should reject return when requested quantity exceeds line quantity on initial return", async () => {
    setupMockTx({
      salesOrder: {
        id: 10,
        status: ORDER_STATUS.COMPLETED,
        salesOrderItems: [
          { combinationId: 101, quantity: "5", originalPrice: "100", discount: "0" },
        ],
      },
      priorReturnTransactions: [],
    });

    await expect(
      salesServerService.returnExchange(10, [{ combinationId: 101, quantity: 6 }], [], "Damaged"),
    ).rejects.toThrow("Return quantity exceeds available returnable quantity");
  });

  it("should reject return when cumulative return quantity across multiple return transactions exceeds line quantity", async () => {
    setupMockTx({
      salesOrder: {
        id: 10,
        status: ORDER_STATUS.COMPLETED,
        salesOrderItems: [
          { combinationId: 101, quantity: "5", originalPrice: "100", discount: "0" },
        ],
      },
      priorReturnTransactions: [
        {
          id: 1,
          referenceId: 10,
          sourceType: "SALE",
          returnItems: [
            { combinationId: 101, quantity: "3", type: RETURN_TYPE.RETURN_IN },
          ],
        },
      ],
    });

    // 3 already returned out of 5; attempting to return 3 more (total 6) must fail
    await expect(
      salesServerService.returnExchange(10, [{ combinationId: 101, quantity: 3 }], [], "Customer request"),
    ).rejects.toThrow("Return quantity exceeds available returnable quantity");
  });

  it("should succeed when return quantity is within available returnable quantity", async () => {
    const { insertedReturnItems } = setupMockTx({
      salesOrder: {
        id: 10,
        status: ORDER_STATUS.COMPLETED,
        salesOrderItems: [
          { combinationId: 101, quantity: "5", originalPrice: "100", discount: "0" },
        ],
      },
      priorReturnTransactions: [
        {
          id: 1,
          referenceId: 10,
          sourceType: "SALE",
          returnItems: [
            { combinationId: 101, quantity: "3", type: RETURN_TYPE.RETURN_IN },
          ],
        },
      ],
    });

    // 3 already returned out of 5; returning remaining 2 should succeed
    const res = await salesServerService.returnExchange(
      10,
      [{ combinationId: 101, quantity: 2 }],
      [],
      "Final return",
    );

    expect(res).toBeDefined();
    expect(res.totalReturnAmount).toBe(200);
    expect(insertedReturnItems.length).toBe(1);
    expect(insertedReturnItems[0].quantity).toBe("2");
  });

  it("should reject return when product combination was not ordered in the sales order", async () => {
    setupMockTx({
      salesOrder: {
        id: 10,
        status: ORDER_STATUS.COMPLETED,
        salesOrderItems: [
          { combinationId: 101, quantity: "5", originalPrice: "100", discount: "0" },
        ],
      },
      priorReturnTransactions: [],
    });

    await expect(
      salesServerService.returnExchange(10, [{ combinationId: 999, quantity: 1 }], [], "Wrong item"),
    ).rejects.toThrow("Product combination 999 not found in Sales Order");
  });

  it("should reject return when requested quantity is zero or negative", async () => {
    setupMockTx({
      salesOrder: {
        id: 10,
        status: ORDER_STATUS.COMPLETED,
        salesOrderItems: [
          { combinationId: 101, quantity: "5", originalPrice: "100", discount: "0" },
        ],
      },
      priorReturnTransactions: [],
    });

    await expect(
      salesServerService.returnExchange(10, [{ combinationId: 101, quantity: 0 }], [], "Zero qty"),
    ).rejects.toThrow("Return quantity must be greater than zero");

    await expect(
      salesServerService.returnExchange(10, [{ combinationId: 101, quantity: -2 }], [], "Negative qty"),
    ).rejects.toThrow("Return quantity must be greater than zero");
  });

  it("should reject return when duplicate entries for the same combination within a single batch exceed line quantity", async () => {
    setupMockTx({
      salesOrder: {
        id: 10,
        status: ORDER_STATUS.COMPLETED,
        salesOrderItems: [
          { combinationId: 101, quantity: "5", originalPrice: "100", discount: "0" },
        ],
      },
      priorReturnTransactions: [],
    });

    // 3 + 3 = 6 > 5 in the same batch
    await expect(
      salesServerService.returnExchange(
        10,
        [
          { combinationId: 101, quantity: 3 },
          { combinationId: 101, quantity: 3 },
        ],
        [],
        "Duplicate batch items",
      ),
    ).rejects.toThrow("Return quantity exceeds available returnable quantity");
  });
});
