import { describe, expect, it } from "vitest";
import { stockAdjustmentInputSchema } from "@/schemas/stockAdjustment.schema";

const adjustment = (overrides: Record<string, unknown> = {}) => ({
  combinationId: 1,
  newQuantity: 5,
  reason: "COUNT",
  ...overrides,
});

describe("stockAdjustmentInputSchema", () => {
  it("accepts notes up to the DB column's 255 characters", () => {
    expect(stockAdjustmentInputSchema.safeParse(adjustment({ notes: "n".repeat(255) })).success).toBe(true);
  });

  it("rejects notes over 255 characters with a validation error instead of a DB error", () => {
    const res = stockAdjustmentInputSchema.safeParse(adjustment({ notes: "n".repeat(256) }));
    expect(res.success).toBe(false);
    expect(res.error?.issues[0].message).toMatch(/255 characters/);
  });

  it.each([null, undefined, 0])(
    "requires a product (combinationId=%s) even though the DB column is nullable",
    (combinationId) => {
      expect(stockAdjustmentInputSchema.safeParse(adjustment({ combinationId })).success).toBe(false);
    },
  );
});
