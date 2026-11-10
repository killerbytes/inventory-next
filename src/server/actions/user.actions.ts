"use server";

import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import {
  ChangePasswordActionInput,
  ChangePasswordActionSchema,
  UserInput,
  UserInputSchema,
  UserUpdateInput,
  UserUpdateSchema,
} from "@/schemas";
import { setSessionCookie } from "@/server/auth/session";
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

/**
 * Any signed-in user may change their own password (old password required);
 * changing someone else's requires MANAGE_USERS. Not gated by a single
 * permission, so the self/admin check lives in the handler.
 */
export const changePasswordAction = createProtectedAction({
  schema: ChangePasswordActionSchema,
  handler: async ({ user: session }, data: ChangePasswordActionInput) => {
    const targetUserId = data.userId || session.id;
    const isSelf = targetUserId === session.id;
    const isAdmin = hasPermission(session.role, PERMISSIONS.MANAGE_USERS);

    if (!isSelf && !isAdmin) {
      throw new Error(
        "Forbidden: You do not have permission to change another user's password",
      );
    }

    const result = await userServerService.changePassword(
      targetUserId,
      data.newPassword,
      data.oldPassword,
      isAdmin && !isSelf,
    );

    // The new hash invalidates every session issued under the old password, including
    // this one; re-issue the caller's cookie so changing your own password keeps you signed in.
    if (isSelf) {
      const updated = await userServerService.getSessionRow(session.id);
      if (updated) {
        await setSessionCookie(
          {
            id: updated.id,
            name: updated.name,
            username: updated.username,
            role: updated.role || "USER",
          },
          updated.password,
        );
      }
    }

    return result;
  },
});
