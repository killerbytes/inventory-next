import { describe, expect, it } from "vitest";
import { isDiscountWithinLineAmount } from "@/lib/compute";
import { GoodReceiptInputSchema, GoodReceiptUpdateSchema } from "@/schemas/goodReceipt.schema";
import { SalesOrderInputSchema } from "@/schemas/salesOrder.schema";

describe("isDiscountWithinLineAmount", () => {
  it.each([
    ["no discount", 0],
    ["missing discount", undefined],
    ["a partial discount", 50],
    ["a 100% discount (free line)", 300],
    ["a float sum equal to the gross amount", 0.1 * 3],
  ])("allows %s", (_label, discount) => {
    const price = _label.startsWith("a float") ? 0.1 : 100;
    expect(isDiscountWithinLineAmount({ purchasePrice: price, quantity: 3, discount })).toBe(true);
  });

  it.each([
    ["a negative discount, which would raise the line above list price", -1],
    ["a discount larger than the line, which would produce a negative total", 300.01],
    ["a non-finite discount", Number.NaN],
  ])("rejects %s", (_label, discount) => {
    expect(isDiscountWithinLineAmount({ purchasePrice: 100, quantity: 3, discount })).toBe(false);
  });
});

const receipt = (line: Record<string, unknown>) => ({
  supplierId: 1,
  receiptDate: new Date(),
  referenceNo: "REF-1",
  goodReceiptLines: [{ combinationId: 1, quantity: 2, purchasePrice: 100, ...line }],
});

describe("Goods receipt line discounts", () => {
  it("accepts a discount within the line amount", () => {
    expect(GoodReceiptInputSchema.safeParse(receipt({ discount: 200 })).success).toBe(true);
  });

  it.each([-5, 200.5])(
    "rejects discount %s on create so the weighted average cost cannot be corrupted",
    (discount) => {
      expect(GoodReceiptInputSchema.safeParse(receipt({ discount })).success).toBe(false);
    },
  );

  it("rejects an over-sized discount on update too", () => {
    const res = GoodReceiptUpdateSchema.safeParse({
      goodReceiptLines: [{ combinationId: 1, quantity: 2, purchasePrice: 100, discount: 500 }],
    });
    expect(res.success).toBe(false);
  });
});

describe("Sales order line discounts", () => {
  const order = (discount: number) => ({
    salesOrderNumber: "SO-1",
    customerId: 1,
    orderDate: new Date(),
    modeOfPayment: "CASH",
    status: "RECEIVED",
    salesOrderItems: [{ combinationId: 1, quantity: 1, discount }],
  });

  it("rejects a negative discount, which would charge above list price", () => {
    expect(SalesOrderInputSchema.safeParse(order(-10)).success).toBe(false);
  });

  it("accepts a non-negative discount (upper bound is checked against the DB price)", () => {
    expect(SalesOrderInputSchema.safeParse(order(10)).success).toBe(true);
  });
});
