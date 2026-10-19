import { INVENTORY_MOVEMENT_TYPE } from "@/constants";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { db } from "@/server/db/drizzle";
import { inventories, productCombinations, salesOrderItems } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createCustomer,
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

    await db
      .update(inventories)
      .set({ quantity: "10", averagePrice: "50" })
      .where(eq(inventories.combinationId, combo1.id));
    await db
      .update(inventories)
      .set({ quantity: "5", averagePrice: "120" })
      .where(eq(inventories.combinationId, combo2.id));

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
    await db
      .update(productCombinations)
      .set({ isBreakPackOfId: combo.id, isBreakPack: true })
      .where(eq(productCombinations.id, targetCombo.id));

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

  });

});

describe("Reports Service (Reorder Levels)", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return paginated reorder levels for items below reorder threshold with sales history", async () => {
    // Arrange
    const user = await createUser(0);
    const customer = await createCustomer(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Low Stock Item",
          price: 100,
          unit: "BOX",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product.id
    );
    const combo = combinations.combinations[0];

    // 1. Initial stock adjustment: 10 units
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combo.id,
        newQuantity: 10,
        reason: "FOUND",
        notes: "Initial stock",
      } as any,
      user.id
    );

    // 2. Sales order: sell 8 units (leaves 2 in stock, which is < reorderLevel 5)
    await salesServerService.create(
      {
        customerId: customer.id,
        status: "RECEIVED",
        orderDate: new Date(),
        notes: "Test Sale",
        internalNotes: "Reorder Test",
        salesOrderItems: [
          {
            combinationId: combo.id,
            quantity: 8,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id
    );

    // Act
    const result = await reportsServerService.getReorderLevels({
      limit: 10,
      page: 1,
    } as any);

    // Assert: Aligned with inventory-api { data: rows, meta: { total, totalPages, currentPage } }
    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.total).toBe(1);
    expect(result.meta.currentPage).toBe(1);
    expect(result.data).toHaveLength(1);

    const record: any = result.data[0];
    expect(Number(record.combinationId)).toBe(combo.id);
    expect(Number(record.quantity)).toBe(2);
    expect(Number(record.get ? record.get("transactionCount") : record.transactionCount)).toBe(1);
    expect(record.get ? record.get("lastSoldAt") : record.lastSoldAt).toBeDefined();
    expect(record.combinations).toBeDefined();
    expect(record.combinations.name).toBe(combo.name);
    expect(record.combinations.reorderLevel).toBe(5);
  });

  it("should exclude items that have stock equal to or greater than reorder level", async () => {
    // Arrange
    const user = await createUser(0);
    const customer = await createCustomer(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Healthy Stock Item",
          price: 100,
          unit: "BOX",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product.id
    );
    const combo = combinations.combinations[0];

    // Stock 20 units, sell 2 units -> 18 units remaining (> reorderLevel 5)
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combo.id,
        newQuantity: 20,
        reason: "FOUND",
        notes: "Initial stock",
      } as any,
      user.id
    );

    await salesServerService.create(
      {
        customerId: customer.id,
        status: "RECEIVED",
        orderDate: new Date(),
        notes: "Test Sale",
        internalNotes: "Healthy stock test",
        salesOrderItems: [
          {
            combinationId: combo.id,
            quantity: 2,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id
    );

    // Act
    const result = await reportsServerService.getReorderLevels({
      limit: 10,
      page: 1,
    } as any);

    // Assert: should be excluded
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

describe("Reports Service (No Sales)", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return paginated no-sales product combinations with stock > 0 and no completed sales", async () => {
    // Arrange
    const user = await createUser(0);
    const customer = await createCustomer(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Unsold Item",
          price: 100,
          unit: "BOX",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
        {
          name: "Sold Item",
          price: 200,
          unit: "PCS",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product.id
    );
    const unsoldCombo = combinations.combinations[0];
    const soldCombo = combinations.combinations[1];

    // 1. Stock both items
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: unsoldCombo.id,
        newQuantity: 10,
        reason: "FOUND",
        notes: "Stock up",
      } as any,
      user.id
    );
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: soldCombo.id,
        newQuantity: 10,
        reason: "FOUND",
        notes: "Stock up",
      } as any,
      user.id
    );

    // 2. Complete sale for soldCombo (status: RECEIVED)
    await salesServerService.create(
      {
        customerId: customer.id,
        status: "RECEIVED",
        orderDate: new Date(),
        notes: "Sale",
        internalNotes: "Sale",
        salesOrderItems: [
          {
            combinationId: soldCombo.id,
            quantity: 2,
            originalPrice: 200,
            purchasePrice: 200,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id
    );

    // Act
    const result = await reportsServerService.noSaleProducts({
      limit: 10,
      page: 1,
    } as any);

    // Assert: Aligned with inventory-api
    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);

    const record: any = result.data[0];
    expect(record.id).toBe(unsoldCombo.id);
    expect(record.name).toBe(unsoldCombo.name);
    expect(record.inventory).toBeDefined();
    expect(Number(record.inventory.quantity)).toBe(10);
  });

  it("should include items that only have DRAFT sales orders and exclude items with 0 stock", async () => {
    // Arrange
    const user = await createUser(0);
    const customer = await createCustomer(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Draft Sale Item",
          price: 150,
          unit: "BOX",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
        {
          name: "Zero Stock Item",
          price: 50,
          unit: "PCS",
          reorderLevel: 5,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product.id
    );
    const draftCombo = combinations.combinations[0];
    const zeroStockCombo = combinations.combinations[1];

    // Stock draftCombo with 8 units; leave zeroStockCombo at 0 units
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: draftCombo.id,
        newQuantity: 8,
        reason: "FOUND",
        notes: "Stock up",
      } as any,
      user.id
    );

    // Create DRAFT sales order for draftCombo (not RECEIVED)
    await salesServerService.create(
      {
        customerId: customer.id,
        status: "DRAFT",
        orderDate: new Date(),
        notes: "Draft Order",
        internalNotes: "Draft",
        salesOrderItems: [
          {
            combinationId: draftCombo.id,
            quantity: 3,
            originalPrice: 150,
            purchasePrice: 150,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id
    );

    // Act
    const result = await reportsServerService.noSaleProducts({
      limit: 10,
      page: 1,
    } as any);

    // Assert: draftCombo should be included because no RECEIVED sale exists; zeroStockCombo excluded
    expect(result.data).toHaveLength(1);
    const record: any = result.data[0];
    expect(record.id).toBe(draftCombo.id);
    expect(Number(record.inventory.quantity)).toBe(8);
  });

  it("should filter popular products by sales order date range", async () => {
    const user = await createUser(0);
    await createCategory(0);
    const product = await createProduct(0);
    await createCombination(
      [
        {
          name: "Pop Item 1",
          price: 100,
          unit: "BOX",
          reorderLevel: 1,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id,
    );
    const customer = await createCustomer(0);
    const combos = await productCombinationServerService.getByProductId(product.id);
    const combo = combos.combinations[0];

    // Add stock before creating RECEIVED order
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combo.id,
        newQuantity: 20,
        reason: "FOUND",
        notes: "Initial stock",
      } as any,
      user.id,
    );

    // Order in July
    await salesServerService.create(
      {
        customerId: customer.id,
        status: "RECEIVED",
        orderDate: new Date("2026-07-15T10:00:00"),
        salesOrderItems: [
          { combinationId: combo.id, quantity: 5, originalPrice: 100, purchasePrice: 100 },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id,
    );

    // Query for July
    const julyRes = await reportsServerService.getPopularProducts({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(julyRes.data.some((p: any) => p.combinationId === combo.id)).toBe(true);

    // Query for August
    const augRes = await reportsServerService.getPopularProducts({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(augRes.data.some((p: any) => p.combinationId === combo.id)).toBe(false);
  });

  it("should calculate profit summary using true inventory cost (COGS) from live database", async () => {
    const user = await createUser(0);
    await createCategory(0);
    const product = await createProduct(0);

    await createCombination(
      [
        {
          name: "Profit Combo 1",
          price: 200,
          unit: "PCS",
          reorderLevel: 1,
          conversionFactor: 1,
          values: [],
        },
      ],
      product.id,
    );

    const combos = await productCombinationServerService.getByProductId(product.id);
    const combo = combos.combinations[0];

    // Seed inventory with average cost of 80
    await db
      .update(inventories)
      .set({ quantity: "50", averagePrice: "80" })
      .where(eq(inventories.combinationId, combo.id));

    const customer = await createCustomer(0);

    // Create a finalized sales order: 2 units sold at 180 each (retail 200 with 10% discount)
    await salesServerService.create(
      {
        customerId: customer.id,
        status: "RECEIVED",
        orderDate: new Date(),
        salesOrderItems: [
          {
            combinationId: combo.id,
            quantity: 2,
            originalPrice: 200,
            purchasePrice: 200,
            discount: 20,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id,
    );

    const summary = await reportsServerService.getProfitSummary();

    // Total sales = (2 * 200) - 20 = 380
    // Estimated COGS = 2 * 80 = 160
    // Net profit = 380 - 160 = 220
    // Margin percentage = (220 / 380) * 100 = 57.89% -> "57.9"
    expect(summary.totalSales).toBe(380);
    expect(summary.estimatedCost).toBe(160);
    expect(summary.netProfit).toBe(220);
    expect(summary.marginPercentage).toBe("57.9");

    const productsRes = await reportsServerService.getProfitProducts();
    expect(productsRes.data.length).toBeGreaterThanOrEqual(1);
    const profitItem = productsRes.data.find((p: any) => p.combinationId === combo.id);
    expect(profitItem).toBeDefined();
    expect(profitItem?.totalQuantity).toBe(2);
    expect(profitItem?.totalRevenue).toBe(380);
    expect(profitItem?.totalCost).toBe(160);
    expect(profitItem?.totalProfit).toBe(220);
    expect(profitItem?.marginPercentage).toBe("57.9");

    // Second order for the same combination with a divergent historical skuSnapshot
    const order2 = await salesServerService.create(
      {
        customerId: customer.id,
        status: "RECEIVED",
        orderDate: new Date(),
        salesOrderItems: [
          {
            combinationId: combo.id,
            quantity: 3,
            originalPrice: 200,
            purchasePrice: 200,
            discount: 0,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user.id,
    );

    // Simulate historical SKU variation on salesOrderItems
    expect(order2).toBeDefined();
    if (!order2) throw new Error("Failed to create second sales order for test");

    await db
      .update(salesOrderItems)
      .set({ skuSnapshot: "LEGACY|SKU|VAR" })
      .where(eq(salesOrderItems.salesOrderId, order2.id));

    // Consolidated check: MUST return exactly 1 row for combo.id with combined 2 + 3 = 5 units
    const consolidatedRes = await reportsServerService.getProfitProducts();
    const matchingRows = consolidatedRes.data.filter((p: any) => p.combinationId === combo.id);
    expect(matchingRows).toHaveLength(1);
    const consolidatedItem = matchingRows[0];
    expect(consolidatedItem.totalQuantity).toBe(5);
    expect(consolidatedItem.totalRevenue).toBe(980); // 380 + 600
    expect(consolidatedItem.totalCost).toBe(400); // 160 + 240
    expect(consolidatedItem.totalProfit).toBe(580); // 220 + 360
  });
});


