import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { setupDatabase, resetDatabase } from "../setup";
import { createCategoryAction } from "@/server/actions/category.actions";
import { createCustomerAction } from "@/server/actions/customer.actions";
import { createSupplierAction } from "@/server/actions/supplier.actions";
import { cancelSalesOrderAction } from "@/server/actions/salesOrder.actions";
import { deleteGoodReceiptAction } from "@/server/actions/goodReceipt.actions";
import { createCustomer, createSupplier, createUser } from "../utils/fixtures";
import { salesServerService } from "@/server/services/salesServer.service";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createUser(0);
});


describe("Action Protection & Schema Validation (Integration)", () => {
  it("should reject unauthenticated call to createCategoryAction", async () => {
    // Act & Assert
    await expect(
      createCategoryAction({ name: "Protected Category" })
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("should reject unauthenticated call to createCustomerAction", async () => {
    // Act & Assert
    await expect(
      createCustomerAction({ name: "Protected Customer" })
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("should reject unauthenticated call to createSupplierAction", async () => {
    // Act & Assert
    await expect(
      createSupplierAction({ name: "Protected Supplier" })
    ).rejects.toThrow(/Unauthorized/i);
  });

  it("should allow cancelSalesOrderAction with reason without schema validation errors", async () => {
    // Arrange: Create customer, combination, and sales order
    const customer = await createCustomer(0);
    const order = await salesServerService.create({
      customerId: customer.id,
      salesOrderNumber: "SO-TEST-CANCEL-1",
      orderDate: new Date(),
      status: "CONFIRMED",
      modeOfPayment: "CASH",
      totalAmount: 100,
    } as any, 1);

    // Act: simulate action call (with mock session or admin context)
    // Here we verify cancelSalesOrderAction signature and schema compatibility
    try {
      await cancelSalesOrderAction(order!.id, "Customer requested cancellation");
    } catch (err: any) {
      // Must NOT fail with Zod validation error ("expected object, received string")
      expect(err?.name).not.toBe("ZodError");
      expect(err?.message).not.toContain("Required");
    }
  });

  it("should allow deleteGoodReceiptAction with ID without schema validation errors", async () => {
    // Arrange
    const supplier = await createSupplier(0);
    const gr = await goodReceiptServerService.create({
      supplierId: supplier.id,
      referenceNo: "GR-TEST-DEL-1",
      receiptDate: new Date(),
      status: "DRAFT",
      totalAmount: 50,
      goodReceiptLines: [],
    } as any, 1);

    // Act & Assert: Must NOT fail with ZodError (expected object, received number)
    try {
      await deleteGoodReceiptAction(gr.id);
    } catch (err: any) {
      expect(err?.name).not.toBe("ZodError");
      expect(err?.message).not.toContain("Expected object, received number");
    }
  });
});

