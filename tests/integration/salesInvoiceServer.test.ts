import { describe, expect, it, beforeAll, beforeEach } from "vitest";
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
import { salesServerService } from "@/server/services/salesServer.service";
import { salesInvoiceServerService } from "@/server/services/salesInvoiceServer.service";
import { INVOICE_STATUS, ORDER_STATUS } from "@/constants";

describe("Sales Invoice Service (Integration)", () => {
  let user0: any;
  let customer0: any;
  let order1: any;
  let order2: any;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser(0);
    customer0 = await createCustomer(0);
    await createCategory(0);
    await createProduct(0);
    await createVariantType(0);
    await createSupplier(0);
    await createCombination();

    // Stock inventory with 50 units
    await createUpdateGoodReceipt(
      [
        {
          combinationId: 1,
          quantity: 50,
          purchasePrice: 100,
        },
      ],
      user0.id
    );

    // Create 2 Sales Orders in RECEIVED status
    order1 = await salesServerService.create(
      {
        salesOrderNumber: "SO-TEST-001",
        customerId: customer0.id,
        orderDate: new Date("2026-10-10"),
        status: ORDER_STATUS.RECEIVED,
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 5,
            originalPrice: 100,
            discount: 0,
          },
        ],
      } as any,
      user0.id
    );

    order2 = await salesServerService.create(
      {
        salesOrderNumber: "SO-TEST-002",
        customerId: customer0.id,
        orderDate: new Date("2026-10-15"),
        status: ORDER_STATUS.RECEIVED,
        salesOrderItems: [
          {
            combinationId: 1,
            quantity: 10,
            originalPrice: 100,
            discount: 0,
          },
        ],
      } as any,
      user0.id
    );
  });

  it("should fetch uninvoiced sales orders for the customer", async () => {
    // Act
    const uninvoiced = await salesInvoiceServerService.getUninvoicedSalesOrders(customer0.id);

    // Assert
    expect(uninvoiced.length).toBe(2);
    const orderNumbers = uninvoiced.map((o: any) => o.salesOrderNumber);
    expect(orderNumbers).toContain("SO-TEST-001");
    expect(orderNumbers).toContain("SO-TEST-002");
  });

  it("should bundle multiple sales orders into a sales invoice statement and compute running balances", async () => {
    // Arrange
    const lines = [
      {
        salesOrderId: order1.id,
        orderDate: order1.orderDate,
        refNo: order1.salesOrderNumber,
        description: "Delivery 1",
        charges: Number(order1.totalAmount), // 500
        payments: 0,
      },
      {
        salesOrderId: order2.id,
        orderDate: order2.orderDate,
        refNo: order2.salesOrderNumber,
        description: "Delivery 2",
        charges: Number(order2.totalAmount), // 1000
        payments: 200,
      },
    ];

    // Act
    const created = await salesInvoiceServerService.create(
      {
        customerId: customer0.id,
        invoiceDate: new Date("2026-10-16"),
        previousBalance: 100,
        status: INVOICE_STATUS.DRAFT,
        salesInvoiceLines: lines,
      } as any,
      user0.id
    );

    // Assert
    expect(created).toBeDefined();
    expect(created?.invoiceNumber).toMatch(/^SI-\d{4}-\d{2}-\d{4}$/);
    expect(created?.customerId).toBe(customer0.id);
    expect(Number(created?.previousBalance)).toBe(100);
    expect(Number(created?.totalCharges)).toBe(1500);
    expect(Number(created?.totalPayments)).toBe(200);
    expect(Number(created?.amountDue)).toBe(1400); // 100 + 1500 - 200 = 1400

    expect(created?.salesInvoiceLines.length).toBe(2);
    // Line 1: 100 + 500 - 0 = 600
    expect(Number(created?.salesInvoiceLines[0].balance)).toBe(600);
    // Line 2: 600 + 1000 - 200 = 1400
    expect(Number(created?.salesInvoiceLines[1].balance)).toBe(1400);
  });

  it("should post and void a sales invoice statement through its lifecycle", async () => {
    // Arrange
    const lines = [
      {
        salesOrderId: order1.id,
        orderDate: order1.orderDate,
        refNo: order1.salesOrderNumber,
        charges: Number(order1.totalAmount),
        payments: 0,
      },
    ];

    const draft = await salesInvoiceServerService.create(
      {
        customerId: customer0.id,
        invoiceDate: new Date(),
        status: INVOICE_STATUS.DRAFT,
        salesInvoiceLines: lines,
      } as any,
      user0.id
    );

    expect(draft?.status).toBe(INVOICE_STATUS.DRAFT);

    // Act: Post
    const posted = await salesInvoiceServerService.postInvoice(draft!.id, user0.id);
    expect(posted?.status).toBe(INVOICE_STATUS.POSTED);

    // Act: Void
    const voided = await salesInvoiceServerService.voidInvoice(draft!.id, user0.id);
    expect(voided?.status).toBe("VOID");

    // Orders should now be eligible again for invoicing
    const uninvoicedAfterVoid = await salesInvoiceServerService.getUninvoicedSalesOrders(customer0.id);
    const orderNumbers = uninvoicedAfterVoid.map((o: any) => o.salesOrderNumber);
    expect(orderNumbers).toContain("SO-TEST-001");
  });

  it("should support querying sales invoices via getAll with filters", async () => {
    // Arrange
    await salesInvoiceServerService.create(
      {
        customerId: customer0.id,
        invoiceDate: new Date(),
        status: INVOICE_STATUS.DRAFT,
        salesInvoiceLines: [
          {
            salesOrderId: order1.id,
            charges: Number(order1.totalAmount),
            payments: 0,
          },
        ],
      } as any,
      user0.id
    );

    // Act
    const res = await salesInvoiceServerService.getAll({
      customerId: customer0.id,
      status: INVOICE_STATUS.DRAFT,
    });

    // Assert
    expect(res.data.length).toBe(1);
    expect(res.meta.total).toBe(1);
    expect(res.data[0].customer.id).toBe(customer0.id);
  });
});
