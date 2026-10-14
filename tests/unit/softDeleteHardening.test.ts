import { describe, expect, it, vi } from "vitest";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { paymentServerService } from "@/server/services/paymentServer.service";
import { db } from "@/server/db/drizzle";

describe("Cross-Service Soft-Delete Hardening (Unit)", () => {
  describe("reportsServerService.getProfitSummary", () => {
    it("should exclude soft-deleted salesOrderItems and void/cancelled orders from cost calculations", async () => {
      // Sales order with 1 active item and 1 soft-deleted item
      const mockOrders = [
        {
          id: 101,
          status: "COMPLETED",
          totalAmount: "1000.00",
          salesOrderItems: [
            {
              id: 1,
              combinationId: 50,
              quantity: "2",
              originalPrice: "200.00",
              deletedAt: null,
            },
            {
              id: 2,
              combinationId: 51,
              quantity: "3",
              originalPrice: "100.00",
              deletedAt: new Date("2026-10-01"), // Soft-deleted line
            },
          ],
        },
        // VOID order (Should be excluded)
        {
          id: 102,
          status: "VOID",
          totalAmount: "500.00",
          salesOrderItems: [
            {
              id: 3,
              combinationId: 52,
              quantity: "1",
              originalPrice: "500.00",
              deletedAt: null,
            },
          ],
        },
      ];

      vi.spyOn(db.query.salesOrders, "findMany").mockResolvedValue(mockOrders as any);

      const result = await reportsServerService.getProfitSummary();

      // Active order 101: totalSales = 1000, active item cost = 2 * 200 = 400.
      // Soft-deleted item (3 * 100 = 300) and VOID order 102 must NOT be included.
      expect(result.totalSales).toBe(1000);
      expect(result.estimatedCost).toBe(400);
      expect(result.netProfit).toBe(600);
    });
  });

  describe("supplierServerService.getByProductId", () => {
    it("should pass isNull(tbl.deletedAt) when fetching product combinations", async () => {
      let whereFilterPassed: any = null;

      vi.spyOn(db.query.productCombinations, "findMany").mockImplementation((args: any) => {
        whereFilterPassed = args?.where;
        return Promise.resolve([{ id: 123 }]) as any;
      });

      vi.spyOn(db.query.goodReceiptLines, "findMany").mockResolvedValue([]);

      await supplierServerService.getByProductId(456);

      expect(whereFilterPassed).toBeDefined();

      const dummyTable = {
        productId: "productId",
        deletedAt: "deletedAt",
      };
      const dummyHelpers = {
        eq: (col: any, val: any) => ({ type: "eq", col, val }),
        and: (...conditions: any[]) => ({ type: "and", conditions }),
        isNull: (col: any) => ({ type: "isNull", col }),
      };

      const filterResult = whereFilterPassed(dummyTable, dummyHelpers);
      const isNullDeletedAtIncluded = JSON.stringify(filterResult).includes("isNull");
      expect(isNullDeletedAtIncluded).toBe(true);
    });
  });

  describe("salesServerService returnExchange soft-delete safety", () => {
    it("should configure salesOrderItems relation with isNull(deletedAt) filter", async () => {
      let withConfig: any = null;

      vi.spyOn(salesServerService, "get").mockResolvedValue({ id: 99 } as any);

      vi.spyOn(db, "transaction").mockImplementation(async (callback: any) => {
        const mockTx = {
          query: {
            salesOrders: {
              findFirst: async (options: any) => {
                withConfig = options?.with;
                return {
                  id: 99,
                  status: "COMPLETED",
                  salesOrderItems: [],
                };
              },
            },
          },
          insert: () => ({
            values: () => ({
              returning: async () => [{ id: 1 }],
            }),
          }),
          update: () => ({
            set: () => ({
              where: async () => {},
            }),
          }),
        };
        return await callback(mockTx);
      });

      await salesServerService.returnExchange(99, [], [], "test");

      expect(withConfig).toBeDefined();
      expect(typeof withConfig?.salesOrderItems?.where).toBe("function");

      const dummyHelpers = {
        isNull: (col: any) => ({ type: "isNull", col }),
      };
      const whereRes = withConfig.salesOrderItems.where(
        { deletedAt: "deletedAt" },
        dummyHelpers,
      );
      expect(whereRes).toEqual({ type: "isNull", col: "deletedAt" });
    });
  });
});
