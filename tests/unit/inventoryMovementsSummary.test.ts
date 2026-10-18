import { describe, expect, it, vi } from "vitest";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { db } from "@/server/db/drizzle";
import { INVENTORY_MOVEMENT_TYPE } from "@/constants";

describe("inventoryServerService.getMovements Summary (Unit)", () => {
  it("skips summary aggregation when includeSummary is omitted or false", async () => {
    vi.spyOn(db, "select").mockImplementation(() => {
      return {
        from: () => ({
          where: () => Promise.resolve([{ total: 5 }]),
        }),
      } as any;
    });

    vi.spyOn(db.query.inventoryMovements, "findMany").mockResolvedValue([
      {
        id: 1,
        type: INVENTORY_MOVEMENT_TYPE.IN,
        quantity: "10.000000",
        costPerUnit: "100.000000",
        totalCost: "1000.000000",
        updatedAt: new Date(),
      },
    ] as any);

    const result = await inventoryServerService.getMovements({ page: 1, limit: 10 });

    expect(result.data.length).toBe(1);
    expect(result.summary).toBeUndefined();
  });

  it("calculates inbound, outbound, and net metrics when includeSummary is true", async () => {
    vi.spyOn(db, "select").mockImplementation((fields: any) => {
      // If selecting count
      if (fields?.total) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ total: 2 }]),
          }),
        } as any;
      }
      // If selecting summary metrics
      return {
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                inboundQuantity: "15.000000",
                inboundValue: "1500.000000",
                outboundQuantity: "5.000000",
                outboundValue: "500.000000",
              },
            ]),
        }),
      } as any;
    });

    vi.spyOn(db.query.inventoryMovements, "findMany").mockResolvedValue([] as any);

    const result = await inventoryServerService.getMovements({
      includeSummary: true,
      page: 1,
      limit: 10,
    });

    expect(result.summary).toBeDefined();
    expect(result.summary?.inbound.quantity).toBe(15);
    expect(result.summary?.inbound.value).toBe(1500);
    expect(result.summary?.outbound.quantity).toBe(5);
    expect(result.summary?.outbound.value).toBe(500);
    expect(result.summary?.net.quantity).toBe(10);
    expect(result.summary?.net.value).toBe(1000);
  });

  it("does not exclude ADJUSTMENT_OUT when filtering by ADJUSTMENT_OUT", async () => {
    let capturedWhereClause: any = null;

    vi.spyOn(db, "select").mockImplementation((fields: any) => {
      if (fields?.total) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ total: 1 }]),
          }),
        } as any;
      }
      return {
        from: () => ({
          where: (whereClause: any) => {
            capturedWhereClause = whereClause;
            return Promise.resolve([
              {
                inboundQuantity: "0",
                inboundValue: "0",
                outboundQuantity: "3.000000",
                outboundValue: "300.000000",
              },
            ]);
          },
        }),
      } as any;
    });

    vi.spyOn(db.query.inventoryMovements, "findMany").mockResolvedValue([] as any);

    const result = await inventoryServerService.getMovements({
      type: INVENTORY_MOVEMENT_TYPE.ADJUSTMENT_OUT,
      includeSummary: true,
    });

    expect(result.summary).toBeDefined();
    expect(result.summary?.outbound.quantity).toBe(3);
    expect(result.summary?.outbound.value).toBe(300);
    expect(result.summary?.net.quantity).toBe(-3);
    expect(result.summary?.net.value).toBe(-300);
  });
});
