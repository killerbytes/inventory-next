import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import { DrizzleQueryError } from "drizzle-orm/errors";
import * as sessionModule from "@/server/auth/session";
import { PERMISSIONS } from "@/lib/rbac";
import { createProtectedAction } from "@/server/actions/safeAction";

vi.mock("server-only", () => ({}));

vi.mock("@/server/auth/session", () => ({
  getSession: vi.fn(),
}));

describe("createProtectedAction (Unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    age: z.number().min(18, "Must be at least 18"),
  });

  it("should return success: false with 'Unauthorized' when user session is missing", async () => {
    // Arrange: No user session
    vi.mocked(sessionModule.getSession).mockResolvedValue(null);

    const action = createProtectedAction({
      handler: async () => ({ id: 1 }),
    });

    // Act
    const result = await action();

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Unauthorized: Please sign in",
    });
  });

  it("should return success: false with 'Forbidden' when user lacks required permission", async () => {
    // Arrange: User without MANAGE_CATEGORIES permission
    vi.mocked(sessionModule.getSession).mockResolvedValue({
      id: 1,
      username: "user",
      name: "Normal User",
      role: "USER",
    });

    const action = createProtectedAction({
      permission: PERMISSIONS.MANAGE_CATEGORIES,
      handler: async () => ({ id: 1 }),
    });

    // Act
    const result = await action();

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Forbidden: You do not have permission to perform this action",
    });
  });

  it("should return success: false with fieldErrors and message when schema validation fails without throwing", async () => {
    // Arrange: Authenticated admin
    vi.mocked(sessionModule.getSession).mockResolvedValue({
      id: 99,
      username: "admin",
      name: "Admin User",
      role: "ADMIN",
    });

    const action = createProtectedAction({
      permission: PERMISSIONS.MANAGE_CATEGORIES,
      schema: testSchema,
      handler: async (_ctx, data: z.infer<typeof testSchema>) => ({
        created: data.name,
      }),
    });

    // Act: Send invalid data (name too short, age under 18)
    const result = await action({ name: "ab", age: 15 });

    // Assert: Must NOT throw an unhandled exception
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Name must be at least 3 characters|Must be at least 18/);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toContain("Name must be at least 3 characters");
      expect(result.fieldErrors?.age).toContain("Must be at least 18");
    }
  });

  it("should return success: true with data when handler succeeds", async () => {
    // Arrange: Authenticated admin
    vi.mocked(sessionModule.getSession).mockResolvedValue({
      id: 99,
      username: "admin",
      name: "Admin User",
      role: "ADMIN",
    });

    const action = createProtectedAction({
      permission: PERMISSIONS.MANAGE_CATEGORIES,
      schema: testSchema,
      handler: async (_ctx, data: z.infer<typeof testSchema>) => ({
        id: 101,
        name: data.name,
        age: data.age,
      }),
    });

    // Act: Valid data
    const result = await action({ name: "Valid Name", age: 25 });

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: 101,
        name: "Valid Name",
        age: 25,
      },
    });
  });

  it("should catch service exceptions and return success: false with error message without throwing", async () => {
    // Arrange: Authenticated admin
    vi.mocked(sessionModule.getSession).mockResolvedValue({
      id: 99,
      username: "admin",
      name: "Admin User",
      role: "ADMIN",
    });

    const action = createProtectedAction({
      permission: PERMISSIONS.MANAGE_CATEGORIES,
      handler: async () => {
        throw new Error("A record with this name already exists.");
      },
    });

    // Act
    const result = await action();

    // Assert: Must catch cleanly and return result without throwing
    expect(result).toEqual({
      success: false,
      error: "A record with this name already exists.",
    });
  });

  it.each([
    [
      "a duplicate",
      { code: "23505", detail: "Key (sku)=(SKU-1) already exists." },
      "A record with this sku already exists.",
    ],
    [
      "a record still in use",
      { code: "23503", detail: "Key (id)=(1) is still referenced." },
      "Cannot process request: referenced item does not exist or is currently in use.",
    ],
    ["an unmapped database error", { code: "40P01", message: "deadlock detected" }, "deadlock detected"],
  ])("reports %s without leaking SQL or parameters to the user", async (_case, cause, message) => {
    vi.mocked(sessionModule.getSession).mockResolvedValue({
      id: 99,
      username: "admin",
      name: "Admin User",
      role: "ADMIN",
    });
    const action = createProtectedAction({
      handler: async () => {
        throw new DrizzleQueryError('insert into "Products" values ($1)', ["secret"], cause as any);
      },
    });

    const result = await action();

    expect(result).toEqual({ success: false, error: message });
  });

  it("does not leak SQL when reading the session fails", async () => {
    vi.mocked(sessionModule.getSession).mockRejectedValue(
      new DrizzleQueryError('select * from "Users"', ["secret"], new Error("connection refused")),
    );
    const action = createProtectedAction({ handler: async () => ({ id: 1 }) });

    const result = await action();

    expect(result).toEqual({ success: false, error: "connection refused" });
  });
});

