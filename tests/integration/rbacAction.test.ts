import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import { setupDatabase, resetDatabase } from "../setup";
import { User } from "@/server/models";
import { setTestSession } from "@/server/auth/session";
import { createUserAction, changePasswordAction } from "@/server/actions/user.actions";
import { triggerBackupAction } from "@/server/actions/backup.actions";
import { deleteGoodReceiptAction } from "@/server/actions/goodReceipt.actions";
import { getDashboardDataAction } from "@/server/actions/dashboard.actions";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  setTestSession(null);
});

describe("Role-Based Access Control (RBAC) & Security Hardening (Integration)", () => {
  it("should FORBID unauthenticated callers from accessing getDashboardDataAction", async () => {
    // Arrange: No session
    setTestSession(null);

    // Act & Assert
    await expect(getDashboardDataAction()).rejects.toThrow(/Unauthorized/i);
  });

  it("should FORBID regular user from creating users via createUserAction", async () => {
    // Arrange: Regular user session
    setTestSession({
      id: 2,
      username: "regularuser",
      name: "Regular User",
      role: "User",
    });

    // Act & Assert
    await expect(
      createUserAction({
        name: "Hacker User",
        username: "hacker",
        email: "hacker@test.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      })
    ).rejects.toThrow(/Forbidden.*permission/i);
  });

  it("should FORBID regular user from triggering database backup via triggerBackupAction", async () => {
    // Arrange: Regular user session
    setTestSession({
      id: 2,
      username: "regularuser",
      name: "Regular User",
      role: "User",
    });

    // Act & Assert
    await expect(triggerBackupAction()).rejects.toThrow(/Forbidden.*permission/i);
  });

  it("should FORBID regular user from deleting good receipts via deleteGoodReceiptAction", async () => {
    // Arrange: Regular user session
    setTestSession({
      id: 2,
      username: "regularuser",
      name: "Regular User",
      role: "User",
    });

    // Act & Assert
    await expect(deleteGoodReceiptAction(1)).rejects.toThrow(/Forbidden.*permission/i);
  });

  describe("changePasswordAction Security Guardrails", () => {
    it("should REJECT unauthenticated caller even when explicit userId is provided", async () => {
      // Arrange: Unauthenticated caller attempting IDOR exploit
      setTestSession(null);

      // Act & Assert
      await expect(
        changePasswordAction({
          userId: 1,
          newPassword: "ExploitPassword123!",
        })
      ).rejects.toThrow(/Unauthorized.*sign in/i);
    });

    it("should FORBID non-admin user from changing another user's password", async () => {
      // Arrange: User 2 is logged in
      const victim = await User.create({
        name: "Victim User",
        username: "victim",
        email: "victim@test.com",
        password: User.generateHash("VictimPass123!"),
        isActive: true,
        role: "User",
      });

      setTestSession({
        id: 2,
        username: "attacker",
        name: "Attacker",
        role: "User",
      });

      // Act & Assert: User 2 tries to change User 1's (victim's) password
      await expect(
        changePasswordAction({
          userId: victim.id,
          newPassword: "NewHackedPassword123!",
        })
      ).rejects.toThrow(/Forbidden.*permission/i);
    });

    it("should require oldPassword and reject incorrect current password when changing own password", async () => {
      // Arrange
      const user = await User.create({
        name: "Self User",
        username: "selfuser",
        email: "self@test.com",
        password: User.generateHash("OriginalPassword123!"),
        isActive: true,
        role: "User",
      });

      setTestSession({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      });

      // Act & Assert: Wrong old password
      await expect(
        changePasswordAction({
          userId: user.id,
          oldPassword: "WrongPassword999!",
          newPassword: "BrandNewPassword123!",
        })
      ).rejects.toThrow(/Incorrect current password/i);

      // Act & Assert: Missing old password
      await expect(
        changePasswordAction({
          userId: user.id,
          newPassword: "BrandNewPassword123!",
        })
      ).rejects.toThrow(/Current password is required/i);
    });

    it("should ALLOW admin with MANAGE_USERS to reset another user's password without oldPassword", async () => {
      // Arrange: Target user
      const targetUser = await User.create({
        name: "Target Staff",
        username: "targetstaff",
        email: "target@test.com",
        password: User.generateHash("OldStaffPassword123!"),
        isActive: true,
        role: "User",
      });

      // Admin session (distinct from targetUser)
      setTestSession({
        id: 999,
        username: "admin",
        name: "System Admin",
        role: "ADMIN",
      });

      // Act: Admin resets password without needing staff's old password
      const result = await changePasswordAction({
        userId: targetUser.id,
        newPassword: "ResetByAdmin123!",
      });

      // Assert
      expect(result.success).toBe(true);
      const reloaded = await User.scope("withPassword").findByPk(targetUser.id);
      expect(User.validatePassword("ResetByAdmin123!", reloaded!.password)).toBe(true);
    });
  });
});
