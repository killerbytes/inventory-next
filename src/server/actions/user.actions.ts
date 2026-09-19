"use server";

import {
  UserInput,
  UserInputSchema,
  UserUpdateInput,
  UserUpdateSchema,
} from "@/schemas";
import { userServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createUserAction = createProtectedAction({
  permission: "MANAGE_USERS",
  schema: UserInputSchema,
  handler: async (_ctx, input: UserInput) => {
    console.log(2323, input);

    const result = await userServerService.create(input);
    revalidatePath("/users");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateUserAction = createProtectedAction({
  permission: "MANAGE_USERS",
  schema: UserUpdateSchema,
  handler: async (_ctx, id: number, input: UserUpdateInput) => {
    const result = await userServerService.update(id, input);
    revalidatePath("/users");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export async function changePasswordAction(data: {
  password?: string;
  oldPassword?: string;
  newPassword?: string;
}) {
  return { success: true, message: "Password updated successfully" };
}
