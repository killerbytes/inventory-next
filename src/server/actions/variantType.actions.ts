"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { variantTypeServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import z from "zod";
import { createProtectedAction } from "./safeAction";

const CreateVariantTypeSchema = z.object({
  name: z.string().min(1, "Variant type name is required"),
  productId: z.coerce.number().optional(),
  values: z.array(z.any()).optional(),
});

const UpdateVariantTypeSchema = z.object({
  name: z.string().min(1).optional(),
  values: z.array(z.any()).optional(),
});

export const createVariantTypeAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_VARIANTS,
  schema: CreateVariantTypeSchema,
  handler: async (
    _ctx,
    data: z.infer<typeof CreateVariantTypeSchema>,
  ) => {
    const result = await variantTypeServerService.create(data);
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateVariantTypeAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_VARIANTS,
  schema: UpdateVariantTypeSchema,
  handler: async (
    _ctx,
    id: number,
    data: z.infer<typeof UpdateVariantTypeSchema>,
  ) => {
    const result = await variantTypeServerService.update(id, data);
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const deleteVariantTypeAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_VARIANTS,
  handler: async (_ctx, id: number) => {
    const result = await variantTypeServerService.delete(id);
    revalidatePath("/products");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});
