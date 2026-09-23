import { describe, expect, it } from "vitest";
import {
  SupplierInputSchema,
  SupplierUpdateSchema,
  SupplierInput,
} from "@/schemas/supplier.schema";

describe("Supplier Schema (Unit)", () => {
  it("should validate and allow omitting isActive so that SupplierInput treats isActive as optional", () => {
    // Arrange: input without isActive
    const rawInput = {
      name: "Acme Hardware Co.",
      phone: "09171234567",
      email: "acme@hardware.ph",
      address: "123 Industrial Ave",
      contact: "John Acme",
    };

    // Act
    const parsed = SupplierInputSchema.parse(rawInput);

    // Type check assertion: rawInput should be assignable to SupplierInput without isActive
    const typedSupplier: SupplierInput = rawInput;

    // Assert
    expect(parsed.name).toBe("Acme Hardware Co.");
    expect(parsed.isActive).toBeUndefined();
    expect(typedSupplier.name).toBe("Acme Hardware Co.");
  });

  it("should validate partial updates with SupplierUpdateSchema", () => {
    // Arrange
    const updateInput = {
      notes: "Preferred supplier for steel products",
      isActive: false,
    };

    // Act
    const parsed = SupplierUpdateSchema.parse(updateInput);

    // Assert
    expect(parsed.notes).toBe("Preferred supplier for steel products");
    expect(parsed.isActive).toBe(false);
    expect(parsed.name).toBeUndefined();
  });
});
