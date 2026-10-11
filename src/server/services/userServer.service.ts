import bcrypt from "bcrypt";
import {
  UserInput,
  UserInputSchema,
  UserUpdateInput,
  UserUpdateSchema,
} from "@/schemas";
import { db } from "@/server/db/drizzle";
import { users } from "@/server/db/schema/users";
import { PAGINATION } from "@/constants";
import { eq, and, isNull, ne, asc, desc, ilike, or } from "drizzle-orm";
import "server-only";
import { handleServiceError } from "./errorHandler";

export interface ListUsersParams {
  q?: string | null;
  limit?: number;
  page?: number;
  sort?: string;
  order?: "ASC" | "DESC";
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}

function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export const userServerService = {
  get: async (id: number) => {
    return (
      (await db.query.users.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, Number(id)), isNull(tbl.deletedAt)),
        columns: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
        },
      })) || null
    );
  },

  getAll: async () => {
    return await db.query.users.findMany({
      where: (tbl, { isNull }) => isNull(tbl.deletedAt),
      columns: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: (tbl, { asc }) => [asc(tbl.name)],
    });
  },

  getPaginated: async (params: ListUsersParams = {}) => {
    const {
      q = null,
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      sort = "name",
      order = "ASC",
    } = params;

    try {
      const offset = (page - 1) * limit;
      const conditions: any[] = [isNull(users.deletedAt)];

      if (q) {
        conditions.push(
          or(
            ilike(users.name, `%${q}%`),
            ilike(users.email, `%${q}%`),
            ilike(users.username, `%${q}%`),
          ),
        );
      }

      const orderDir = order.toUpperCase() === "ASC" ? asc : desc;
      let orderCol: any = orderDir(users.name);
      if (sort === "username") {
        orderCol = orderDir(users.username);
      } else if (sort === "email") {
        orderCol = orderDir(users.email);
      } else if (sort === "id") {
        orderCol = orderDir(users.id);
      }

      const rows = await db.query.users.findMany({
        where: and(...conditions),
        columns: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
        },
        orderBy: orderCol,
        limit,
        offset,
      });

      const allMatching = await db.query.users.findMany({
        where: and(...conditions),
        columns: { id: true },
      });
      const count = allMatching.length;

      return {
        data: rows,
        meta: {
          total: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      handleServiceError(error);
    }
  },

  create: async (data: UserInput) => {
    const validatedData = UserInputSchema.parse(data);

    return await db.transaction(async (tx) => {
      if (validatedData.username) {
        const existingUsername = await tx.query.users.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.username, validatedData.username), isNull(tbl.deletedAt)),
        });
        if (existingUsername) {
          const err: any = new Error("Validation error");
          err.name = "SequelizeUniqueConstraintError";
          err.errors = [
            { message: "username must be unique", path: "username" },
          ];
          err.fields = { username: validatedData.username };
          throw err;
        }
      }

      if (validatedData.email) {
        const existingEmail = await tx.query.users.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.email, validatedData.email!), isNull(tbl.deletedAt)),
        });
        if (existingEmail) {
          const err: any = new Error("Validation error");
          err.name = "SequelizeUniqueConstraintError";
          err.errors = [{ message: "email must be unique", path: "email" }];
          err.fields = { email: validatedData.email };
          throw err;
        }
      }

      const [user] = await tx
        .insert(users)
        .values({
          name: validatedData.name,
          username: validatedData.username,
          email: validatedData.email || null,
          password: hashPassword(validatedData.password),
          role: (data as any).role || "USER",
          isActive:
            (data as any).isActive !== undefined
              ? (data as any).isActive
              : true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return user;
    });
  },

  update: async (id: number, data: UserUpdateInput) => {
    const validatedData = UserUpdateSchema.parse(data);
    const numId = Number(id);

    return await db.transaction(async (tx) => {
      const user = await tx.query.users.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, numId), isNull(tbl.deletedAt)),
      });
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      if (validatedData.username && validatedData.username !== user.username) {
        const existingUsername = await tx.query.users.findFirst({
          where: (tbl, { eq, and, isNull, ne }) =>
            and(
              eq(tbl.username, validatedData.username!),
              ne(tbl.id, numId),
              isNull(tbl.deletedAt),
            ),
        });
        if (existingUsername) {
          const err: any = new Error("Validation error");
          err.name = "SequelizeUniqueConstraintError";
          err.errors = [
            { message: "username must be unique", path: "username" },
          ];
          err.fields = { username: validatedData.username };
          throw err;
        }
      }

      if (validatedData.email && validatedData.email !== user.email) {
        const existingEmail = await tx.query.users.findFirst({
          where: (tbl, { eq, and, isNull, ne }) =>
            and(
              eq(tbl.email, validatedData.email!),
              ne(tbl.id, numId),
              isNull(tbl.deletedAt),
            ),
        });
        if (existingEmail) {
          const err: any = new Error("Validation error");
          err.name = "SequelizeUniqueConstraintError";
          err.errors = [{ message: "email must be unique", path: "email" }];
          err.fields = { email: validatedData.email };
          throw err;
        }
      }

      const updateData: any = { updatedAt: new Date() };
      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.username !== undefined)
        updateData.username = validatedData.username;
      if (validatedData.email !== undefined)
        updateData.email = validatedData.email;
      if (validatedData.role !== undefined) updateData.role = validatedData.role;
      if (validatedData.isActive !== undefined)
        updateData.isActive = validatedData.isActive;

      const [updated] = await tx
        .update(users)
        .set(updateData)
        .where(eq(users.id, numId))
        .returning();

      return updated;
    });
  },

  delete: async (id: number) => {
    const numId = Number(id);
    const user = await db.query.users.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.id, numId), isNull(tbl.deletedAt)),
    });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, numId));

    return { success: true, message: `User ${id} deleted successfully` };
  },

  changePassword: async (
    userId: number,
    newPassword: string,
    oldPassword?: string,
    isAdminReset: boolean = false,
  ) => {
    try {
      const numUserId = Number(userId);
      const user = await db.query.users.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, numUserId), isNull(tbl.deletedAt)),
      });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      if (!isAdminReset) {
        if (!oldPassword) {
          throw new Error("Current password is required");
        }
        if (!comparePassword(oldPassword, user.password)) {
          throw new Error("Incorrect current password");
        }
      }

      await db
        .update(users)
        .set({
          password: hashPassword(newPassword),
          updatedAt: new Date(),
        })
        .where(eq(users.id, numUserId));

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      handleServiceError(error);
    }
  },
};
