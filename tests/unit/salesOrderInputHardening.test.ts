import { describe, expect, it } from "vitest";
import {
  ReturnExchangeInputSchema,
  SalesOrderInputSchema,
  SalesOrderUpdateInputSchema,
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

describe("SalesOrderUpdateInputSchema (editing a DRAFT)", () => {
  it("accepts existing line ids so edited lines are updated in place", () => {
    const schema = SalesOrderUpdateInputSchema;
    const res = schema.safeParse({
      ...baseOrder,
      status: "DRAFT",
      salesOrderItems: [{ id: 7, combinationId: 1, quantity: 2 }],
    });
    expect(res.success).toBe(true);
  });

  it("rejects client-sent line prices so the server stays the source of truth", () => {
    const schema = SalesOrderUpdateInputSchema;
    const res = schema.safeParse({
      ...baseOrder,
      status: "DRAFT",
      salesOrderItems: [{ combinationId: 1, quantity: 2, purchasePrice: 1 }],
    });
    expect(res.success).toBe(false);
  });

  it.each(["COMPLETED", "CANCELLED", "VOID"])("rejects status %s", (status) => {
    const schema = SalesOrderUpdateInputSchema;
    expect(schema.safeParse({ ...baseOrder, status }).success).toBe(false);
  });

  it("rejects header fields that are not editable", () => {
    const schema = SalesOrderUpdateInputSchema;
    expect(schema.safeParse({ ...baseOrder, status: "DRAFT", totalAmount: 1 }).success).toBe(false);
  });
});
