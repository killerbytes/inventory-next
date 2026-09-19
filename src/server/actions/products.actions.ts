"use server";

import { ProductBaseSchema, ProductInput } from "@/schemas";
import { productServerService } from "@/server/services";

import { revalidatePath } from "next/cache";

export async function createProductAction(data: ProductInput) {
  const parse = ProductBaseSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.flatten().fieldErrors };
  }
  try {
    const product = await productServerService.create(parse.data as any);
    revalidatePath("/products");
    return {
      success: true,
      data: product ? JSON.parse(JSON.stringify(product)) : null,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create product" };
  }
}

export async function updateProductAction(
  id: number,
  data: Partial<ProductInput>,
) {
  try {
    const updated = await productServerService.update(id, data as any);
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return {
      success: true,
      data: updated ? JSON.parse(JSON.stringify(updated)) : null,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update product" };
  }
}

export async function deleteProductAction(id: number) {
  try {
    const deleted = await productServerService.delete(id);
    revalidatePath("/products");
    return {
      success: true,
      data: deleted ? JSON.parse(JSON.stringify(deleted)) : null,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete product" };
  }
}
