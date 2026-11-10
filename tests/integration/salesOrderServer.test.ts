// @vitest-environment node
import { SalesOrderInput } from "@/schemas";
import { db } from "@/server/db/drizzle";
import {
  inventoryServerService,
  productCombinationServerService,
} from "@/server/services";
import { salesServerService } from "@/server/services/salesServer.service";
import { ORDER_STATUS, RETURN_TYPE, INVENTORY_MOVEMENT_TYPE } from "@/constants";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { productCombinations } from "@/server/db/schema/productCombinations";
import { eq } from "drizzle-orm";
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
  let user0: any;
  let customer0: any;

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
    const inventory = await db.query.inventories.findMany({
      orderBy: (inv, { asc }) => [asc(inv.id)],
    });

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

    const inv1 = await db.query.inventories.findFirst({
      where: (inv, { eq }) => eq(inv.combinationId, 1),
    });
    expect(Number(inv1?.quantity)).toBe(0);
    const inv2 = await db.query.inventories.findFirst({
      where: (inv, { eq }) => eq(inv.combinationId, 2),
    });
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
    const inventory = await db.query.inventories.findMany({
      orderBy: (inv, { asc }) => [asc(inv.id)],
    });
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

    const inventory2 = await db.query.inventories.findMany({
      orderBy: (inv, { asc }) => [asc(inv.id)],
    });
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
    expect(salesOrders.pagination.total).toBe(2);
    expect(salesOrders.pagination.totalPages).toBe(1);
    expect(salesOrders.pagination.currentPage).toBe(1);
  });

  it("should sort sales orders by id DESC by default and include nested combinations", async () => {
    await salesServerService.create(
      { ...getTestData(), salesOrderNumber: "ORDER-1" } as any,
      user0.id,
    );
    await salesServerService.create(
      { ...getTestData(), salesOrderNumber: "ORDER-2" } as any,
      user0.id,
    );

    const result = await salesServerService.getAll({ page: 1, limit: 10 });
    const items = result.data || result.rows;

    // Latest created order (id 2) should be first
    expect(items[0].salesOrderNumber).toBe("ORDER-2");
    expect(items[1].salesOrderNumber).toBe("ORDER-1");

    // SalesOrderItems should include combination
    expect(items[0].salesOrderItems[0].combinations).toBeDefined();
  });

  it("should sort sales orders by customer.name without error", async () => {
    await salesServerService.create(getTestData() as any, user0.id);

    const result = await salesServerService.getAll({
      sort: "customer.name",
      order: "ASC",
    });
    const items = result.data || result.rows;
    expect(items.length).toBeGreaterThan(0);
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

  it("rejects a discount larger than the line amount and leaves stock untouched", async () => {
    const before = await db.query.inventories.findFirst({
      where: (tbl, { eq }) => eq(tbl.combinationId, 1),
    });

    await expect(
      salesServerService.create(
        {
          ...getTestData(),
          status: ORDER_STATUS.RECEIVED,
          salesOrderItems: [{ combinationId: 1, quantity: 1, discount: 1_000_000 }],
        },
        user0.id,
      ),
    ).rejects.toThrow("Discount cannot exceed the line amount");

    const after = await db.query.inventories.findFirst({
      where: (tbl, { eq }) => eq(tbl.combinationId, 1),
    });
    expect(after?.quantity).toBe(before?.quantity);
  });

  describe("update enforces the same line rules as create", () => {
    const getStock = async (combinationId: number) =>
      (
        await db.query.inventories.findFirst({
          where: (tbl, { eq }) => eq(tbl.combinationId, combinationId),
        })
      )?.quantity;

    it.each([ORDER_STATUS.DRAFT, ORDER_STATUS.RECEIVED])(
      "rejects a discount larger than the line amount when saving a draft as %s, keeping the stored lines and stock",
      async (status) => {
        await salesServerService.create(getTestData(), user0.id);
        const stockBefore = await getStock(1);

        await expect(
          salesServerService.update(
            1,
            {
              ...getTestData(),
              status,
              salesOrderItems: [
                { combinationId: 1, quantity: 1, discount: 1_000_000 },
              ],
            },
            user0.id,
          ),
        ).rejects.toThrow("Discount cannot exceed the line amount");

        const order = await salesServerService.get(1);
        expect(order?.status).toBe(ORDER_STATUS.DRAFT);
        expect(order?.salesOrderItems?.length).toBe(2);
        expect(await getStock(1)).toBe(stockBefore);
      },
    );

    it("rejects re-saving a draft whose product price was cleared after the draft was created", async () => {
      await salesServerService.create(getTestData(), user0.id);
      await db
        .update(productCombinations)
        .set({ price: "0" })
        .where(eq(productCombinations.id, 1));

      await expect(
        salesServerService.update(
          1,
          { ...getTestData(), status: ORDER_STATUS.DRAFT },
          user0.id,
        ),
      ).rejects.toThrow("price is not set");
    });

    it("rejects a draft line whose product no longer exists", async () => {
      await salesServerService.create(getTestData(), user0.id);

      await expect(
        salesServerService.update(
          1,
          {
            ...getTestData(),
            status: ORDER_STATUS.DRAFT,
            salesOrderItems: [{ combinationId: 9999, quantity: 1 }],
          },
          user0.id,
        ),
      ).rejects.toThrow("Product Combination not found");
    });
  });

  describe("editing DRAFT orders", () => {
    const stockOf = async (combinationId: number) =>
      Number(
        (
          await db.query.inventories.findFirst({
            where: (tbl, { eq }) => eq(tbl.combinationId, combinationId),
          })
        )?.quantity,
      );

    it("edits a DRAFT's header and lines without touching stock", async () => {
      const draft = await salesServerService.create(getTestData(), user0.id);
      const line1 = draft!.salesOrderItems.find((i: any) => i.combinationId === 1)!;

      await salesServerService.update(
        draft!.id,
        {
          ...getTestData(),
          status: ORDER_STATUS.DRAFT,
          notes: "Customer called back",
          salesOrderItems: [{ id: line1.id, combinationId: 1, quantity: 5 }],
        },
        user0.id,
      );

      const updated = await salesServerService.get(draft!.id);
      expect(updated?.status).toBe(ORDER_STATUS.DRAFT);
      expect(updated?.notes).toBe("Customer called back");
      expect(updated?.salesOrderItems).toHaveLength(1);
      expect(updated?.salesOrderItems[0].id).toBe(line1.id);
      expect(Number(updated?.totalAmount)).toBe(500);
      expect(await stockOf(1)).toBe(11);
    });

    it("prices DRAFT lines from the database, ignoring client-sent prices and totals", async () => {
      const draft = await salesServerService.create(getTestData(), user0.id);

      await salesServerService.update(
        draft!.id,
        {
          status: ORDER_STATUS.DRAFT,
          totalAmount: 1,
          salesOrderItems: [
            { combinationId: 1, quantity: 2, purchasePrice: 1, originalPrice: 1, totalAmount: 1 },
          ],
        } as any,
        user0.id,
      );

      const updated = await salesServerService.get(draft!.id);
      expect(Number(updated?.salesOrderItems[0].purchasePrice)).toBe(100);
      expect(Number(updated?.totalAmount)).toBe(200);
    });

    it("ignores non-editable header fields such as deletedAt", async () => {
      const draft = await salesServerService.create(getTestData(), user0.id);

      await salesServerService.update(
        draft!.id,
        { ...getTestData(), deletedAt: new Date(), id: 999 } as any,
        user0.id,
      );

      expect(await salesServerService.get(draft!.id)).not.toBeNull();
    });

    it("rejects a discount larger than the line amount when editing", async () => {
      const draft = await salesServerService.create(getTestData(), user0.id);

      await expect(
        salesServerService.update(
          draft!.id,
          {
            ...getTestData(),
            salesOrderItems: [{ combinationId: 1, quantity: 1, discount: 101 }],
          },
          user0.id,
        ),
      ).rejects.toThrow("Discount cannot exceed the line amount");
    });

    it("decreases stock exactly once when the same DRAFT is received twice concurrently", async () => {
      const draft = await salesServerService.create(getTestData(), user0.id);
      // Small quantities so stock can't run out; only the order lock can stop the second receive.
      const receive = () =>
        salesServerService.update(
          draft!.id,
          {
            ...getTestData(),
            status: ORDER_STATUS.RECEIVED,
            salesOrderItems: [{ combinationId: 1, quantity: 1 }],
          },
          user0.id,
        );

      const results = await Promise.allSettled([receive(), receive()]);

      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
      expect(await stockOf(1)).toBe(10);
    });
  });

  describe("business-timezone calendar days (Asia/Manila, UTC+8)", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("puts a 01:30 Manila sale on its Manila day in the weekly sales graph, not the previous UTC day", async () => {
      // 01:30 Manila on Nov 11 = 17:30 UTC on Nov 10.
      await salesServerService.create(
        {
          ...getTestData(),
          status: ORDER_STATUS.RECEIVED,
          orderDate: new Date("2026-11-10T17:30:00.000Z"),
        },
        user0.id,
      );

      const series = await salesServerService.getDailySales(
        new Date("2026-11-10T20:00:00.000Z"),
        "Asia/Manila",
      );

      expect(series.at(-1)).toEqual({ name: "Nov 11", totalAmount: 3000 });
      expect(series.find((d) => d.name === "Nov 10")?.totalAmount).toBe(0);
    });

    it("numbers an order created at 01:00 Manila on Dec 1 with December's prefix", async () => {
      // 01:00 Manila on Dec 1 = 17:00 UTC on Nov 30. Only Date is faked so pg timers keep working.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-30T17:00:00.000Z"));

      const order = await salesServerService.create(
        { ...getTestData(), salesOrderNumber: "" },
        user0.id,
      );

      expect(order?.salesOrderNumber).toMatch(/^SO-2026-12-\d{4}$/);
    });
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

    const inv1 = await db.query.inventories.findFirst({
      where: (inv, { eq }) => eq(inv.combinationId, 1),
    });
    expect(Number(inv1?.quantity)).toBe(8);
    const inv2 = await db.query.inventories.findFirst({
      where: (inv, { eq }) => eq(inv.combinationId, 2),
    });
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

    const inv = await db.query.inventories.findMany({
      orderBy: (inv, { asc }) => [asc(inv.id)],
    });
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

    const inventory = await db.query.inventories.findMany({
      orderBy: (inv, { asc }) => [asc(inv.id)],
    });
    await salesServerService.returnExchange(1, returns, undefined, "reason", user0.id);
    const inventory2 = await db.query.inventories.findMany({
      orderBy: (inv, { asc }) => [asc(inv.id)],
    });
    const inventoryMovement = await db.query.inventoryMovements.findMany({
      orderBy: (m, { asc }) => [asc(m.id)],
    });
    const returnTransaction = await db.query.returnTransactions.findMany({
      orderBy: (t, { asc }) => [asc(t.id)],
    });
    const returnItems = await db.query.returnItems.findMany({
      orderBy: (i, { asc }) => [asc(i.id)],
    });

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
  });

  it("should associate return and exchange movements with the salesOrder id as referenceId", async () => {
    // Create first sales order (id: 1)
    await salesServerService.create(
      {
        ...getTestData(),
        status: "RECEIVED",
        salesOrderItems: [{ combinationId: 1, quantity: 5, originalPrice: 100, purchasePrice: 100 }],
      } as any,
      user0.id,
    );

    // Create second sales order (id: 2)
    const order2 = await salesServerService.create(
      {
        ...getTestData(),
        salesOrderNumber: "SO-ORDER-02",
        status: "RECEIVED",
        salesOrderItems: [
          { combinationId: 1, quantity: 5, originalPrice: 100, purchasePrice: 100 },
          { combinationId: 2, quantity: 10, originalPrice: 100, purchasePrice: 100 },
        ],
      } as any,
      user0.id,
    );

    expect(order2).toBeDefined();
    const order2Id = order2!.id;

    const returns = [{ combinationId: 1, quantity: 2 }];
    const exchanges = [{ combinationId: 2, quantity: 1 }];

    // Perform return & exchange on order2 (id: 2)
    await salesServerService.returnExchange(order2Id, returns, exchanges, "Damaged item replacement", user0.id);

    const returnMovements = await db.query.inventoryMovements.findMany({
      where: (tbl, { eq }) => eq(tbl.type, RETURN_TYPE.RETURN_IN),
    });
    const exchangeMovements = await db.query.inventoryMovements.findMany({
      where: (tbl, { eq }) => eq(tbl.type, INVENTORY_MOVEMENT_TYPE.EXCHANGE_OUT),
    });

    expect(returnMovements.length).toBe(1);
    expect(returnMovements[0].referenceType).toBe("SALES_ORDER");
    expect(returnMovements[0].referenceId).toBe(order2Id);

    expect(exchangeMovements.length).toBe(1);
    expect(exchangeMovements[0].referenceType).toBe("SALES_ORDER");
    expect(exchangeMovements[0].referenceId).toBe(order2Id);
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
      user0.id,
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
      salesServerService.returnExchange(1, returns as any, undefined, "reason", user0.id),
    ).rejects.toThrow("SalesOrder is not in a valid state");
  });

  it("should enforce cumulative return limits across multiple return transactions in live db", async () => {
    const order = await salesServerService.create(
      {
        ...getTestData(),
        salesOrderNumber: "SO-CUMULATIVE-RET",
        status: ORDER_STATUS.RECEIVED,
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 5,
            originalPrice: 100,
            purchasePrice: 100,
          },
        ],
      } as any,
      user0.id,
    );
    if (!order) {
      throw new Error("Order not found");
    }
    // Initial return of 3 units (within 5)
    await salesServerService.returnExchange(
      order.id,
      [{ combinationId: 1, quantity: 3 }],
      undefined,
      "First partial return",
      user0.id,
    );

    // Second return of 3 units should fail because 3 + 3 = 6 > 5
    await expect(
      salesServerService.returnExchange(
        order.id,
        [{ combinationId: 1, quantity: 3 }],
        undefined,
        "Second return exceeding remaining",
        user0.id,
      ),
    ).rejects.toThrow("Return quantity exceeds available returnable quantity");

    // Second return of remaining 2 units should succeed (total 5 of 5)
    await salesServerService.returnExchange(
      order.id,
      [{ combinationId: 1, quantity: 2 }],
      undefined,
      "Second return completing full return",
      user0.id,
    );

    // Third return should now fail because all 5 have been returned
    await expect(
      salesServerService.returnExchange(
        order.id,
        [{ combinationId: 1, quantity: 1 }],
        undefined,
        "Third return on exhausted line",
        user0.id,
      ),
    ).rejects.toThrow("Return quantity exceeds available returnable quantity");
  });

  it("should filter by orderDate with timezone and end-of-day boundary safety", async () => {
    // Arrange: Order on July 31st (inside July)
    const orderJuly = await salesServerService.create(
      {
        ...getTestData(),
        salesOrderNumber: "SO-JULY-31",
        orderDate: new Date("2026-07-31T10:00:00"),
      } as any,
      user0.id,
    );

    // Order on August 1st midnight local
    const orderAugust = await salesServerService.create(
      {
        ...getTestData(),
        salesOrderNumber: "SO-AUG-01",
        orderDate: new Date("2026-08-01T00:00:00"),
      } as any,
      user0.id,
    );

    // Act: Query for July 2026 (2026-07-01 to 2026-07-31)
    const result = await salesServerService.getAll({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });

    // Assert: Only July order should be returned; August 1st must be strictly excluded
    const returnedIds = (result.data || result.rows).map((r: any) => r.id);
    expect(returnedIds).toContain(orderJuly?.id);
    expect(returnedIds).not.toContain(orderAugust?.id);
  });
});
