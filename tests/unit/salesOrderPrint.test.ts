import { describe, expect, it } from "vitest";
import { computeSalesOrderSummary } from "@/lib/compute";
import { COMPANY_PROFILE } from "@/constants/company";
import { RETURN_TYPE } from "@/constants";

describe("Sales Order Print - Pure Computations & Constants", () => {
  it("verifies COMPANY_PROFILE constants structure", () => {
    expect(COMPANY_PROFILE.name).toBe("H Concepcion Hardware");
    expect(COMPANY_PROFILE.tin).toBe("009-123-456-000");
    expect(COMPANY_PROFILE.address).toBeDefined();
    expect(COMPANY_PROFILE.phone).toBeDefined();
  });

  it("calculates summary correctly with items, returns, and exchanges", () => {
    const mockOrder: any = {
      totalAmount: 1000,
      salesOrderItems: [
        {
          quantity: 2,
          purchasePrice: 400,
          discount: 50,
          totalAmount: 750,
        },
        {
          quantity: 1,
          purchasePrice: 250,
          discount: 0,
          totalAmount: 250,
        },
      ],
      returnTransactions: [
        {
          returnItems: [
            {
              type: RETURN_TYPE.RETURN_IN,
              quantity: 1,
              price: 400,
              discount: 25, // lineTotal = 375
            },
            {
              type: RETURN_TYPE.EXCHANGE_IN,
              quantity: 1,
              price: 150,
              discount: 0, // lineTotal = 150
            },
          ],
        },
      ],
    };

    const summary = computeSalesOrderSummary(mockOrder);

    // subtotal = (2 * 400) + (1 * 250) = 800 + 250 = 1050
    expect(summary.grossSubtotal).toBe(1050);
    // totalDiscount = 50 + 0 = 50
    expect(summary.totalDiscount).toBe(50);
    // saleAmount = 1000
    expect(summary.saleAmount).toBe(1000);
    // return amount = (1 * 400) - 25 = 375
    expect(summary.totalReturnAmount).toBe(375);
    // exchange amount = 150
    expect(summary.totalExchangeAmount).toBe(150);
    // grandTotal = 1000 - 375 + 150 = 775
    expect(summary.grandTotal).toBe(775);
  });

  it("handles orders with zero returns and zero items gracefully", () => {
    const emptyOrder: any = {
      totalAmount: 0,
      salesOrderItems: [],
      returnTransactions: [],
    };

    const summary = computeSalesOrderSummary(emptyOrder);
    expect(summary.grossSubtotal).toBe(0);
    expect(summary.totalDiscount).toBe(0);
    expect(summary.saleAmount).toBe(0);
    expect(summary.totalReturnAmount).toBe(0);
    expect(summary.totalExchangeAmount).toBe(0);
    expect(summary.grandTotal).toBe(0);
  });
});
