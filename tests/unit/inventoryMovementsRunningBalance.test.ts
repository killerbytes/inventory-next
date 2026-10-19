import { describe, expect, it, vi } from "vitest";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { db } from "@/server/db/drizzle";
import { INVENTORY_MOVEMENT_TYPE } from "@/constants";

describe("inventoryServerService.getMovements Running Balance (Unit)", () => {
  it("attaches runningBalance to each formatted row accurately", async () => {
    // Mock count query
    vi.spyOn(db, "select").mockImplementation((fields: any) => {
      // If selecting count
      if (fields?.total) {
        return {
          from: () => ({
            where: () => Promise.resolve([{ total: 2 }]),
          }),
        } as any;
      }
      // If selecting running balances
      return {
        from: () => ({
          where: () =>
            Promise.resolve([
              { id: 101, balance: "50.000000" },
              { id: 102, balance: "35.000000" },
            ]),
        }),
      } as any;
    });

    vi.spyOn(db.query.inventoryMovements, "findMany").mockResolvedValue([
      {
        id: 101,
        combinationId: 1,
        type: INVENTORY_MOVEMENT_TYPE.IN,
        quantity: "50.000000",
        costPerUnit: "10.000000",
        totalCost: "500.000000",
        updatedAt: new Date("2026-03-01T10:00:00Z"),
      },
      {
        id: 102,
        combinationId: 1,
        type: INVENTORY_MOVEMENT_TYPE.OUT,
        quantity: "-15.000000",
        costPerUnit: "10.000000",
        totalCost: "-150.000000",
        updatedAt: new Date("2026-03-02T10:00:00Z"),
      },
    ] as any);

    const result = await inventoryServerService.getMovements({ page: 1, limit: 10 });

    expect(result.data.length).toBe(2);
    expect(result.data[0].runningBalance).toBe(50);
    expect(result.data[1].runningBalance).toBe(35);
  });
});
