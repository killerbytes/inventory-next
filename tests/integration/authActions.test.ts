import bcrypt from "bcrypt";
import { loginAction, logoutAction } from "@/server/actions/auth.actions";
import { changePasswordAction } from "@/server/actions/user.actions";
import { setTestSession } from "@/server/auth/session";
import { db } from "@/server/db/drizzle";
import { userServerService } from "@/server/services/userServer.service";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { resetDatabase, setupDatabase } from "../setup";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  setTestSession(null);
});

describe("Auth & Password Actions (Integration)", () => {
  it("should block inactive users from logging in even with correct credentials", async () => {
    // Arrange
    const password = "SecretPassword123!";
    const inactiveUser = await userServerService.create({
      name: "Deactivated User",
      username: "deactivated",
      email: "deactivated@example.com",
      password,
      confirmPassword: password,
      isActive: false,
      role: "USER",
    });

    // Act: returned, not thrown, so the message survives Next.js production error redaction
    const result = await loginAction({
      username: inactiveUser.username,
      password,
    });

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(/Account is inactive/i),
    });
  });

  it("returns the same generic failure for a wrong password and an unknown username, so usernames can't be probed", async () => {
    // Arrange
    const password = "ValidPassword123!";
    await userServerService.create({
      name: "Real User",
      username: "realuser",
      email: "real@example.com",
      password,
      confirmPassword: password,
      isActive: true,
      role: "USER",
    });

    // Act
    const wrongPassword = await loginAction({ username: "realuser", password: "nope-nope" });
    const unknownUser = await loginAction({ username: "ghost", password: "nope-nope" });

    // Assert
    expect(wrongPassword).toEqual({ success: false, error: "Invalid username or password" });
    expect(unknownUser).toEqual(wrongPassword);
  });

  it("rejects oversized credentials without querying further", async () => {
    const result = await loginAction({ username: "a".repeat(300), password: "x" });
    expect(result.success).toBe(false);
  });

  it("should successfully log in active users with valid credentials", async () => {
    // Arrange
    const password = "ValidPassword123!";
    const activeUser = await userServerService.create({
      name: "Active Staff",
      username: "activestaff",
      email: "active@example.com",
      password,
      confirmPassword: password,
      isActive: true,
      role: "USER",
    });

    // Act
    const result = await loginAction({
      username: activeUser.username,
      password,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.user?.id).toBe(activeUser.id);
    expect(result.user?.username).toBe("activestaff");
  });

  it("should verify old password and update password hash on changePasswordAction", async () => {
    // Arrange
    const oldPassword = "OldPassword123!";
    const newPassword = "BrandNewPassword456!";
    const user = await userServerService.create({
      name: "Password Changer",
      username: "changer",
      email: "changer@example.com",
      password: oldPassword,
      confirmPassword: oldPassword,
      isActive: true,
      role: "USER",
    });

    setTestSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "USER",
    });

    // Act: change password for user
    const result = await changePasswordAction({
      oldPassword,
      newPassword,
    });

    // Assert
    expect(result.success).toBe(true);

    const reloaded = await db.query.users.findFirst({
      where: (tbl, { eq }) => eq(tbl.id, user.id),
    });
    expect(reloaded).not.toBeNull();
    expect(bcrypt.compareSync(newPassword, reloaded!.password)).toBe(true);
    expect(bcrypt.compareSync(oldPassword, reloaded!.password)).toBe(false);
  });

  describe("changePasswordAction input rules", () => {
    const currentPassword = "CurrentPassword123!";
    let userId: number;

    beforeEach(async () => {
      const user = await userServerService.create({
        name: "Rule Checker",
        username: "rulechecker",
        email: "rules@example.com",
        password: currentPassword,
        confirmPassword: currentPassword,
        isActive: true,
        role: "ADMIN",
      });
      userId = user.id;
      setTestSession({ id: user.id, username: user.username, name: user.name, role: "ADMIN" });
    });

    const storedHash = async () =>
      (await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, userId) }))!.password;

    it.each([
      ["shorter than the minimum", "abc"],
      ["longer than bcrypt's 72-byte limit, which would be silently truncated", "x".repeat(73)],
    ])("rejects a new password %s and leaves the stored hash unchanged", async (_label, newPassword) => {
      const before = await storedHash();

      const result = await changePasswordAction({ oldPassword: currentPassword, newPassword });

      expect(result.success).toBe(false);
      expect(await storedHash()).toBe(before);
    });

    it("rejects a non-integer target userId", async () => {
      const result = await changePasswordAction({
        userId: "1 OR 1=1" as any,
        newPassword: "AnotherPassword1!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown fields", async () => {
      const result = await changePasswordAction({
        oldPassword: currentPassword,
        newPassword: "AnotherPassword1!",
        role: "ADMIN",
      } as any);
      expect(result.success).toBe(false);
    });
  });

  it("should reject changePasswordAction when old password is incorrect", async () => {
    // Arrange
    const oldPassword = "CorrectPassword123!";
    const wrongOldPassword = "WrongPassword999!";
    const newPassword = "BrandNewPassword456!";
    const user = await userServerService.create({
      name: "Password Verifier",
      username: "verifier",
      email: "verifier@example.com",
      password: oldPassword,
      confirmPassword: oldPassword,
      isActive: true,
      role: "USER",
    });

    setTestSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role || "USER",
    });

    // Act & Assert
    expect(
      await changePasswordAction({
        oldPassword: wrongOldPassword,
        newPassword,
      }),
    ).toMatchObject({ success: false, error: expect.stringMatching(/Incorrect current password|Invalid/i) });
  });

  it("should successfully execute logoutAction and return success", async () => {
    // Arrange
    setTestSession({
      id: 1,
      username: "sessionuser",
      name: "Session User",
      role: "USER",
    });

    // Act
    const result = await logoutAction();

    // Assert
    expect(result.success).toBe(true);
  });
});

