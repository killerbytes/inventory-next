import { describe, expect, it } from "vitest";
import { SalesOrderFormSchema } from "@/schemas/salesOrder.schema";
import { MODE_OF_PAYMENT, ORDER_STATUS } from "@/constants";

describe("SalesOrderFormSchema - Inventory Validation (Unit)", () => {
  const baseOrder = {
    salesOrderNumber: "SO-2026-0001",
    customerId: 1,
    orderDate: new Date(),
    modeOfPayment: MODE_OF_PAYMENT.CASH,
    status: ORDER_STATUS.RECEIVED,
    isDelivery: false,
    deliveryDate: new Date(),
    dueDate: new Date(),
  };

  it("should fail validation when quantity exceeds available inventory for active order", () => {
    // Arrange
    const input = {
      ...baseOrder,
      status: ORDER_STATUS.RECEIVED,
      salesOrderItems: [
        {
          combinationId: 10,
          quantity: 15,
          discount: 0,
          combination: {
            id: 10,
            price: 100,
            inventory: {
              quantity: "10",
            },
          },
        },
      ],
    };

    // Act
    const result = SalesOrderFormSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      const quantityIssue = result.error.issues.find(
        (issue) =>
          issue.path.join(".") === "salesOrderItems.0.quantity",
      );
      expect(quantityIssue).toBeDefined();
      expect(quantityIssue?.message).toContain("Insufficient inventory");
      expect(quantityIssue?.message).toContain("10");
    }
  });

  it("should pass validation when quantity is within available inventory for active order", () => {
    // Arrange
    const input = {
      ...baseOrder,
      status: ORDER_STATUS.RECEIVED,
      salesOrderItems: [
        {
          combinationId: 10,
          quantity: 10,
          discount: 0,
          combination: {
            id: 10,
            price: 100,
            inventory: {
              quantity: "10",
            },
          },
        },
      ],
    };

    // Act
    const result = SalesOrderFormSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should pass validation when quantity exceeds inventory if order status is DRAFT", () => {
    // Arrange
    const input = {
      ...baseOrder,
      status: ORDER_STATUS.DRAFT,
      salesOrderItems: [
        {
          combinationId: 10,
          quantity: 50,
          discount: 0,
          combination: {
            id: 10,
            price: 100,
            inventory: {
              quantity: "10",
            },
          },
        },
      ],
    };

    // Act
    const result = SalesOrderFormSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should fail validation when inventory quantity is 0 for active order", () => {
    // Arrange
    const input = {
      ...baseOrder,
      status: ORDER_STATUS.RECEIVED,
      salesOrderItems: [
        {
          combinationId: 10,
          quantity: 1,
          discount: 0,
          combination: {
            id: 10,
            price: 100,
            inventory: {
              quantity: "0",
            },
          },
        },
      ],
    };

    // Act
    const result = SalesOrderFormSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      const quantityIssue = result.error.issues.find(
        (issue) =>
          issue.path.join(".") === "salesOrderItems.0.quantity",
      );
      expect(quantityIssue).toBeDefined();
      expect(quantityIssue?.message).toContain("Insufficient inventory");
    }
  });
});
