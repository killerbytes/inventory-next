import { describe, expect, it } from "vitest";
import {
  CategoryInputSchema,
  CategoryUpdateSchema,
  CategorySchema,
} from "@/schemas/category.schema";
import {
  CustomerInputSchema,
  CustomerUpdateSchema,
  CustomerSchema,
} from "@/schemas/customer.schema";

describe("Category Schema with drizzle-zod (Unit)", () => {
  it("should validate valid category input", () => {
    const raw = { name: "Plumbing", description: "Pipes and fittings", order: 1 };
    const parsed = CategoryInputSchema.parse(raw);
    expect(parsed.name).toBe("Plumbing");
    expect(parsed.description).toBe("Pipes and fittings");
  });

  it("should reject invalid category with name shorter than 2 chars", () => {
    expect(() => CategoryInputSchema.parse({ name: "A" })).toThrow();
  });

  it("should allow partial category updates", () => {
    const parsed = CategoryUpdateSchema.parse({ description: "Updated" });
    expect(parsed.description).toBe("Updated");
  });

  it("should parse complete category entity", () => {
    const entity = {
      id: 5,
      name: "Plumbing",
      parentId: null,
      description: null,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const parsed = CategorySchema.parse(entity);
    expect(parsed.id).toBe(5);
  });
});

describe("Customer Schema with drizzle-zod (Unit)", () => {
  it("should validate valid customer input", () => {
    const raw = {
      name: "Acme Corp",
      email: "contact@acme.com",
      phone: "1234567890",
    };
    const parsed = CustomerInputSchema.parse(raw);
    expect(parsed.name).toBe("Acme Corp");
    expect(parsed.email).toBe("contact@acme.com");
  });

  it("should reject customer with invalid email", () => {
    expect(() =>
      CustomerInputSchema.parse({
        name: "Acme Corp",
        email: "not-an-email",
      }),
    ).toThrow();
  });

  it("should parse complete customer entity", () => {
    const entity = {
      id: 1,
      name: "Acme Corp",
      address: null,
      contact: null,
      phone: null,
      email: null,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const parsed = CustomerSchema.parse(entity);
    expect(parsed.id).toBe(1);
  });
});
