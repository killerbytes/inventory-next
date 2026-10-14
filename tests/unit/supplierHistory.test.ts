import { describe, expect, it, vi } from "vitest";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { db } from "@/server/db/drizzle";

describe("supplierServerService.getByProductId (Unit)", () => {
  it("should filter out soft-deleted GoodReceiptLines and VOID parent receipts", async () => {
    // Arrange: Mock product combinations for Product 313
    const mockCombos = [{ id: 1275 }, { id: 1290 }];

    // Mock GoodReceiptLines including soft-deleted and active lines
    const mockLines = [
      {
        id: 896,
        combinationId: 1275,
        quantity: "2.000000",
        purchasePrice: "275.00",
        deletedAt: null,
        goodReceipt: { id: 97, status: "COMPLETED", deletedAt: null, supplier: { name: "Supplier A" } },
        combination: { id: 1275, name: "Grinding Wheel - 4", combinationValues: [] },
      },
      // Line 2692: Soft-deleted draft line of GR 487 (Should be excluded)
      {
        id: 2692,
        combinationId: 1275,
        quantity: "10.000000",
        purchasePrice: "11.00",
        deletedAt: new Date("2026-09-09T02:01:31Z"),
        goodReceipt: { id: 487, status: "COMPLETED", deletedAt: null, supplier: { name: "Supplier B" } },
        combination: { id: 1275, name: "Grinding Wheel - 4", combinationValues: [] },
      },
      // Line 2712: Active line of GR 487 (Should be included)
      {
        id: 2712,
        combinationId: 1275,
        quantity: "10.000000",
        purchasePrice: "11.00",
        deletedAt: null,
        goodReceipt: { id: 487, status: "COMPLETED", deletedAt: null, supplier: { name: "Supplier B" } },
        combination: { id: 1275, name: "Grinding Wheel - 4", combinationValues: [] },
      },
      // Line from a VOID Good Receipt (Should be excluded)
      {
        id: 3001,
        combinationId: 1290,
        quantity: "5.000000",
        purchasePrice: "12.00",
        deletedAt: null,
        goodReceipt: { id: 501, status: "VOID", deletedAt: null, supplier: { name: "Supplier C" } },
        combination: { id: 1290, name: "Grinding Wheel - 4", combinationValues: [] },
      },
    ];

    vi.spyOn(db.query.productCombinations, "findMany").mockResolvedValue(mockCombos as any);
    vi.spyOn(db.query.goodReceiptLines, "findMany").mockResolvedValue(mockLines as any);

    // Act
    const result = await supplierServerService.getByProductId(313);

    // Assert: Only active line 896 and 2712 should be returned (2692 soft-deleted and 3001 VOID excluded)
    expect(result.length).toBe(2);
    expect(result.map((r: any) => r.id)).toEqual([896, 2712]);
  });
});
