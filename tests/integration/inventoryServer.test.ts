// @vitest-environment node
import { normalize } from "@/lib/compute";
import {
  Category,
  Customer,
  Inventory,
  InventoryMovement,
  Product,
  ProductCombination,
  Supplier,
  User,
  VariantType,
  VariantValue,
} from "@/server/models";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createCustomer,
  createProduct,
  createSupplier,
  createUser,
  createVariantType,
} from "../utils/fixtures";

describe("Inventory Service & Concurrency Integration Tests", () => {
  let user0: User;
  let user1: User;
  let category0: Category;
  let category1: Category;
  let product0: Product;
  let product1: Product;
  let variantType0: VariantType;
  let supplier0: Supplier;
  let customer0: Customer;
  let combination1: ProductCombination;
  let combination2: ProductCombination;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser(0);
    user1 = await createUser(1);
    category0 = await createCategory(0);
    category1 = await createCategory(1);
    product0 = await createProduct(0);
    product1 = await createProduct(1);
    variantType0 = await createVariantType(0);
    supplier0 = await createSupplier(0);
    customer0 = await createCustomer(0);

    await createCombination(
      [
        {
          name: "Shovel - Red",
          price: 100,
          unit: "BOX",
          reorderLevel: 1,
          conversionFactor: 2.5,
          values: [
            {
              value: "Red",
              variantTypeId: variantType0.id,
            },
          ],
        },
        {
          name: "Shovel - Red PCS",
          price: 100,
          unit: "PCS",
          reorderLevel: 1,
          conversionFactor: 1,
          isBreakPackOfId: 1,
          values: [
            {
              value: "Red",
              variantTypeId: variantType0.id,
            },
          ],
        },
      ],
      product0.id,
      user0.id,
    );

    const combos = await ProductCombination.findAll({
      where: { productId: product0.id },
    });
    combination1 = combos.find((c) => c.unit === "BOX")!;
    combination2 = combos.find((c) => c.unit === "PCS")!;
  });

  it("should list inventory movements", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combination1.id,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );

    await productCombinationServerService.breakPack(
      {
        fromCombinationId: combination1.id,
        quantity: 1,
        toCombinationId: combination2.id,
      },
      user0.id,
    );

    const inventoryMovements = await inventoryServerService.getMovements({
      order: "ASC",
    });

    expect(inventoryMovements.data.length).toBe(3);
    expect(inventoryMovements.data[0].combinationId).toBe(combination1.id);
    expect(inventoryMovements.data[0].type).toBe("ADJUSTMENT_IN");
    expect(inventoryMovements.data[1].combinationId).toBe(combination1.id);
    expect(inventoryMovements.data[1].type).toBe("BREAK_PACK_OUT");
    expect(inventoryMovements.data[2].combinationId).toBe(combination2.id);
    expect(inventoryMovements.data[2].type).toBe("BREAK_PACK_IN");
  });

  it("should list break packs", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combination1.id,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );

    await productCombinationServerService.breakPack(
      {
        fromCombinationId: combination1.id,
        quantity: 1,
        toCombinationId: combination2.id,
      },
      user0.id,
    );

    const inventory = await Inventory.findAll();
    const inv1 = inventory.find((i) => i.combinationId === combination1.id);
    const inv2 = inventory.find((i) => i.combinationId === combination2.id);

    expect(inventory.length).toBe(2);
    expect(inv1).toBeDefined();
    expect(Number(inv1?.quantity)).toBe(9);
    expect(inv2).toBeDefined();
    expect(Number(inv2?.quantity)).toBe(2.5);
  });

  it("should list stock adjustments", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combination1.id,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );

    const stockAdjustments = await reportsServerService.getStockAdjustments();

    expect(stockAdjustments.length).toBe(1);
    expect(stockAdjustments[0].combinationId).toBe(combination1.id);
    expect(Number(stockAdjustments[0].systemQuantity)).toBe(0);
    expect(Number(stockAdjustments[0].newQuantity)).toBe(10);
    expect(Number(stockAdjustments[0].difference)).toBe(10);
    expect(stockAdjustments[0].reason).toBe("EXPIRED");
    expect(stockAdjustments[0].notes).toBe("test");
    expect(stockAdjustments[0].createdAt).toBeInstanceOf(Date);
    expect(stockAdjustments[0].createdBy).toBe(user0.id);
  });

  it("should PO and SO then Cancel Order", async () => {
    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
          {
            combinationId: combination2.id,
            quantity: 20,
            discount: 10,
            purchasePrice: 200,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      1,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
            discount: 5,
          },
        ],
      },
      user0.id,
    );

    const movements = await InventoryMovement.findAll();
    const costPerUnit0 = normalize((10 * 100 - 5) / 10);

    expect(movements.length).toBe(1);
    expect(movements[0].combinationId).toBe(combination1.id);
    expect(movements[0].type).toBe("IN");
    expect(Number(movements[0].quantity)).toBe(10);
    expect(costPerUnit0).toBe(99.5);
    expect(Number(movements[0].costPerUnit)).toBe(costPerUnit0);
    expect(Number(movements[0].totalCost)).toBe(costPerUnit0 * 10);
    expect(movements[0].referenceId).toBe(1);
    expect(movements[0].referenceType).toBe("GOOD_RECEIPT");

    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 20,
            discount: 10,
            purchasePrice: 200,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      2,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 20,
            discount: 10,
            purchasePrice: 200,
          },
        ],
      },
      user0.id,
    );

    const costPerUnit = normalize((20 * 200 - 10 + 995) / 30);
    const movements2 = await InventoryMovement.findAll();
    expect(movements2.length).toBe(2);
    expect(movements2[1].combinationId).toBe(combination1.id);
    expect(movements2[1].type).toBe("IN");
    expect(Number(movements2[1].quantity)).toBe(20);
    expect(costPerUnit).toBe(166.1667);
    expect(Number(movements2[1].costPerUnit)).toBe(costPerUnit);
    expect(Number(movements2[1].totalCost)).toBe(costPerUnit * 20);
    expect(movements2[1].referenceId).toBe(2);
    expect(movements2[1].referenceType).toBe("GOOD_RECEIPT");

    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 30,
            purchasePrice: 300,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      3,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 30,
            purchasePrice: 300,
          },
        ],
      },
      user0.id,
    );

    const costPerUnit2 = normalize((costPerUnit * 30 + 30 * 300) / 60);
    const movements3 = await InventoryMovement.findAll();
    expect(movements3.length).toBe(3);
    expect(movements3[2].combinationId).toBe(combination1.id);
    expect(movements3[2].type).toBe("IN");
    expect(Number(movements3[2].quantity)).toBe(30);
    expect(costPerUnit2).toBe(233.0833);
    expect(Number(movements3[2].costPerUnit)).toBe(costPerUnit2);
    expect(Number(movements3[2].totalCost)).toBe(costPerUnit2 * 30);
    expect(movements3[2].referenceId).toBe(3);
    expect(movements3[2].referenceType).toBe("GOOD_RECEIPT");

    const inv = await Inventory.findOne({
      where: { combinationId: combination1.id },
    });
    expect(Number(inv?.quantity)).toBe(60);
    expect(Number(inv?.averagePrice)).toBe(costPerUnit2);

    await salesServerService.create(
      {
        customerId: customer0.id,
        status: "RECEIVED",
        orderDate: new Date(),
        notes: "Test Notes",
        internalNotes: "Test Internal Notes",
        salesOrderItems: [
          {
            combinationId: combination1.id,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    const salesOrder = await salesServerService.get(1);
    expect(salesOrder?.status).toBe("RECEIVED");

    const inventory = await Inventory.findAll();
    const inv1 = inventory.find((i) => i.combinationId === combination1.id);
    expect(inventory.length).toBe(2);
    expect(inv1).toBeDefined();
    expect(Number(inv1?.quantity)).toBe(50);

    const movements4 = await InventoryMovement.findAll();
    expect(movements4.length).toBe(4);
    expect(movements4[3].combinationId).toBe(combination1.id);
    expect(movements4[3].type).toBe("OUT");
    expect(Number(movements4[3].quantity)).toBe(-10);
    expect(Number(movements4[3].costPerUnit)).toBe(233.0833);
    expect(Number(movements4[3].totalCost)).toBe(-233.0833 * 10);

    await salesServerService.cancelOrder(1, "Test", user0.id);
    const salesOrder2 = await salesServerService.get(1);
    expect(salesOrder2?.status).toBe("CANCELLED");

    const inventory2 = await Inventory.findOne({
      where: { combinationId: combination1.id },
    });
    expect(Number(inventory2?.quantity)).toBe(60);

    const movements5 = await InventoryMovement.findAll();
    expect(movements5.length).toBe(5);
    expect(movements5[4].combinationId).toBe(combination1.id);
    expect(movements5[4].type).toBe("CANCELLATION");
    expect(Number(movements5[4].quantity)).toBe(10);

    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      4,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "Test Notes",
        internalNotes: "Test Internal Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
        ],
      },
      user0.id,
    );

    const movements6 = await InventoryMovement.findAll();
    const costPerUnit3 = normalize((233.0833 * 60 + 10 * 100) / 70);
    expect(movements6.length).toBe(6);
    expect(movements6[5].combinationId).toBe(combination1.id);
    expect(movements6[5].type).toBe("IN");
    expect(costPerUnit3).toBe(214.0714);
    expect(Number(movements6[5].costPerUnit)).toBe(214.0714);
    expect(Number(movements6[5].totalCost)).toBe(214.0714 * 10);
  });

  it("should list reorder levels", async () => {
    // 1. Add Stock
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combination1.id,
        newQuantity: 10,
        reason: "SUPPLIER_BONUS",
        notes: "Stock up",
      },
      user0.id,
    );

    // 2. Sell to Customer
    await salesServerService.create(
      {
        customerId: customer0.id,
        status: "RECEIVED",
        orderDate: new Date(),
        notes: "Test Notes",
        internalNotes: "Test Internal Notes",
        salesOrderItems: [
          {
            combinationId: combination1.id,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    const reorders = await inventoryServerService.getReordersLevels({
      limit: 10,
      page: 1,
    });

    const found1 = reorders.data.find(
      (r: any) => Number(r.combinationId) === combination1.id,
    );
    expect(found1).toBeDefined();
    expect(Number((found1 as any)?.quantity)).toBe(0);
  });

  it("should list price history", async () => {
    const redVal = await VariantValue.findOne({ where: { value: "Red" } });
    const redId = redVal?.id ?? 1;

    await productCombinationServerService.updateByProductId(
      product0.id,
      [
        {
          id: combination1.id,
          productId: product0.id,
          name: "Shovel - Red",
          price: 150,
          unit: "BOX",
          conversionFactor: 2.5,
          reorderLevel: 1,
          values: [
            {
              id: redId,
              value: "Red",
              variantTypeId: variantType0.id,
            },
          ],
        },
        {
          id: combination2.id,
          productId: product0.id,
          name: "Shovel - Red PCS",
          price: 100,
          unit: "PCS",
          conversionFactor: 1,
          reorderLevel: 1,
          isBreakPackOfId: 1,
          values: [
            {
              id: redId,
              value: "Red",
              variantTypeId: variantType0.id,
            },
          ],
        },
      ],
      user0.id,
    );

    const history = await inventoryServerService.getPriceHistory({
      productId: product0.id,
    });

    expect(history.data.length).toBeGreaterThan(0);
    const change = history.data.find(
      (h: any) =>
        Number(h.combinationId) === combination1.id &&
        Number(h.toPrice) === 150,
    );
    expect(change).toBeDefined();
    expect(Number((change as any)?.fromPrice)).toBe(100);
  });

  it("should include salesOrder.orderDate and goodReceipt.receiptDate in inventory movements", async () => {
    const grDate = new Date("2026-07-16T10:00:00Z");
    const soDate = new Date("2026-07-16T12:00:00Z");

    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: grDate,
        referenceNo: "Test GR",
        internalNotes: "Test GR Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      1,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: grDate,
        referenceNo: "Test GR",
        internalNotes: "Test GR Notes",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
        ],
      },
      user0.id,
    );

    await salesServerService.create(
      {
        customerId: customer0.id,
        status: "RECEIVED",
        orderDate: soDate,
        notes: "Test SO Notes",
        internalNotes: "Test SO Internal Notes",
        salesOrderItems: [
          {
            combinationId: combination1.id,
            quantity: 5,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    const movements = await inventoryServerService.getMovements({
      order: "ASC",
    });

    const grMovement = movements.data.find(
      (m: any) =>
        m.referenceType === "GOOD_RECEIPT" && Number(m.referenceId) === 1,
    );
    console.log(123, JSON.stringify(grMovement, null, 2));

    expect(grMovement).toBeDefined();
    expect(grMovement.goodReceipt).toBeUndefined();
    expect(grMovement.referenceDate).toBeDefined();
    expect(new Date(grMovement.referenceDate).toISOString()).toBe(
      grDate.toISOString(),
    );

    const soMovement = movements.data.find(
      (m: any) =>
        m.referenceType === "SALES_ORDER" && Number(m.referenceId) === 1,
    );
    expect(soMovement).toBeDefined();
    expect(soMovement.salesOrder).toBeUndefined();
    expect(soMovement.referenceDate).toBeDefined();
    expect(new Date(soMovement.referenceDate).toISOString()).toBe(
      soDate.toISOString(),
    );
  });

  it("should correctly update inventory quantity and averagePrice on supplier returns", async () => {
    // 1. Create stock with Good Receipt (10 units @ 100)
    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "GR-1",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      1,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: new Date(),
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 100,
          },
        ],
      },
      user0.id,
    );

    // 2. Adjust inventory with another GR (10 units @ 200)
    await goodReceiptServerService.create(
      {
        supplierId: supplier0.id,
        receiptDate: new Date(),
        referenceNo: "GR-2",
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 200,
          },
        ],
      },
      user0.id,
    );

    await goodReceiptServerService.update(
      2,
      {
        status: "RECEIVED",
        supplierId: supplier0.id,
        receiptDate: new Date(),
        goodReceiptLines: [
          {
            combinationId: combination1.id,
            quantity: 10,
            purchasePrice: 200,
          },
        ],
      },
      user0.id,
    );

    const inventoryBefore = await Inventory.findOne({
      where: { combinationId: combination1.id },
    });
    expect(Number(inventoryBefore?.quantity)).toBe(20);
    expect(Number(inventoryBefore?.averagePrice)).toBe(150);

    // 3. Perform a supplier return of 5 units from first GR
    await goodReceiptServerService.supplierReturns(
      1,
      [
        {
          combinationId: combination1.id,
          quantity: 5,
        } as any,
      ],
      "Defective",
    );

    const inventoryAfter = await Inventory.findOne({
      where: { combinationId: combination1.id },
    });
    expect(Number(inventoryAfter?.quantity)).toBe(15);
    expect(Number(inventoryAfter?.averagePrice)).toBeCloseTo(166.67, 1);

    const latestMovement = await InventoryMovement.findOne({
      where: { combinationId: combination1.id, type: "SUPPLIER_RETURN_OUT" },
      order: [["id", "DESC"]],
    });
    expect(latestMovement).toBeDefined();
    expect(Number(latestMovement?.quantity)).toBe(-5);
  });

  it("should prevent selling more than available stock during concurrent requests", async () => {
    // Stock up with 1 item
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combination1.id,
        newQuantity: 1,
        reason: "OTHER",
        notes: "Setup",
      },
      user0.id,
    );

    const createOrderParams = {
      customerId: customer0.id,
      status: "RECEIVED",
      orderDate: new Date(),
      salesOrderItems: [
        {
          combinationId: combination1.id,
          quantity: 1,
          originalPrice: 100,
          purchasePrice: 100,
        },
      ],
      modeOfPayment: "CASH",
    };

    const p1 = salesServerService.create(createOrderParams as any, user0.id);
    const p2 = salesServerService.create(createOrderParams as any, user0.id);

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    const inventory = await Inventory.findOne({
      where: { combinationId: combination1.id },
    });

    expect(Number(inventory?.quantity)).toBeGreaterThanOrEqual(0);

    if (fulfilled.length === 1) {
      expect(Number(inventory?.quantity)).toBe(0);
    }

    expect(fulfilled.length).toBeLessThan(2);
  });
});
