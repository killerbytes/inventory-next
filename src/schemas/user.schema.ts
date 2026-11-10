import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "@/server/db/schema/users";
import z from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/constants";

/**
 * Rule for any password being *set*. The max is in bytes because bcrypt truncates
 * at 72 bytes, and multi-byte characters would reach that before 72 characters.
 */
export const NewPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} bytes long.`,
  });

export const UserBaseSchema = createInsertSchema(users, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters."),
  username: (schema) => schema.min(2, "Username must be at least 2 characters."),
  email: (schema) => schema.email("Please enter a valid email address.").nullish(),
  password: (schema) => schema.min(1, "Password is required."),
  isActive: () => z.boolean(),
  role: () => z.string(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const UserInputSchema = UserBaseSchema.extend({
  password: NewPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm Password is required."),
  isActive: z.boolean().optional(),
  role: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const LoginInputSchema = UserBaseSchema.omit({
  name: true,
  email: true,
  role: true,
  isActive: true,
});

export const ChangePasswordInputSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: NewPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/** Server-side shape of `changePasswordAction`; `userId` is only honoured for admins. */
export const ChangePasswordActionSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    oldPassword: z.string().max(256).optional(),
    newPassword: NewPasswordSchema,
  })
  .strict();

/** Bounds login input before it reaches the DB or bcrypt. No minimum on password: legacy accounts may be short. */
export const LoginCredentialsSchema = z
  .object({
    username: z.string().trim().min(1).max(255),
    password: z.string().min(1).max(256),
  })
  .strict();

export const UserUpdateSchema = UserBaseSchema.partial().strict();

export const UserSelectSchema = createSelectSchema(users);
export const UserSchema = UserSelectSchema.extend({
  role: z.string().default("USER"),
});

export const SessionUserSchema = UserSchema.omit({
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  isActive: true,
  email: true,
  password: true,
});

export type SessionUserData = z.infer<typeof SessionUserSchema>;
export type UserInput = z.infer<typeof UserInputSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
export type UserData = z.infer<typeof UserSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
export type ChangePasswordActionInput = z.infer<typeof ChangePasswordActionSchema>;
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

