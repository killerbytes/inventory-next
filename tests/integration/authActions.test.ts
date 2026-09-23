import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { setupDatabase, resetDatabase } from "../setup";
import { User } from "@/server/models";
import { loginAction } from "@/server/actions/auth.actions";
import { changePasswordAction } from "@/server/actions/user.actions";
import { setTestSession } from "@/server/auth/session";

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
    const inactiveUser = await User.create({
      name: "Deactivated User",
      username: "deactivated",
      email: "deactivated@example.com",
      password: User.generateHash(password),
      isActive: false,
      role: "User",
    });

    // Act & Assert
    await expect(
      loginAction({
        username: inactiveUser.username,
        password,
      })
    ).rejects.toThrow(/Account is inactive|disabled/i);
  });

  it("should successfully log in active users with valid credentials", async () => {
    // Arrange
    const password = "ValidPassword123!";
    const activeUser = await User.create({
      name: "Active Staff",
      username: "activestaff",
      email: "active@example.com",
      password: User.generateHash(password),
      isActive: true,
      role: "User",
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
    const user = await User.create({
      name: "Password Changer",
      username: "changer",
      email: "changer@example.com",
      password: User.generateHash(oldPassword),
      isActive: true,
      role: "User",
    });

    setTestSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    // Act: change password for user
    const result = await changePasswordAction({
      userId: user.id,
      oldPassword,
      newPassword,
    });

    // Assert
    expect(result.success).toBe(true);

    const reloaded = await User.scope("withPassword").findByPk(user.id);
    expect(reloaded).not.toBeNull();
    expect(User.validatePassword(newPassword, reloaded!.password)).toBe(true);
    expect(User.validatePassword(oldPassword, reloaded!.password)).toBe(false);
  });

  it("should reject changePasswordAction when old password is incorrect", async () => {
    // Arrange
    const oldPassword = "CorrectPassword123!";
    const wrongOldPassword = "WrongPassword999!";
    const newPassword = "BrandNewPassword456!";
    const user = await User.create({
      name: "Password Verifier",
      username: "verifier",
      email: "verifier@example.com",
      password: User.generateHash(oldPassword),
      isActive: true,
      role: "User",
    });

    setTestSession({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    // Act & Assert
    await expect(
      changePasswordAction({
        userId: user.id,
        oldPassword: wrongOldPassword,
        newPassword,
      })
    ).rejects.toThrow(/Incorrect current password|Invalid/i);
  });
});
