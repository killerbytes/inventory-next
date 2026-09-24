"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  ProductInput,
  ProductInputSchema,
  ProductUpdateInput,
  ProductUpdateSchema,
} from "@/schemas/product.schema";
import {
  productCombinationServerService,
  productServerService,
} from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createProductAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_PRODUCTS,
  schema: ProductInputSchema,
  handler: async (_ctx, data: ProductInput) => {
    const result = await productServerService.create(data);
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateProductAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_PRODUCTS,
  schema: ProductUpdateSchema,
  handler: async (_ctx, id: number, data: ProductUpdateInput) => {
    const result = await productServerService.update(id, data);
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateProductCombinationsAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_COMBINATIONS,
  handler: async ({ user }, productId: number, combinations: any) => {
    const result = await productCombinationServerService.updateByProductId(
      productId,
      combinations,
      user.id,
    );
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const searchProductCombinationsAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_PRODUCTS,
  handler: async (_ctx, params: any) => {
    const result = await productCombinationServerService.search(params);
    return result ? JSON.parse(JSON.stringify(result)) : [];
  },
});

export const getProductCombinationsByCategoryIdAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_PRODUCTS,
  handler: async (_ctx, categoryId: number) => {
    const result =
      await productCombinationServerService.getByCategoryId(categoryId);
    return result ? JSON.parse(JSON.stringify(result)) : [];
  },
});

export const lookupBarcodeAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_PRODUCTS,
  handler: async (_ctx, barcode: string) => {
    try {
      const result =
        await productCombinationServerService.getByBarcode(barcode);
      return result ? JSON.parse(JSON.stringify(result)) : null;
    } catch {
      return null;
    }
  },
});

export const getCombinationsByIdsAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_PRODUCTS,
  handler: async (_ctx, ids: (number | string)[]) => {
    const result = await productCombinationServerService.getByIds(ids);
    return result ? JSON.parse(JSON.stringify(result)) : [];
  },
});

export const updatePricesAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_COMBINATIONS,
  handler: async (
    { user },
    list: { id: number | string; newPrice: number }[],
  ) => {
    const result = await productCombinationServerService.updatePrices(
      list,
      user.id,
    );
    revalidatePath("/price-manager");
    revalidatePath("/products");
    return result;
  },
});
