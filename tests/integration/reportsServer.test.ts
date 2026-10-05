import { INVENTORY_MOVEMENT_TYPE } from "@/types/definitions";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { Inventory, ProductCombination } from "@/server/models";
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
    const result = await reportsServerService.getNoSales({
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
    const result = await reportsServerService.getNoSales({
      limit: 10,
      page: 1,
    } as any);

    // Assert: draftCombo should be included because no RECEIVED sale exists; zeroStockCombo excluded
    expect(result.data).toHaveLength(1);
    const record: any = result.data[0];
    expect(record.id).toBe(draftCombo.id);
    expect(Number(record.inventory.quantity)).toBe(8);
  });
});


