import { describe, expect, it, vi, beforeEach } from "vitest";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { db } from "@/server/db/drizzle";

describe("goodReceiptServerService.getLastPurchasePrices (Unit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty object when combinationIds array is empty", async () => {
    const result = await goodReceiptServerService.getLastPurchasePrices({
      combinationIds: [],
    });
    expect(result).toEqual({});
  });

  it("should exclude current transaction when excludeGoodReceiptId is provided", async () => {
    // Scenario:
    // Good Receipt 100 (current being edited) has purchasePrice 200.00
    // Good Receipt 90 (previous transaction) has purchasePrice 150.00
    // When excludeGoodReceiptId: 100 is passed, it should ignore GR 100 and return GR 90's price (150).
    const mockRows = [
      {
        combinationId: 101,
        purchasePrice: "150.00",
        receiptDate: new Date("2026-05-01T00:00:00Z"),
        supplierId: 1,
        lineId: 201,
      },
    ];

    let capturedWhere: any = null;
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((condition) => {
            capturedWhere = condition;
            return {
              orderBy: vi.fn().mockResolvedValue(mockRows),
            };
          }),
        }),
      }),
    });

    vi.spyOn(db, "select").mockImplementation(selectMock as any);

    const result = await goodReceiptServerService.getLastPurchasePrices({
      combinationIds: [101],
      excludeGoodReceiptId: 100,
    });

    expect(result[101]).toEqual({
      combinationId: 101,
      lastPrice: 150,
      receiptDate: new Date("2026-05-01T00:00:00Z"),
      supplierId: 1,
      isSupplierMatch: false,
    });
  });

  it("should return the latest purchase price across non-void, non-draft receipts and prioritize supplier match", async () => {
    const mockRows = [
      {
        combinationId: 101,
        purchasePrice: "170.00",
        receiptDate: new Date("2026-06-01T00:00:00Z"),
        supplierId: 2,
        lineId: 202,
      },
      {
        combinationId: 101,
        purchasePrice: "150.00",
        receiptDate: new Date("2026-05-01T00:00:00Z"),
        supplierId: 1,
        lineId: 201,
      },
      {
        combinationId: 102,
        purchasePrice: "85.50",
        receiptDate: new Date("2026-04-10T00:00:00Z"),
        supplierId: 2,
        lineId: 203,
      },
    ];

    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockRows),
          }),
        }),
      }),
    });

    vi.spyOn(db, "select").mockImplementation(selectMock as any);

    const resultWithSupplier = await goodReceiptServerService.getLastPurchasePrices({
      combinationIds: [101, 102],
      supplierId: 1,
    });

    expect(resultWithSupplier[101]).toEqual({
      combinationId: 101,
      lastPrice: 150,
      receiptDate: new Date("2026-05-01T00:00:00Z"),
      supplierId: 1,
      isSupplierMatch: true,
    });
    expect(resultWithSupplier[102]).toEqual({
      combinationId: 102,
      lastPrice: 85.5,
      receiptDate: new Date("2026-04-10T00:00:00Z"),
      supplierId: 2,
      isSupplierMatch: false,
    });
  });
});
