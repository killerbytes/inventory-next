"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { variantTypesServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export async function createVariantTypeAction(data: {
  name: string;
  productId?: number;
  values?: any[];
}) {
  const result = await variantTypesServerService.create(data);
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export const updateVariantTypeAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_VARIANTS,
  handler: async (
    { user },
    id: number,
    data: { name?: string; values?: any[] },
  ) => {
    console.log(666, data);

    const result = await variantTypesServerService.update(id, data);
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export async function deleteVariantTypeAction(id: number) {
  const result = await variantTypesServerService.delete(id);
  revalidatePath("/products");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}
