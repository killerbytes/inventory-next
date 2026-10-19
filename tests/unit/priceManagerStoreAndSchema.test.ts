import { describe, expect, it } from "vitest";
import { useUIStore } from "@/stores/uiStore";
import { updateCombinationPriceSchema } from "@/schemas/productCombination.schema";

describe("Price Manager Store & Schema (Unit)", () => {
  describe("updateCombinationPriceSchema", () => {
    it("should accept valid combinationId and positive price", () => {
      const result = updateCombinationPriceSchema.safeParse({
        combinationId: 10,
        price: 150.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.combinationId).toBe(10);
        expect(result.data.price).toBe(150.5);
      }
    });

    it("should reject non-positive or negative price", () => {
      const zeroResult = updateCombinationPriceSchema.safeParse({
        combinationId: 10,
        price: 0,
      });
      expect(zeroResult.success).toBe(false);

      const negativeResult = updateCombinationPriceSchema.safeParse({
        combinationId: 10,
        price: -25,
      });
      expect(negativeResult.success).toBe(false);
    });

    it("should reject non-positive combinationId", () => {
      const result = updateCombinationPriceSchema.safeParse({
        combinationId: -1,
        price: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should coerce numeric strings for combinationId and price", () => {
      const result = updateCombinationPriceSchema.safeParse({
        combinationId: "42",
        price: "299.99",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.combinationId).toBe(42);
        expect(result.data.price).toBe(299.99);
      }
    });
  });

  describe("useUIStore - price modal state", () => {
    it("should update isPriceModalOpen and editingPriceCombination correctly", () => {
      expect(useUIStore.getState().isPriceModalOpen).toBe(false);
      expect(useUIStore.getState().editingPriceCombination).toBeFalsy();

      const mockCombination = {
        id: 123,
        name: "Test Combo - Box of 10",
        price: "199.00",
        inventory: {
          averagePrice: "120.00",
          quantity: 50,
        },
      } as any;

      // Open modal
      useUIStore.getState().setPriceModalOpen(true, mockCombination);
      expect(useUIStore.getState().isPriceModalOpen).toBe(true);
      expect(useUIStore.getState().editingPriceCombination).toEqual(mockCombination);

      // Close modal
      useUIStore.getState().setPriceModalOpen(false, null);
      expect(useUIStore.getState().isPriceModalOpen).toBe(false);
      expect(useUIStore.getState().editingPriceCombination).toBeNull();
    });
  });
});
