"use server";

import { hasPermission, PERMISSIONS } from "@/lib/rbac";
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
  permission: PERMISSIONS.MANAGE_USERS,
  schema: UserInputSchema,
  handler: async (_ctx, input: UserInput) => {
    const result = await userServerService.create(input);
    revalidatePath("/users");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateUserAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_USERS,
  schema: UserUpdateSchema,
  handler: async (_ctx, id: number, input: UserUpdateInput) => {
    const result = await userServerService.update(id, input);
    revalidatePath("/users");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export async function changePasswordAction(data: {
  userId?: number;
  oldPassword?: string;
  newPassword: string;
}) {
  const session = await getSession();
  if (!session?.id) {
    throw new Error("Unauthorized: Please sign in to change password");
  }

  const targetUserId = data.userId || session.id;
  const isSelf = targetUserId === session.id;
  const isAdmin = hasPermission(session.role, PERMISSIONS.MANAGE_USERS);

  if (!isSelf && !isAdmin) {
    throw new Error(
      "Forbidden: You do not have permission to change another user's password",
    );
  }

  return await userServerService.changePassword(
    targetUserId,
    data.newPassword,
    data.oldPassword,
    isAdmin && !isSelf,
  );
}
