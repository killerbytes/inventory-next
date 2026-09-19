/**
 * Generic Service Error Handler
 * Centralizes error handling and normalization for all backend services and ORM queries.
 */
export function handleServiceError(error: any): never {
  if (!error) {
    throw new Error("An unexpected error occurred.");
  }

  // Handle Zod Validation Errors
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

  // Handle Unique Constraint Violations (PostgreSQL / SQLite / Sequelize)
  if (
    error.name === "SequelizeUniqueConstraintError" ||
    error.name === "UniqueConstraintError"
  ) {
    let fieldList: string[] = [];
    if (Array.isArray(error.fields)) {
      fieldList = error.fields;
    } else if (error.fields && typeof error.fields === "object") {
      fieldList = Object.keys(error.fields);
    }
    if (!fieldList.length && Array.isArray(error.errors)) {
      fieldList = error.errors.map((e: any) => e.path).filter(Boolean);
    }

    const fieldStr = fieldList.join(", ");

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

  // Handle Validation Errors
  if (
    error.name === "SequelizeValidationError" ||
    error.name === "ValidationError"
  ) {
    const messages =
      Array.isArray(error.errors) && error.errors.length > 0
        ? error.errors
            .map((e: any) => e.message?.replace(/^Validation error:?\s*/i, ""))
            .join(", ")
        : error.message || "Validation failed";
    throw new Error(messages);
  }

  // Handle Foreign Key Constraint Violations
  if (
    error.name === "SequelizeForeignKeyConstraintError" ||
    error.name === "ForeignKeyConstraintError"
  ) {
    throw new Error(
      "Cannot process request: referenced item does not exist or is currently in use.",
    );
  }

  if (error instanceof Error) {
    throw error;
  }

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
