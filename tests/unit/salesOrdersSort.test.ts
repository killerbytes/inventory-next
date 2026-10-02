// @vitest-environment node
import { SalesOrder, Customer, User } from "@/server/models";
import { salesServerService } from "@/server/services/salesServer.service";
import { ORDER_STATUS } from "@/types/definitions";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";
import { createCustomer, createUser } from "../utils/fixtures";

describe("Sales Order Service - Sorting & Pagination (Unit/Integration)", () => {
  let user0: User;
  let customerA: Customer;
  let customerB: Customer;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser();
    customerA = await Customer.create({
      name: "Alpha Construction",
      phone: "1234567890",
      address: "123 Alpha Road",
    });
    customerB = await Customer.create({
      name: "Beta Supply",
      phone: "0987654321",
      address: "456 Beta Avenue",
    });

    // Seed 3 sales orders with distinct order dates, order numbers, and amounts
    await SalesOrder.create({
      salesOrderNumber: "SO-101",
      customerId: customerA.id,
      orderDate: new Date("2026-09-01T10:00:00.000Z"),
      totalAmount: 100.0,
      status: ORDER_STATUS.RECEIVED,
    });

    await SalesOrder.create({
      salesOrderNumber: "SO-102",
      customerId: customerB.id,
      orderDate: new Date("2026-09-02T10:00:00.000Z"),
      totalAmount: 300.0,
      status: ORDER_STATUS.COMPLETED,
    });

    await SalesOrder.create({
      salesOrderNumber: "SO-103",
      customerId: customerA.id,
      orderDate: new Date("2026-09-03T10:00:00.000Z"),
      totalAmount: 200.0,
      status: ORDER_STATUS.POSTED,
    });
  });

  it("should sort by orderDate DESC by default and return contract shape", async () => {
    const result = await salesServerService.getAll({});

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("meta");
    expect(result).toHaveProperty("pagination");
    expect(result).toHaveProperty("summary");

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].salesOrderNumber).toBe("SO-103");
    expect(result.rows[1].salesOrderNumber).toBe("SO-102");
    expect(result.rows[2].salesOrderNumber).toBe("SO-101");
  });

  it("should sort by orderDate ASC when specified", async () => {
    const result = await salesServerService.getAll({
      sort: "orderDate",
      order: "ASC",
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].salesOrderNumber).toBe("SO-101");
    expect(result.rows[1].salesOrderNumber).toBe("SO-102");
    expect(result.rows[2].salesOrderNumber).toBe("SO-103");
  });

  it("should sort by salesOrderNumber ASC and DESC", async () => {
    const ascResult = await salesServerService.getAll({
      sort: "salesOrderNumber",
      order: "ASC",
    });
    expect(ascResult.rows[0].salesOrderNumber).toBe("SO-101");
    expect(ascResult.rows[2].salesOrderNumber).toBe("SO-103");

    const descResult = await salesServerService.getAll({
      sort: "salesOrderNumber",
      order: "DESC",
    });
    expect(descResult.rows[0].salesOrderNumber).toBe("SO-103");
    expect(descResult.rows[2].salesOrderNumber).toBe("SO-101");
  });

  it("should sort by customer.name association ASC and DESC", async () => {
    const ascResult = await salesServerService.getAll({
      sort: "customer.name",
      order: "ASC",
    });
    expect(ascResult.rows[0].customer.name).toBe("Alpha Construction");
    expect(ascResult.rows[2].customer.name).toBe("Beta Supply");

    const descResult = await salesServerService.getAll({
      sort: "customer.name",
      order: "DESC",
    });
    expect(descResult.rows[0].customer.name).toBe("Beta Supply");
  });

  it("should sort by totalAmount ASC and DESC", async () => {
    const ascResult = await salesServerService.getAll({
      sort: "totalAmount",
      order: "ASC",
    });
    expect(Number(ascResult.rows[0].totalAmount)).toBe(100.0);
    expect(Number(ascResult.rows[2].totalAmount)).toBe(300.0);

    const descResult = await salesServerService.getAll({
      sort: "totalAmount",
      order: "DESC",
    });
    expect(Number(descResult.rows[0].totalAmount)).toBe(300.0);
    expect(Number(descResult.rows[2].totalAmount)).toBe(100.0);
  });
});
