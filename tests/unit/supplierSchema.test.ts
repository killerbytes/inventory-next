import { describe, expect, it } from "vitest";
import {
  SupplierInputSchema,
  SupplierUpdateSchema,
  SupplierInput,
} from "@/schemas/supplier.schema";

describe("Supplier Schema (Unit)", () => {
  it("should validate when ONLY supplier name is provided (all other fields omitted)", () => {
    // Arrange: input with only name
    const rawInput = {
      name: "Acme Hardware Co.",
    };

    // Act
    const parsed = SupplierInputSchema.parse(rawInput);

    // Assert
    expect(parsed.name).toBe("Acme Hardware Co.");
    expect(parsed.phone).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.address).toBeUndefined();
    expect(parsed.contact).toBeUndefined();
    expect(parsed.isActive).toBeUndefined();
  });

  it("should accept empty string values for optional fields (as submitted by SupplierModal)", () => {
    // Arrange: modal default empty string values
    const modalInput = {
      name: "Acme Hardware Co.",
      phone: "",
      email: "",
      address: "",
      contact: "",
    };

    // Act
    const parsed = SupplierInputSchema.parse(modalInput);

    // Assert
    expect(parsed.name).toBe("Acme Hardware Co.");
    expect(parsed.email).toBeNull();
  });

  it("should trim and transform whitespace-only email to null", () => {
    // Arrange: whitespace email
    const rawInput = {
      name: "Acme Hardware Co.",
      email: "   ",
    };

    // Act
    const parsed = SupplierInputSchema.parse(rawInput);

    // Assert
    expect(parsed.name).toBe("Acme Hardware Co.");
    expect(parsed.email).toBeNull();
  });

  it("should validate and normalize valid email address", () => {
    // Arrange: mixed case and padded email
    const rawInput = {
      name: "Acme Hardware Co.",
      email: " Supplier@Acme.COM ",
    };

    // Act
    const parsed = SupplierInputSchema.parse(rawInput);

    // Assert
    expect(parsed.name).toBe("Acme Hardware Co.");
    expect(parsed.email).toBe("supplier@acme.com");
  });

  it("should reject invalid email format when email is provided", () => {
    // Arrange: invalid email string
    const rawInput = {
      name: "Acme Hardware Co.",
      email: "not-an-email",
    };

    // Act & Assert
    expect(() => SupplierInputSchema.parse(rawInput)).toThrow(
      "Please enter a valid email address.",
    );
  });

  it("should require name to have at least 2 characters", () => {
    // Arrange: name with 1 character
    expect(() =>
      SupplierInputSchema.parse({
        name: "A",
      }),
    ).toThrow("Name must be at least 2 characters.");

    // Arrange: missing name
    expect(() => SupplierInputSchema.parse({} as any)).toThrow();
  });

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
