import { describe, expect, it } from "vitest";
import {
  ProductInputSchema,
  ProductUpdateSchema,
  ProductSchema,
} from "@/schemas/product.schema";

describe("Product Schema with drizzle-zod (Unit)", () => {
  it("should validate and parse valid product creation input derived from Drizzle schema", () => {
    const rawInput = {
      name: "Galvanized Steel Pipe",
      categoryId: 3,
      baseUnit: "PCS",
      description: "2-inch heavy pipe",
      sku: "GSP-2",
    };

    const parsed = ProductInputSchema.parse(rawInput);
    expect(parsed.name).toBe("Galvanized Steel Pipe");
    expect(parsed.categoryId).toBe(3);
    expect(parsed.baseUnit).toBe("PCS");
    expect(parsed.description).toBe("2-inch heavy pipe");
  });

  it("should reject invalid product inputs that violate domain rules", () => {
    expect(() =>
      ProductInputSchema.parse({
        name: "A",
        baseUnit: "PCS",
      }),
    ).toThrow();
  });

  it("should validate partial updates using ProductUpdateSchema", () => {
    const partialUpdate = {
      description: "Updated notes",
    };

    const parsed = ProductUpdateSchema.parse(partialUpdate);
    expect(parsed.description).toBe("Updated notes");
    expect(parsed.name).toBeUndefined();
  });

  it("should validate complete product entity records derived from Drizzle schema", () => {
    const rawProduct = {
      id: 10,
      name: "Galvanized Steel Pipe",
      categoryId: 3,
      baseUnit: "PCS",
      description: "2-inch heavy pipe",
      sku: "GSP-2",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      category: {
        id: 3,
        name: "Plumbing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      combinations: [],
      variants: null,
    };

    const parsed = ProductSchema.parse(rawProduct);
    expect(parsed.id).toBe(10);
    expect(parsed.sku).toBe("GSP-2");
    expect(parsed.category.name).toBe("Plumbing");
    expect(parsed.combinations).toEqual([]);
  });
});
