"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  BreakPackInput,
  BreakPackInputSchema,
  StockAdjustmentInput,
  stockAdjustmentInputSchema,
} from "@/schemas";
import { productCombinationServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createStockAdjustmentAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_STOCK_ADJUSTMENTS,
  schema: stockAdjustmentInputSchema,
  handler: async ({ user }, data: StockAdjustmentInput) => {
    const result = await productCombinationServerService.stockAdjustment(
      data,
      user.id,
    );
    revalidatePath("/inventory");
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

/**
 * Executes a break-pack or re-pack inventory conversion and revalidates paths.
 */
export const breakPackAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_BREAKPACKS,
  schema: BreakPackInputSchema,
  handler: async ({ user }, data: BreakPackInput) => {
    const result = await productCombinationServerService.breakPack(
      data,
      user.id,
    );

    revalidatePath("/inventory");
    revalidatePath("/products");
    if (result?.fromInventory?.productId) {
      revalidatePath(`/products/${result.fromInventory.productId}`);
    }

    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});
