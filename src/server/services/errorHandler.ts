import {
  DrizzleError,
  DrizzleQueryError,
  TransactionRollbackError,
} from "drizzle-orm/errors";

interface DbErrorLike {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
  message?: string;
  name?: string;
  cause?: unknown;
}

/**
 * Traverses error.cause chain to extract the underlying database driver error (e.g. node-postgres).
 */
function extractDbError(error: unknown): DbErrorLike | null {
  let curr: any = error;
  while (curr) {
    if (curr.code || curr.detail || curr.constraint) {
      return curr;
    }
    if (curr.cause && typeof curr.cause === "object") {
      curr = curr.cause;
    } else {
      break;
    }
  }
  return null;
}

/**
 * Generic Service Error Handler
 * Centralizes error handling and normalization for all backend services, Drizzle ORM queries, and Zod validations.
 */
export function handleServiceError(error: any): never {
  if (!error) {
    throw new Error("An unexpected error occurred.");
  }

  // 1. Handle Zod Validation Errors
  if (
    error.name === "ZodError" ||
    (Array.isArray(error.issues) && error.issues.length > 0)
  ) {
    const issues: any[] = error.issues || error.errors || [];
    const messages = issues.map((iss) => {
      const fieldPath = Array.isArray(iss.path) ? iss.path.join(".") : "";
      return fieldPath ? `${fieldPath}: ${iss.message}` : iss.message;
    });
    throw new Error(messages.join(", ") || "Validation failed");
  }

  // 2. Extract database / driver error from Drizzle or direct driver error
  const dbErr = extractDbError(error);
  const code = dbErr?.code || error?.code;
  const detail = dbErr?.detail || error?.detail;
  const constraint = dbErr?.constraint || error?.constraint;
  const column = dbErr?.column || error?.column;

  // PostgreSQL Class 23 — Integrity Constraint Violations
  if (code === "23505") {
    // Unique violation
    let fieldStr = "";
    const detailMatch =
      typeof detail === "string" ? detail.match(/Key \((.*?)\)=/i) : null;
    if (detailMatch?.[1]) {
      fieldStr = detailMatch[1];
    } else if (column) {
      fieldStr = String(column);
    } else if (constraint) {
      fieldStr = String(constraint);
    }

    if (fieldStr.includes("phone")) {
      throw new Error("A record with this phone number already exists.");
    }
    if (fieldStr.includes("username")) {
      throw new Error("A record with this username already exists.");
    }
    if (fieldStr.includes("email")) {
      throw new Error("A record with this email address already exists.");
    }

    const item = fieldStr || "field value";
    throw new Error(`A record with this ${item} already exists.`);
  }

  if (code === "23503") {
    // Foreign key violation
    throw new Error(
      "Cannot process request: referenced item does not exist or is currently in use.",
    );
  }

  if (code === "23502") {
    // Not null violation
    const col =
      column ||
      (typeof detail === "string"
        ? detail.match(/column "(.*?)"/i)?.[1]
        : null);
    throw new Error(
      col ? `Field '${col}' is required.` : "A required field is missing.",
    );
  }

  if (code === "23514") {
    // Check violation
    throw new Error(
      constraint
        ? `Constraint check failed: ${constraint}.`
        : "A database constraint validation failed.",
    );
  }

  if (code === "22P02") {
    // Invalid input syntax
    throw new Error("Invalid input syntax for database query.");
  }

  // 3. Handle Drizzle-specific Error instances
  if (
    error instanceof TransactionRollbackError ||
    error?.name === "TransactionRollbackError" ||
    dbErr?.name === "TransactionRollbackError"
  ) {
    throw new Error("Transaction was rolled back.");
  }

  if (
    error instanceof DrizzleQueryError ||
    error?.name === "DrizzleQueryError"
  ) {
    // Sanitize query errors: do not expose raw SQL query text or params
    const safeMessage =
      (error.cause as Error)?.message ||
      dbErr?.message ||
      "Database query execution failed.";
    throw new Error(safeMessage);
  }

  if (error instanceof DrizzleError || error?.name === "DrizzleError") {
    throw new Error(error.message || "Database operation failed.");
  }

  // 4. Fallback for standard Error instances
  if (error instanceof Error) {
    throw error;
  }

  // 5. Fallback for unknown / primitive throws
  throw new Error(
    typeof error === "string" ? error : "An unexpected error occurred.",
  );
}

/**
 * Higher-order function to wrap any async service function with standardized error handling.
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleServiceError(error);
    }
  }) as T;
}

