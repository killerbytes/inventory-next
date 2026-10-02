// @vitest-environment node
import { SalesOrder, Customer, User, InventoryMovement } from "@/server/models";
import { salesServerService } from "@/server/services/salesServer.service";
import { ORDER_STATUS } from "@/types/definitions";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import { createUser } from "../utils/fixtures";

describe("Sales Order Summary - Profit Calculation (TDD)", () => {
  let user0: User;
  let customer0: Customer;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser();
    customer0 = await Customer.create({
      name: "Acme Corp",
      phone: "123456789",
      address: "123 Industrial Way",
    });

    // 1. Create a sales order of 1000 totalAmount
    const so = await SalesOrder.create({
      salesOrderNumber: "SO-PROFIT-1",
      customerId: customer0.id,
      orderDate: new Date(),
      totalAmount: 1000.0,
      status: ORDER_STATUS.RECEIVED,
    });

    // 2. Outgoing inventory movement has negative totalCost (-600)
    await InventoryMovement.create({
      referenceId: so.id,
      referenceType: "SALES_ORDER",
      type: "OUT",
      quantity: -10,
      unitCost: 60.0,
      totalCost: -600.0,
      userId: user0.id,
      date: new Date(),
    });
  });

  it("should calculate totalProfitAmount as revenue + (negative totalCost)", async () => {
    const result = await salesServerService.getAll({});

    expect(result.summary.totalAmount).toBe(1000.0);
    // Profit must be 1000 + (-600) = 400.
    // If bug (- totalCost) is present, it will incorrectly be 1600.
    expect(result.summary.totalProfitAmount).toBe(400.0);
  });
});
