import { hasPermission, Permission } from "@/lib/rbac";
import { getSession, SessionUser } from "@/server/auth/session";
import { ActionResult } from "@/types";
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
 * Returns an ActionResult<T> discriminated union to prevent Next.js production error redaction.
 */
export function createProtectedAction<THandler extends (...args: any[]) => Promise<any>>(
  config: ProtectedActionConfig<THandler>
): (...args: Parameters<THandler>) => Promise < ActionResult < Awaited < ReturnType < THandler >>>> {
    const { permission, schema, handler } = config;

    return async (
      ...args: Parameters<THandler>
    ): Promise<ActionResult<Awaited<ReturnType<THandler>>>> => {
      try {
        const user = await getSession();
        if (!user) {
          return {
            success: false,
            error: "Unauthorized: Please sign in",
          };
        }

        if (permission && !hasPermission(user.role, permission)) {
          return {
            success: false,
            error: "Forbidden: You do not have permission to perform this action",
          };
        }

          const processedArgs = [...args] as Parameters<THandler>;
          if (schema && args.length > 0) {
            const targetIndex = args.length === 1 ? 0 : args.length - 1;
            const parseResult = schema.safeParse(args[targetIndex]);
            if (!parseResult.success) {
              const fieldErrors = parseResult.error.flatten().fieldErrors as Record<string, string[]>;
              const firstErrorMessage =
                Object.values(fieldErrors).flat()[0] ||
                parseResult.error.issues[0]?.message ||
                "Validation failed";

              return {
                success: false,
                error: firstErrorMessage,
                fieldErrors,
              };
            }
            processedArgs[targetIndex] = parseResult.data;
          }

          const result = await handler({ user }, ...processedArgs);
          return {
            success: true,
            data: result,
          };
        } catch (err: any) {
          return {
            success: false,
            error: err?.message || "An unexpected error occurred",
          };
        }
    };
  }
