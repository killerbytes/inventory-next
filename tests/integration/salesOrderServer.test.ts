// @vitest-environment node
import { SalesOrderInput } from "@/schemas";
import {
  Customer,
  Inventory,
  InventoryMovement,
  ReturnItem,
  ReturnTransaction,
  User,
} from "@/server/models";
import {
  inventoryServerService,
  productCombinationServerService,
} from "@/server/services";
import { salesServerService } from "@/server/services/salesServer.service";
import { ORDER_STATUS, RETURN_TYPE } from "@/types/definitions";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createCustomer,
  createProduct,
  createSupplier,
  createUpdateGoodReceipt,
  createUser,
  createVariantType,
} from "../utils/fixtures";

describe("Sales Order Service (Integration)", () => {
  let user0: User;
  let customer0: Customer;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser();
    customer0 = await createCustomer();
    await createCategory();
    await createCategory(1);
    await createProduct();
    await createProduct(1);
    await createProduct(2);
    await createVariantType();
    await createSupplier();
    await createCombination();

    await createUpdateGoodReceipt(
      [
        {
          combinationId: 1,
          quantity: 11,
          purchasePrice: 100,
        },
        {
          combinationId: 2,
          quantity: 20,
          discount: 10,
          purchasePrice: 100,
        },
      ],
      user0.id,
    );
  });

  const getTestData = (): SalesOrderInput => ({
    salesOrderNumber: "1",
    customerId: customer0.id,
    orderDate: new Date(),
    notes: "Test Notes",
    status: ORDER_STATUS.DRAFT,
    internalNotes: "Test Internal Notes",
    salesOrderItems: [
      {
        combinationId: 1,
        quantity: 10,
      },
      {
        combinationId: 2,
        quantity: 20,
      },
    ],
    modeOfPayment: "CASH",
  });

  it("should create a sale order", async () => {
    await salesServerService.create(
      { ...getTestData(), status: ORDER_STATUS.DRAFT },
      user0.id,
    );
    const salesOrder = await salesServerService.get(1);

    expect(salesOrder).toBeDefined();
    expect(salesOrder?.customerId).toBe(customer0.id);
    expect(salesOrder?.orderDate).toBeInstanceOf(Date);
    expect(salesOrder?.modeOfPayment).toBe("CASH");
    expect(salesOrder?.notes).toBe("Test Notes");
    expect(salesOrder?.internalNotes).toBe("Test Internal Notes");
    expect(salesOrder?.salesOrderItems?.length).toBe(2);
    expect(Number(salesOrder?.totalAmount)).toBe(3000);
    expect(salesOrder?.status).toBe("DRAFT");
    expect((salesOrder as any)?.salesOrderStatusHistory?.length).toBe(1);
    expect((salesOrder as any)?.salesOrderStatusHistory[0]?.status).toBe(
      "DRAFT",
    );
    expect(
      (salesOrder as any)?.salesOrderStatusHistory[0]?.user?.username,
    ).toBe("alice");
  });

  it("should create a sales order in RECEIVED status", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        status: "RECEIVED",
      } as any,
      user0.id,
    );
    const salesOrder = await salesServerService.get(1);
    const inventory = await Inventory.findAll();

    expect(salesOrder?.status).toBe("RECEIVED");
    expect(inventory.length).toBe(2);
    expect(Number(inventory[0].quantity)).toBe(1);
    expect(Number(inventory[1].quantity)).toBe(0);
  });

  it("should update a sales order", async () => {
    await salesServerService.create(getTestData(), user0.id);
    await salesServerService.update(
      1,
      {
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 11,
            originalPrice: 100,
            purchasePrice: 100,
            discount: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    const salesOrder2 = await salesServerService.get(1);
    expect(salesOrder2?.status).toBe("RECEIVED");
    expect(salesOrder2?.salesOrderItems?.length).toBe(2);
    expect(Number(salesOrder2?.salesOrderItems?.[0]?.discount)).toBe(100);
    expect(Number(salesOrder2?.totalAmount)).toBe(3000);
    expect((salesOrder2 as any)?.salesOrderStatusHistory?.length).toBe(2);

    expect((salesOrder2 as any)?.salesOrderStatusHistory[0]?.status).toBe(
      "RECEIVED",
    );
    expect(
      (salesOrder2 as any)?.salesOrderStatusHistory[0]?.user?.username,
    ).toBe("alice");

    const inv1 = await Inventory.findOne({ where: { combinationId: 1 } });
    expect(Number(inv1?.quantity)).toBe(0);
    const inv2 = await Inventory.findOne({ where: { combinationId: 2 } });
    expect(Number(inv2?.quantity)).toBe(0);
  });

  it("should complete a sales order", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 1,
        newQuantity: 11,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 2,
        newQuantity: 20,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );

    await salesServerService.create(
      {
        ...getTestData(),
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    await salesServerService.update(
      1,
      {
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 11,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    await salesServerService.update(
      1,
      {
        status: "COMPLETED",
      } as any,
      user0.id,
    );

    const salesOrder = await salesServerService.get(1);
    expect(salesOrder?.status).toBe("COMPLETED");
    expect((salesOrder as any)?.salesOrderStatusHistory?.length).toBe(3);
    expect((salesOrder as any)?.salesOrderStatusHistory[0]?.status).toBe(
      "COMPLETED",
    );
    expect(
      (salesOrder as any)?.salesOrderStatusHistory[0]?.user?.username,
    ).toBe("alice");
  });

  it("should cancel a sales order", async () => {
    const inventory = await Inventory.findAll();
    await salesServerService.create(
      {
        ...getTestData(),
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    await salesServerService.update(
      1,
      {
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 11,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    await salesServerService.cancelOrder(
      1,
      "Test Cancellation Reason",
      user0.id,
    );

    const inventory2 = await Inventory.findAll();
    const salesOrder = await salesServerService.get(1);

    expect(salesOrder?.status).toBe("CANCELLED");
    expect(salesOrder?.cancellationReason).toBe("Test Cancellation Reason");
    expect((salesOrder as any)?.salesOrderStatusHistory?.length).toBe(3);
    expect((salesOrder as any)?.salesOrderStatusHistory[0]?.status).toBe(
      "CANCELLED",
    );
    expect(
      (salesOrder as any)?.salesOrderStatusHistory[0]?.user?.username,
    ).toBe("alice");
    expect(inventory2.length).toBe(2);
    expect(Number(inventory2[0].quantity)).toBe(Number(inventory[0].quantity));
    expect(Number(inventory2[1].quantity)).toBe(Number(inventory[1].quantity));
  });

  it("should void a sales order", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 1,
        newQuantity: 11,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );

    await salesServerService.create(
      {
        ...getTestData(),
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    await salesServerService.delete(1, user0.id);
    const salesOrder = await salesServerService.get(1);

    expect(salesOrder?.status).toBe("VOID");
    expect((salesOrder as any)?.salesOrderStatusHistory?.length).toBe(2);
    expect((salesOrder as any)?.salesOrderStatusHistory[0]?.status).toBe(
      "VOID",
    );
    expect(
      (salesOrder as any)?.salesOrderStatusHistory[0]?.user?.username,
    ).toBe("alice");
  });

  it("should not allow deleting a sales order if not in DRAFT status", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        status: ORDER_STATUS.RECEIVED,
      },
      user0.id,
    );

    await expect(salesServerService.delete(1, user0.id)).rejects.toThrow(
      "SalesOrder is not in a valid state",
    );
  });

  it("should throw not found when deleting non-existent sales order", async () => {
    await expect(salesServerService.delete(999999, user0.id)).rejects.toThrow(
      "SalesOrder not found",
    );
  });

  it("should get a paginated list of sales orders", async () => {
    await salesServerService.create(getTestData() as any, user0.id);
    await salesServerService.create(
      {
        ...getTestData(),
        salesOrderNumber: "2",
      } as any,
      user0.id,
    );

    const salesOrders: any = await salesServerService.getAll({
      page: 1,
      limit: 2,
    } as any);

    const items = salesOrders.data || salesOrders.rows;
    expect(items.length).toBe(2);
    expect(salesOrders.meta.total).toBe(2);
    expect(salesOrders.meta.totalPages).toBe(1);
    expect(salesOrders.meta.currentPage).toBe(1);
  });

  it("should not allow quantity to be negative", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 2,
        newQuantity: 2,
        reason: "EXPIRED",
        notes: "test",
      },
      user0.id,
    );

    await salesServerService.create(getTestData() as any, user0.id);

    await expect(
      salesServerService.update(
        1,
        {
          status: "RECEIVED",
          salesOrderItems: [
            {
              combinationId: 1,
              quantity: 11,
              originalPrice: 100,
              purchasePrice: 100,
            },
            {
              combinationId: 2,
              quantity: 20,
              originalPrice: 100,
              purchasePrice: 100,
            },
          ],
          modeOfPayment: "CASH",
        } as any,
        user0.id,
      ),
    ).rejects.toThrow("Quantity is greater than inventory");
  });

  it("should update inventory movements", async () => {
    await salesServerService.create(getTestData() as any, user0.id);
    await salesServerService.update(
      1,
      {
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 11,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
        modeOfPayment: "CASH",
      } as any,
      user0.id,
    );

    const inventoryMovements = await inventoryServerService.getMovements({});
    expect(inventoryMovements.data.length).toBe(4);
    const out1 = inventoryMovements.data.find(
      (m) => m.combinationId === 1 && m.type === "OUT",
    );
    const out2 = inventoryMovements.data.find(
      (m) => m.combinationId === 2 && m.type === "OUT",
    );
    expect(Number(out1?.quantity)).toBe(-11);
    expect(Number(out2?.quantity)).toBe(-20);
  });

  it("should create a sales order for delivery", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        isDelivery: true,
        deliveryAddress: "Test Address",
        deliveryDate: new Date(),
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    const salesOrder = await salesServerService.get(1);
    expect(salesOrder?.isDelivery).toBe(true);
    expect(salesOrder?.deliveryDate).toBeInstanceOf(Date);
    expect(salesOrder?.deliveryAddress).toBe("Test Address");
  });

  it("should create a sales order with bank as payment", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        modeOfPayment: "BANK",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    const saleOrder = await salesServerService.get(1);
    expect(saleOrder?.modeOfPayment).toBe("BANK");
  });

  it("should create a sales order twice", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 3,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 4,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    const salesOrder2 = await salesServerService.get(1);
    expect(salesOrder2?.status).toBe("RECEIVED");
    expect(salesOrder2?.salesOrderItems?.length).toBe(2);
    expect(Number(salesOrder2?.totalAmount)).toBe(700);

    const inv1 = await Inventory.findOne({ where: { combinationId: 1 } });
    expect(Number(inv1?.quantity)).toBe(8);
    const inv2 = await Inventory.findOne({ where: { combinationId: 2 } });
    expect(Number(inv2?.quantity)).toBe(16);

    await salesServerService.create(
      {
        ...getTestData(),
        salesOrderNumber: "2",
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 3,
            originalPrice: 100,
            purchasePrice: 100,
          },
          {
            combinationId: 2,
            quantity: 4,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    const inv = await Inventory.findAll();
    expect(inv.length).toBe(2);
    expect(Number(inv[0].quantity)).toBe(5);
    expect(Number(inv[1].quantity)).toBe(12);
  });

  it("should return item", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
            discount: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    const returns = [
      { combinationId: 1, quantity: 10 },
      { combinationId: 2, quantity: 20 },
    ];

    const inventory = await Inventory.findAll();
    await salesServerService.returnExchange(1, returns, undefined, "reason");
    const inventory2 = await Inventory.findAll();
    const inventoryMovement = await InventoryMovement.findAll();
    const returnTransaction = await ReturnTransaction.findAll();
    const returnItems = await ReturnItem.findAll();

    expect(Number(inventory[0].quantity)).toBe(1);
    expect(Number(inventory[1].quantity)).toBe(0);
    expect(Number(inventory2[0].quantity)).toBe(11);
    expect(Number(inventory2[1].quantity)).toBe(20);
    expect(Number(inventory2[0].averagePrice)).toBe(
      Number(inventory[0].averagePrice),
    );
    expect(Number(inventory2[1].averagePrice)).toBe(
      Number(inventory[1].averagePrice),
    );
    console.log(111, JSON.stringify(returnTransaction, null, 2));

    expect(inventoryMovement.length).toBe(6);
    expect(inventoryMovement[4].id).toBe(5);
    expect(inventoryMovement[4].type).toBe(RETURN_TYPE.RETURN_IN);
    expect(inventoryMovement[4].referenceType).toBe("SALES_ORDER");
    expect(Number(inventoryMovement[4].quantity)).toBe(10);
    expect(Number(inventoryMovement[4].costPerUnit)).toBe(100);
    expect(Number(inventoryMovement[4].totalCost)).toBe(1000);
    expect(inventoryMovement[5].id).toBe(6);
    expect(inventoryMovement[5].type).toBe(RETURN_TYPE.RETURN_IN);
    expect(inventoryMovement[5].referenceType).toBe("SALES_ORDER");
    expect(Number(inventoryMovement[5].quantity)).toBe(20);
    expect(Number(inventoryMovement[5].costPerUnit)).toBe(99.5);
    expect(Number(inventoryMovement[5].totalCost)).toBe(1990);
    expect(returnTransaction.length).toBe(1);
    expect(returnTransaction[0].id).toBe(1);
    expect(returnTransaction[0].sourceType).toBe("SALE");
    expect(returnTransaction[0].type).toBe(RETURN_TYPE.RETURN_IN);
    expect(Number(returnTransaction[0].totalReturnAmount)).toBe(2900);
    expect(Number(returnTransaction[0].paymentDifference)).toBe(-2900);
    expect(returnItems.length).toBe(2);
    expect(returnItems[0].id).toBe(1);
    expect(returnItems[0].returnTransactionId).toBe(1);
    expect(Number(returnItems[0].quantity)).toBe(10);
    expect(Number(returnItems[0].unitPrice)).toBe(90);
    expect(returnItems[0].reason).toBe("reason");
    expect(returnItems[0].combinationId).toBe(1);
    expect(Number(returnItems[0].totalAmount)).toBe(900);
    expect(returnItems[1].id).toBe(2);
    expect(returnItems[1].returnTransactionId).toBe(1);
    expect(Number(returnItems[1].quantity)).toBe(20);
    expect(Number(returnItems[1].unitPrice)).toBe(100);
    expect(returnItems[1].reason).toBe("reason");
    expect(returnItems[1].combinationId).toBe(2);
    expect(Number(returnItems[1].totalAmount)).toBe(2000);
  });

  it("should not allow cancel when having returns", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        status: "RECEIVED",
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
            discount: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    const returns = [
      { combinationId: 1, quantity: 10 },
      { combinationId: 2, quantity: 20 },
    ];
    await salesServerService.returnExchange(
      1,
      returns as any,
      undefined,
      "reason",
    );

    await expect(
      salesServerService.cancelOrder(1, "reason", user0.id),
    ).rejects.toThrow("Cannot cancel order with existing return transactions");
  });

  it("should not allow returns when cancelled", async () => {
    await salesServerService.create(
      {
        ...getTestData(),
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            purchasePrice: 100,
            discount: 100,
          },
          {
            combinationId: 2,
            quantity: 20,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );

    await salesServerService.cancelOrder(1, "reason", user0.id);

    const returns = [
      { combinationId: 1, quantity: 10 },
      { combinationId: 2, quantity: 20 },
    ];

    await expect(
      salesServerService.returnExchange(1, returns as any, undefined, "reason"),
    ).rejects.toThrow("SalesOrder is not in a valid state");
  });
});
