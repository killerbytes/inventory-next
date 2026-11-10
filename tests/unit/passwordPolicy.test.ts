import { describe, expect, it } from "vitest";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/constants";
import {
  ChangePasswordInputSchema,
  LoginInputSchema,
  UserInputSchema,
} from "@/schemas/user.schema";

const newUser = (password: string) => ({
  name: "New Staff",
  username: "newstaff",
  password,
  confirmPassword: password,
});

describe("password policy", () => {
  const tooShort = "a".repeat(PASSWORD_MIN_LENGTH - 1);
  const minimal = "a".repeat(PASSWORD_MIN_LENGTH);
  const tooLong = "a".repeat(PASSWORD_MAX_LENGTH + 1);

  it("rejects creating a user with a password below the minimum", () => {
    expect(UserInputSchema.safeParse(newUser(tooShort)).success).toBe(false);
  });

  it("accepts creating a user with a password at the minimum", () => {
    expect(UserInputSchema.safeParse(newUser(minimal)).success).toBe(true);
  });

  it("rejects passwords bcrypt would silently truncate", () => {
    expect(UserInputSchema.safeParse(newUser(tooLong)).success).toBe(false);
    expect(
      ChangePasswordInputSchema.safeParse({
        oldPassword: "old",
        newPassword: tooLong,
        confirmPassword: tooLong,
      }).success,
    ).toBe(false);
  });

  it("still lets existing accounts with short legacy passwords sign in", () => {
    expect(LoginInputSchema.safeParse({ username: "legacy", password: "a" }).success).toBe(true);
  });
});
