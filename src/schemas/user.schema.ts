import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "@/server/db/schema/users";
import z from "zod";

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
    newPassword: z
      .string()
      .min(4, "Password must be at least 4 characters long."),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

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

