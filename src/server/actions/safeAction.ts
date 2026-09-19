import { hasPermission, Permission } from "@/lib/rbac";
import { getSession, SessionUser } from "@/server/auth/session";
import "server-only";
import { z } from "zod";

export interface ProtectedActionContext {
  user: SessionUser;
}

export interface ProtectedActionConfig<THandler extends (...args: any[]) => Promise<any>> {
  permission?: Permission;
  schema?: z.ZodSchema<any>;
  handler: (ctx: ProtectedActionContext, ...args: Parameters<THandler>) => ReturnType<THandler>;
}

/**
 * Creates a server action wrapped with authentication, RBAC authorization, and Zod input validation.
 */
export function createProtectedAction<THandler extends (...args: any[]) => Promise<any>>(
  config: ProtectedActionConfig<THandler>
): (...args: Parameters<THandler>) => ReturnType<THandler> {
  const { permission, schema, handler } = config;

  return (async (...args: Parameters<THandler>) => {
    const user = await getSession();
    if (!user) {
      throw new Error("Unauthorized: Please sign in");
    }

    if (permission && !hasPermission(user.role, permission)) {
      throw new Error("Forbidden: You do not have permission to perform this action");
    }

    const processedArgs = [...args] as Parameters<THandler>;
    if (schema && args.length > 0) {
      const targetIndex = args.length === 1 ? 0 : args.length - 1;
      processedArgs[targetIndex] = schema.parse(args[targetIndex]);
    }

    return (await handler({ user }, ...processedArgs)) as ReturnType<THandler>;
  }) as (...args: Parameters<THandler>) => ReturnType<THandler>;
}
