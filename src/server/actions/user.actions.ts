"use server";

import {
  UserInput,
  UserInputSchema,
  UserUpdateInput,
  UserUpdateSchema,
} from "@/schemas";
import { getSession } from "@/server/auth/session";
import { userServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createUserAction = createProtectedAction({
  permission: "MANAGE_USERS",
  schema: UserInputSchema,
  handler: async (_ctx, input: UserInput) => {
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
  oldPassword: string;
  newPassword: string;
}) {
  const session = await getSession();
  if (!session?.id) {
    throw new Error("Unauthorized: Please sign in to change password");
  }

  return await userServerService.changePassword(
    session.id,
    data.oldPassword,
    data.newPassword,
  );
}
