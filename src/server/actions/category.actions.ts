"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  CategoryInput,
  CategoryInputSchema,
  CategoryUpdateInput,
  CategoryUpdateSchema,
} from "@/schemas";
import { categoryServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export async function getCategoriesAction() {
  const result = await categoryServerService.getAll();
  return result ? JSON.parse(JSON.stringify(result)) : [];
}

export const createCategoryAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CATEGORIES,
  schema: CategoryInputSchema,
  handler: async (_ctx, data: CategoryInput) => {
    const result = await categoryServerService.create(data);
    revalidatePath("/categories");
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateCategoryAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CATEGORIES,
  schema: CategoryUpdateSchema,
  handler: async (_ctx, id: number, data: CategoryUpdateInput) => {
    const result = await categoryServerService.update(id, data);
    revalidatePath("/categories");
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const deleteCategoryAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CATEGORIES,
  handler: async (_ctx, id: number) => {
    const result = await categoryServerService.delete(id);
    revalidatePath("/categories");
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateCategorySortAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CATEGORIES,
  handler: async (_ctx, ids: (number | string)[]) => {
    const result = await categoryServerService.updateSort(ids);
    revalidatePath("/categories");
    revalidatePath("/products");
    return result;
  },
});
