import { describe, expect, it } from "vitest";
import {
  getBookletCode,
  getBookletPrefix,
  isBookletCodeOnly,
  withBookletCode,
} from "@/lib/receiptNumber";
import { SalesOrderInputSchema } from "@/schemas/salesOrder.schema";

describe("receipt booklet codes", () => {
  it.each([
    ["0001", 1, ""],
    ["B2-0001", 2, "B2-"],
    ["b12-0001", 12, "B12-"],
    ["SO-2026-11-0001", 1, ""],
    [null, 1, ""],
  ])("reads %s as booklet %s with prefix '%s'", (number, code, prefix) => {
    expect(getBookletCode(number)).toBe(code);
    expect(getBookletPrefix(number)).toBe(prefix);
  });

  it.each([
    ["0001", 2, "B2-0001"],
    ["B2-0001", 3, "B3-0001"],
  ])("moves %s to booklet %s without stacking codes", (number, code, expected) => {
    expect(withBookletCode(number, code)).toBe(expected);
  });

  it.each([
    ["B2-", true],
    [" b2- ", true],
    ["B2-0001", false],
    ["", false],
    [undefined, false],
  ])("treats '%s' as a code without a receipt number: %s", (number, expected) => {
    expect(isBookletCodeOnly(number)).toBe(expected);
  });
});

describe("SalesOrderInputSchema receipt number", () => {
  const order = (salesOrderNumber: string) => ({
    salesOrderNumber,
    customerId: 1,
    orderDate: new Date(),
    modeOfPayment: "CASH",
    status: "DRAFT",
    salesOrderItems: [{ combinationId: 1, quantity: 1 }],
  });

  it("rejects a prefilled booklet code whose number was never typed", () => {
    const res = SalesOrderInputSchema.safeParse(order("B2-"));

    expect(res.success).toBe(false);
    expect(res.error?.flatten().fieldErrors.salesOrderNumber).toEqual([
      "Add the receipt number after the booklet code.",
    ]);
  });

  it("trims the number so stray spaces cannot get past the duplicate guard", () => {
    const res = SalesOrderInputSchema.safeParse(order(" B2-0001 "));

    expect(res.data?.salesOrderNumber).toBe("B2-0001");
  });
});
