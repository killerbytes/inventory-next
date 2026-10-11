// @vitest-environment node
import { INVENTORY_MOVEMENT_TYPE } from "@/constants";
import { db, pool } from "@/server/db/drizzle";
import { inventoryMovements, priceHistories } from "@/server/db/schema";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createProduct,
  createUser,
} from "../utils/fixtures";

describe("Inventory Movements & Parity Integration Tests", () => {
  let user: any;
  let product: any;
  let combination: any;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user = await createUser(0);
    await createCategory(0);
    product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Parity Test Item",
          price: 100,
          unit: "PCS",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id
    );
    const combos = await productCombinationServerService.getByProductId(product.id);
    combination = combos.combinations[0];
  });

  it("should exclude ADJUSTMENT_OUT from totalAmount and totalQuantity in getMovements summary", async () => {
    // 1. Create an IN movement (qty: 10, totalCost: 1000)
    await db.insert(inventoryMovements).values({
      combinationId: combination.id,
      userId: user.id,
      type: INVENTORY_MOVEMENT_TYPE.IN,
      quantity: "10",
      totalCost: "1000",
      referenceType: "GOOD_RECEIPT",
      referenceId: 101,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Create an ADJUSTMENT_OUT movement (qty: 3, totalCost: 300)
    await db.insert(inventoryMovements).values({
      combinationId: combination.id,
      userId: user.id,
      type: INVENTORY_MOVEMENT_TYPE.ADJUSTMENT_OUT,
      quantity: "3",
      totalCost: "300",
      referenceType: "STOCK_ADJUSTMENT",
      referenceId: 102,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    const result = await inventoryServerService.getMovements();

    // Assert: rows contain both movements
    expect(result.data.length).toBe(2);
    expect(result.meta.total).toBe(2);

    // Assert summary: ADJUSTMENT_OUT must be excluded from totals for warehouse volume parity
    expect(Number(result.summary.totalQuantity.value)).toBe(10);
    expect(Number(result.summary.totalValue.value)).toBe(1000);

    // Assert that updatedAt and cost fields are present for alignment with inventory-react
    expect(result.data[0].updatedAt).toBeDefined();
    expect(result.data[0].totalCost).toBeDefined();
  });

  it("should accurately paginate and return distinct counts in getMovements", async () => {
    for (let i = 1; i <= 5; i++) {
      await db.insert(inventoryMovements).values({
        combinationId: combination.id,
        userId: user.id,
        type: INVENTORY_MOVEMENT_TYPE.IN,
        quantity: String(i),
        totalCost: String(i * 50),
        referenceType: "GOOD_RECEIPT",
        referenceId: 200 + i,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const page1 = await inventoryServerService.getMovements({ limit: 2, page: 1 });
    expect(page1.data.length).toBe(2);
    expect(page1.meta.total).toBe(5);
    expect(page1.meta.totalPages).toBe(3);
    expect(page1.meta.currentPage).toBe(1);

    const page3 = await inventoryServerService.getMovements({ limit: 2, page: 3 });
    expect(page3.data.length).toBe(1);
    expect(page3.meta.currentPage).toBe(3);
  });

  it("should accurately paginate and return distinct counts in getPriceHistory", async () => {
    for (let i = 1; i <= 3; i++) {
      await db.insert(priceHistories).values({
        productId: product.id,
        combinationId: combination.id,
        fromPrice: String(100 * i),
        toPrice: String(120 * i),
        changedBy: user.id,
        changedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const result = await inventoryServerService.getPriceHistory({ limit: 2, page: 1 });
    expect(result.data.length).toBe(2);
    expect(result.meta.total).toBe(3);
    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.currentPage).toBe(1);
    expect((result.data[0] as any).combination?.name).toBe(combination.name);
  });

  it("should filter movements by date range with timezone boundary safety", async () => {
    // Arrange: Movement in July
    const [mJuly] = await db.insert(inventoryMovements).values({
      combinationId: combination.id,
      userId: user.id,
      type: INVENTORY_MOVEMENT_TYPE.IN,
      quantity: "5",
      totalCost: "500",
      referenceType: "GOOD_RECEIPT",
      referenceId: 301,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await pool.query(
      `UPDATE "InventoryMovements" SET "updatedAt" = '2026-07-31 10:00:00+08' WHERE id = $1`,
      [mJuly.id],
    );

    // Movement in August
    const [mAugust] = await db.insert(inventoryMovements).values({
      combinationId: combination.id,
      userId: user.id,
      type: INVENTORY_MOVEMENT_TYPE.IN,
      quantity: "10",
      totalCost: "1000",
      referenceType: "GOOD_RECEIPT",
      referenceId: 302,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await pool.query(
      `UPDATE "InventoryMovements" SET "updatedAt" = '2026-08-01 00:00:00+08' WHERE id = $1`,
      [mAugust.id],
    );

    // Act
    const result = await inventoryServerService.getMovements({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    // Assert
    const ids = result.data.map((m: any) => m.id);
    expect(ids).toContain(mJuly.id);
    expect(ids).not.toContain(mAugust.id);
  });
});
