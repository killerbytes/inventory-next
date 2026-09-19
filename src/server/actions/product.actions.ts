"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  productCombinationServerService,
  productServerService,
} from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export async function createProductAction(data: any) {
  const result = await productServerService.create(data);
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function updateProductAction(id: number, data: any) {
  const result = await productServerService.update(id, data);
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function deleteProductAction(id: number) {
  const result = await productServerService.delete(id);
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

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

export async function searchProductCombinationsAction(params: any) {
  const result = await productCombinationServerService.search(params);
  return result ? JSON.parse(JSON.stringify(result)) : [];
}

export async function lookupBarcodeAction(barcode: string) {
  try {
    const result = await productCombinationServerService.getByBarcode(barcode);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  } catch {
    return null;
  }
}

export async function getCombinationsByIdsAction(ids: (number | string)[]) {
  const result = await productCombinationServerService.getByIds(ids);
  return result ? JSON.parse(JSON.stringify(result)) : [];
}

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
