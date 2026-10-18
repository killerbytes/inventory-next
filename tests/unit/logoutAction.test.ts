import { describe, expect, it, vi, beforeEach } from "vitest";
import { logoutAction } from "@/server/actions/auth.actions";
import * as sessionModule from "@/server/auth/session";

vi.mock("@/server/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof sessionModule>();
  return {
    ...actual,
    clearSessionCookie: vi.fn(),
  };
});

describe("logoutAction (Unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully clear session cookie and return success: true", async () => {
    // Arrange
    vi.mocked(sessionModule.clearSessionCookie).mockResolvedValue(undefined);

    // Act
    const result = await logoutAction();

    // Assert
    expect(sessionModule.clearSessionCookie).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it("should catch errors from clearSessionCookie and return success: false with error message", async () => {
    // Arrange
    vi.mocked(sessionModule.clearSessionCookie).mockRejectedValue(
      new Error("Cookie store failure")
    );

    // Act
    const result = await logoutAction();

    // Assert
    expect(sessionModule.clearSessionCookie).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Cookie store failure");
  });
});
