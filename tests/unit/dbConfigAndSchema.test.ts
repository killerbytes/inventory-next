import { describe, expect, it } from "vitest";
import { resolveDbSsl } from "@/server/db/ssl";
import { products } from "@/server/db/schema/products";
import { ProductInputSchema, ProductSchema } from "@/schemas/product.schema";

describe("Database Configuration & Schema Parity (Unit)", () => {
  describe("SSL Resolution Logic", () => {
    it("should return false for localhost development environment", () => {
      const ssl = resolveDbSsl({
        host: "localhost",
        nodeEnv: "development",
        dbSsl: undefined,
      });
      expect(ssl).toBe(false);
    });

    it("should return false for 127.0.0.1 in test environment", () => {
      const ssl = resolveDbSsl({
        host: "127.0.0.1",
        nodeEnv: "test",
        dbSsl: undefined,
      });
      expect(ssl).toBe(false);
    });

    it("should return rejectUnauthorized: false when NODE_ENV is production", () => {
      const ssl = resolveDbSsl({
        host: "localhost",
        nodeEnv: "production",
        dbSsl: undefined,
      });
      expect(ssl).toEqual({ rejectUnauthorized: false });
    });

    it("should return rejectUnauthorized: false when DB_SSL is 'true'", () => {
      const ssl = resolveDbSsl({
        host: "localhost",
        nodeEnv: "development",
        dbSsl: "true",
      });
      expect(ssl).toEqual({ rejectUnauthorized: false });
    });

    it("should return rejectUnauthorized: false for Railway cloud proxy host", () => {
      const ssl = resolveDbSsl({
        host: "tokaido.proxy.rlwy.net",
        nodeEnv: "development",
        dbSsl: undefined,
      });
      expect(ssl).toEqual({ rejectUnauthorized: false });
    });
  });

  describe("Products Schema & Search Text Parity", () => {
    it("should define searchText column mapped to 'search_text' in products table", () => {
      expect(products.searchText).toBeDefined();
      expect(products.searchText.name).toBe("search_text");
    });

    it("should not require searchText when parsing ProductInputSchema", () => {
      const input = {
        name: "Test Hammer",
        categoryId: 1,
        baseUnit: "PCS",
        description: "16oz steel hammer",
      };
      const parsed = ProductInputSchema.parse(input);
      expect(parsed.name).toBe("Test Hammer");
      expect((parsed as any).searchText).toBeUndefined();
    });

    it("should validate complete product records in ProductSchema with searchText", () => {
      const productRecord = {
        id: 1,
        name: "Test Hammer",
        categoryId: 1,
        baseUnit: "PCS",
        description: "16oz steel hammer",
        sku: "HAM-01",
        searchText: "'hammer':2 'steel':1",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        category: {
          id: 1,
          name: "Tools",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        combinations: [],
        variants: null,
      };

      const parsed = ProductSchema.parse(productRecord);
      expect(parsed.id).toBe(1);
      expect(parsed.searchText).toBe("'hammer':2 'steel':1");
    });
  });
});
