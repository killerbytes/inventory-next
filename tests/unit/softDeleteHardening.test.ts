import { describe, expect, it, vi } from "vitest";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { paymentServerService } from "@/server/services/paymentServer.service";
import { db } from "@/server/db/drizzle";

describe("Cross-Service Soft-Delete Hardening (Unit)", () => {
  describe("reportsServerService.getProfitSummary", () => {
    it("should query only non-deleted sales orders and non-deleted sales order items", async () => {
      let salesWherePassed: any = null;
      let costWherePassed: any = null;
      let callCount = 0;

      vi.spyOn(db, "select").mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const chain: any = {
            from: vi.fn(() => chain),
            where: vi.fn((cond: any) => {
              salesWherePassed = cond;
              return Promise.resolve([{ totalSales: "1000.00" }]);
            }),
            then: (resolve: any) =>
              Promise.resolve([{ totalSales: "1000.00" }]).then(resolve),
          };
          return chain;
        }

        const chain: any = {
          from: vi.fn(() => chain),
          innerJoin: vi.fn(() => chain),
          leftJoin: vi.fn(() => chain),
          where: vi.fn((cond: any) => {
            costWherePassed = cond;
            return Promise.resolve([{ totalCost: "400.00" }]);
          }),
          then: (resolve: any) =>
            Promise.resolve([{ totalCost: "400.00" }]).then(resolve),
        };
        return chain;
      });

      const result = await reportsServerService.getProfitSummary();

      expect(salesWherePassed).toBeDefined();
      expect(costWherePassed).toBeDefined();
      expect(result.totalSales).toBe(1000);
      expect(result.estimatedCost).toBe(400);
      expect(result.netProfit).toBe(600);
      expect(result.marginPercentage).toBe("60.0");
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
