import { describe, expect, it } from "vitest";
import {
  ReturnExchangeInputSchema,
  SalesOrderInputSchema,
} from "@/schemas/salesOrder.schema";

const baseOrder = {
  salesOrderNumber: "SO-TEST-0001",
  customerId: 1,
  orderDate: new Date(),
  modeOfPayment: "CASH",
  salesOrderItems: [{ combinationId: 1, quantity: 1 }],
};

describe("SalesOrderInputSchema status", () => {
  it.each(["DRAFT", "RECEIVED"])("accepts %s", (status) => {
    expect(SalesOrderInputSchema.safeParse({ ...baseOrder, status }).success).toBe(true);
  });

  it.each(["COMPLETED", "CANCELLED", "VOID", "QUOTATION", "anything"])(
    "rejects %s so orders cannot bypass inventory deduction",
    (status) => {
      expect(SalesOrderInputSchema.safeParse({ ...baseOrder, status }).success).toBe(false);
    },
  );
});

describe("ReturnExchangeInputSchema", () => {
  it("accepts a valid return with an exchange", () => {
    const res = ReturnExchangeInputSchema.safeParse({
      returns: [{ combinationId: 1, quantity: 2 }],
      exchanges: [{ combinationId: 2, quantity: 1 }],
      reason: "Damaged",
    });
    expect(res.success).toBe(true);
  });

  it.each([0, -1, Number.NaN, Infinity, "abc"])(
    "rejects return quantity %s",
    (quantity) => {
      const res = ReturnExchangeInputSchema.safeParse({
        returns: [{ combinationId: 1, quantity }],
      });
      expect(res.success).toBe(false);
    },
  );

  it("rejects a negative exchange quantity (would otherwise add stock)", () => {
    const res = ReturnExchangeInputSchema.safeParse({
      returns: [{ combinationId: 1, quantity: 1 }],
      exchanges: [{ combinationId: 2, quantity: -5 }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects an empty request", () => {
    expect(ReturnExchangeInputSchema.safeParse({ returns: [], exchanges: [] }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const res = ReturnExchangeInputSchema.safeParse({
      returns: [{ combinationId: 1, quantity: 1, unitPrice: 0 }],
    });
    expect(res.success).toBe(false);
  });
});
