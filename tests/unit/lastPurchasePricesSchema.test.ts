import { LastPurchasePricesQuerySchema } from "@/schemas";

describe("LastPurchasePricesQuerySchema", () => {
  it("accepts combination ids with optional supplier and excluded receipt", () => {
    const result = LastPurchasePricesQuerySchema.safeParse({
      combinationIds: [1, 2],
      supplierId: 3,
      excludeGoodReceiptId: 4,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a lookup without supplier or excluded receipt (new receipt, no supplier yet)", () => {
    expect(
      LastPurchasePricesQuerySchema.safeParse({ combinationIds: [1] }).success,
    ).toBe(true);
  });

  it.each([
    ["non-positive combination id", { combinationIds: [0] }],
    ["non-integer combination id", { combinationIds: [1.5] }],
    ["string combination id", { combinationIds: ["1"] }],
    ["missing combination ids", {}],
    ["non-positive supplier id", { combinationIds: [1], supplierId: -1 }],
    ["non-positive excluded receipt id", { combinationIds: [1], excludeGoodReceiptId: 0 }],
  ])("rejects %s so the action cannot be fed arbitrary input", (_label, input) => {
    expect(LastPurchasePricesQuerySchema.safeParse(input).success).toBe(false);
  });
});
