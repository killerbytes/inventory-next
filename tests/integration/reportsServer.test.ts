import { INVENTORY_MOVEMENT_TYPE } from "@/types/definitions";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { Inventory, ProductCombination } from "@/server/models";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createProduct,
  createUser,
} from "../utils/fixtures";

describe("Reports Service (Inventory Value)", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return the total value of inventory from current state", async () => {
    await createUser(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Item 1",
          price: 100,
          unit: "BOX",
          reorderLevel: 1,
          conversionFactor: 1,
          values: [],
        },
        {
          name: "Item 2",
          price: 200,
          unit: "PCS",
          reorderLevel: 1,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product.id
    );
    const combo1 = combinations.combinations[0];
    const combo2 = combinations.combinations[1];

    await Inventory.update(
      { quantity: 10, averagePrice: 50 },
      { where: { combinationId: combo1.id } }
    );
    await Inventory.update(
      { quantity: 5, averagePrice: 120 },
      { where: { combinationId: combo2.id } }
    );

    const result = await reportsServerService.getInventoryValue();
    expect(result.totalValue).toBe(1100);
  });

  it("should return the total value of inventory from movements", async () => {
    await createUser(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Item 1",
          price: 100,
          unit: "BOX",
          reorderLevel: 1,
          conversionFactor: 1,
          values: [],
        },
        {
          name: "Item 1 (Smaller)",
          price: 10,
          unit: "PCS",
          reorderLevel: 1,
          conversionFactor: 0.1, // 10 pcs = 1 box
          values: [],
        },
      ],
      product.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product.id
    );
    const combo = combinations.combinations[0];
    const targetCombo = combinations.combinations[1];

    // Set relationship
    await ProductCombination.update(
      { isBreakPackOfId: combo.id, isBreakPack: true },
      { where: { id: targetCombo.id } }
    );

    // 1. IN: 10 units @ 100 = 1000
    await inventoryServerService.inventoryIncrease(
      { combinationId: combo.id, quantity: 10, averagePrice: 100 },
      INVENTORY_MOVEMENT_TYPE.IN,
      1,
      "GOOD_RECEIPT"
    );

    // 2. OUT: 3 units (cost was 100) = -300
    await inventoryServerService.inventoryDecrease(
      { combinationId: combo.id, quantity: 3 },
      INVENTORY_MOVEMENT_TYPE.OUT,
      1,
      "SALES_ORDER"
    );

    // 3. ADJUSTMENT: +2 units (cost is 100) = +200
    await productCombinationServerService.stockAdjustment({
      combinationId: combo.id,
      newQuantity: 9, // was 10-3=7, so diff is +2
      reason: "FOUND",
      notes: "test",
    } as any);

    // 4. BREAK_PACK: Move 1 unit to a smaller pack (conversion factor 10)
    if (targetCombo) {
      await productCombinationServerService.breakPack({
        fromCombinationId: combo.id,
        quantity: 1,
        toCombinationId: targetCombo.id,
      } as any);
      // 1 unit of Item 1 ($100) is removed.
      // 10 units of Item 1 (Smaller) ($10 each) are added.
      // Net change to total warehouse value: $0.
    }

    const result = await reportsServerService.getInventoryValueFromMovements();
    expect(result.totalValue).toBe(900);

    // Also verify it matches the standard value
    const standardResult = await reportsServerService.getInventoryValue();
    expect(standardResult.totalValue).toBe(900);
  });

  it("should return 0 if inventory is empty", async () => {
    const result = await reportsServerService.getInventoryValue();
    expect(result.totalValue).toBe(0);
  });
});
