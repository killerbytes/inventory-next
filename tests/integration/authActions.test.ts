import bcrypt from "bcrypt";
import { loginAction } from "@/server/actions/auth.actions";
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

    // Act & Assert
    await expect(
      loginAction({
        username: inactiveUser.username,
        password,
      }),
    ).rejects.toThrow(/Account is inactive|disabled/i);
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
    await expect(
      changePasswordAction({
        oldPassword: wrongOldPassword,
        newPassword,
      }),
    ).rejects.toThrow(/Incorrect current password|Invalid/i);
  });
});

