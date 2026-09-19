"use server";

import { CategoryInput, CategoryUpdateInput } from "@/schemas";
import { categoryServerService } from "@/server/services";
import { revalidatePath } from "next/cache";

export async function getCategoriesAction() {
  const result = await categoryServerService.getAll();
  return result ? JSON.parse(JSON.stringify(result)) : [];
}

export async function createCategoryAction(data: CategoryInput) {
  const result = await categoryServerService.create(data);
  revalidatePath("/categories");
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function updateCategoryAction(
  id: number,
  data: CategoryUpdateInput,
) {
  const result = await categoryServerService.update(id, data);
  revalidatePath("/categories");
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function deleteCategoryAction(id: number) {
  const result = await categoryServerService.delete(id);
  revalidatePath("/categories");
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function updateCategorySortAction(ids: (number | string)[]) {
  const result = await categoryServerService.updateSort(ids);
  revalidatePath("/categories");
  revalidatePath("/products");
  return result;
}
