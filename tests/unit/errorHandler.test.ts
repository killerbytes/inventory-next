import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  DrizzleError,
  DrizzleQueryError,
  TransactionRollbackError,
} from "drizzle-orm/errors";
import {
  handleServiceError,
  withErrorHandling,
} from "@/server/services/errorHandler";

describe("handleServiceError (Unit)", () => {
  describe("Zod Validation Errors", () => {
    it("should format single field Zod error", () => {
      const schema = z.object({
        email: z.string().email(),
      });
      const parsed = schema.safeParse({ email: "invalid-email" });
      if (!parsed.success) {
        expect(() => handleServiceError(parsed.error)).toThrowError(
          "email: Invalid email",
        );
      }
    });

    it("should format multiple field Zod errors into comma-delimited string", () => {
      const schema = z.object({
        name: z.string({ required_error: "Name is required" }),
        age: z.number({ required_error: "Age is required" }),
      });
      const parsed = schema.safeParse({});
      if (!parsed.success) {
        expect(() => handleServiceError(parsed.error)).toThrowError(
          "name: Name is required, age: Age is required",
        );
      }
    });
  });

  describe("Drizzle & PostgreSQL Unique Constraint Violations (23505)", () => {
    it("should format unique violation for phone number", () => {
      const error = {
        code: "23505",
        detail: "Key (phone)=(+1234567890) already exists.",
      };
      expect(() => handleServiceError(error)).toThrowError(
        "A record with this phone number already exists.",
      );
    });

    it("should format unique violation for username", () => {
      const error = {
        code: "23505",
        detail: "Key (username)=(johndoe) already exists.",
      };
      expect(() => handleServiceError(error)).toThrowError(
        "A record with this username already exists.",
      );
    });

    it("should format unique violation for email", () => {
      const error = {
        code: "23505",
        detail: "Key (email)=(admin@example.com) already exists.",
      };
      expect(() => handleServiceError(error)).toThrowError(
        "A record with this email address already exists.",
      );
    });

    it("should format unique violation for arbitrary field name from detail", () => {
      const error = {
        code: "23505",
        detail: "Key (sku)=(SKU-999) already exists.",
      };
      expect(() => handleServiceError(error)).toThrowError(
        "A record with this sku already exists.",
      );
    });

    it("should unwrap 23505 error nested inside DrizzleQueryError", () => {
      const dbCause = {
        code: "23505",
        detail: "Key (email)=(duplicate@example.com) already exists.",
        table: "users",
        constraint: "users_email_unique",
      };
      const drizzleError = new DrizzleQueryError(
        'INSERT INTO "users" ("email") VALUES ($1)',
        ["duplicate@example.com"],
        dbCause as any,
      );

      expect(() => handleServiceError(drizzleError)).toThrowError(
        "A record with this email address already exists.",
      );
    });

    it("should fall back to constraint name or column if detail is missing", () => {
      const errorWithConstraint = {
        code: "23505",
        constraint: "users_username_unique",
      };
      expect(() => handleServiceError(errorWithConstraint)).toThrowError(
        "A record with this username already exists.",
      );

      const errorWithColumn = {
        code: "23505",
        column: "barcode",
      };
      expect(() => handleServiceError(errorWithColumn)).toThrowError(
        "A record with this barcode already exists.",
      );
    });
  });

  describe("Drizzle & PostgreSQL Foreign Key Violations (23503)", () => {
    it("should normalize direct foreign key violation error", () => {
      const error = {
        code: "23503",
        detail: 'Key (supplier_id)=(999) is not present in table "suppliers".',
      };
      expect(() => handleServiceError(error)).toThrowError(
        "Cannot process request: referenced item does not exist or is currently in use.",
      );
    });

    it("should unwrap foreign key violation wrapped in DrizzleQueryError", () => {
      const dbCause = {
        code: "23503",
        detail: 'Key (id)=(42) is still referenced from table "products".',
      };
      const drizzleError = new DrizzleQueryError(
        'DELETE FROM "categories" WHERE "id" = $1',
        [42],
        dbCause as any,
      );
      expect(() => handleServiceError(drizzleError)).toThrowError(
        "Cannot process request: referenced item does not exist or is currently in use.",
      );
    });
  });

  describe("Drizzle & PostgreSQL Not-Null Violations (23502)", () => {
    it("should format not-null violation using column property", () => {
      const error = {
        code: "23502",
        column: "name",
        table: "categories",
      };
      expect(() => handleServiceError(error)).toThrowError(
        "Field 'name' is required.",
      );
    });

    it("should format not-null violation unwrapped from DrizzleQueryError", () => {
      const dbCause = {
        code: "23502",
        detail: 'Failing row contains (1, null, 2026-01-01)',
        column: "price",
      };
      const drizzleError = new DrizzleQueryError(
        'INSERT INTO "products" ("price") VALUES ($1)',
        [null],
        dbCause as any,
      );
      expect(() => handleServiceError(drizzleError)).toThrowError(
        "Field 'price' is required.",
      );
    });
  });

  describe("Drizzle & PostgreSQL Check & Syntax Errors (23514, 22P02)", () => {
    it("should format check constraint violation (23514)", () => {
      const error = {
        code: "23514",
        constraint: "product_price_check",
      };
      expect(() => handleServiceError(error)).toThrowError(
        "Constraint check failed: product_price_check.",
      );
    });

    it("should format invalid input syntax error (22P02)", () => {
      const error = {
        code: "22P02",
        message: 'invalid input syntax for type integer: "abc"',
      };
      expect(() => handleServiceError(error)).toThrowError(
        "Invalid input syntax for database query.",
      );
    });
  });

  describe("Drizzle-Specific Errors (TransactionRollbackError, DrizzleQueryError)", () => {
    it("should normalize TransactionRollbackError", () => {
      const rollback = new TransactionRollbackError();
      expect(() => handleServiceError(rollback)).toThrowError(
        "Transaction was rolled back.",
      );
    });

    it("should sanitize DrizzleQueryError without leaking raw query and params", () => {
      const queryError = new DrizzleQueryError(
        'SELECT "secret_hash" FROM "super_secret_table" WHERE "id" = $1',
        ["super_secret_param_value"],
        new Error("Connection reset by peer"),
      );

      // Should extract underlying cause message and NOT expose SQL query string or params
      try {
        handleServiceError(queryError);
        expect.fail("Expected handleServiceError to throw");
      } catch (err: any) {
        expect(err.message).not.toContain("super_secret_table");
        expect(err.message).not.toContain("super_secret_param_value");
        expect(err.message).toBe("Connection reset by peer");
      }
    });

    it("should format general DrizzleError", () => {
      const drizzleError = new DrizzleError({
        message: "Failed to construct query: missing schema definition",
      });
      expect(() => handleServiceError(drizzleError)).toThrowError(
        "Failed to construct query: missing schema definition",
      );
    });
  });

  describe("Sequelize Handler Removal & Fallback Behavior", () => {
    it("should not use special Sequelize handling for arbitrary error objects", () => {
      // Legacy error shape without postgres code should fall through as regular error
      const legacyError = new Error("Database query failed");
      (legacyError as any).name = "SequelizeDatabaseError";
      expect(() => handleServiceError(legacyError)).toThrowError(
        "Database query failed",
      );
    });

    it("should rethrow standard Error instances unchanged", () => {
      const standardError = new Error("User not found");
      expect(() => handleServiceError(standardError)).toThrowError(
        "User not found",
      );
    });

    it("should convert primitive string errors to Error instances", () => {
      expect(() => handleServiceError("Something went wrong")).toThrowError(
        "Something went wrong",
      );
    });

    it("should handle null or undefined input", () => {
      expect(() => handleServiceError(null)).toThrowError(
        "An unexpected error occurred.",
      );
      expect(() => handleServiceError(undefined)).toThrowError(
        "An unexpected error occurred.",
      );
    });
  });

  describe("withErrorHandling Higher-Order Function", () => {
    it("should pass through result of successful async function", async () => {
      const fn = withErrorHandling(async (x: number, y: number) => x + y);
      const result = await fn(5, 7);
      expect(result).toBe(12);
    });

    it("should catch and normalize rejected error in wrapped function", async () => {
      const failingFn = withErrorHandling(async () => {
        throw {
          code: "23505",
          detail: "Key (email)=(duplicate@test.com) already exists.",
        };
      });

      await expect(failingFn()).rejects.toThrowError(
        "A record with this email address already exists.",
      );
    });
  });
});
