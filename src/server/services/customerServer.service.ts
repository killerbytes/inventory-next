import {
  CustomerInput,
  CustomerInputSchema,
  CustomerUpdateInput,
  CustomerUpdateSchema,
} from "@/schemas";
import "server-only";
import db from "@/server/db/drizzle";
import { customers } from "@/server/db/schema";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

export interface GetCustomerPaginatedInput {
  limit?: number;
  page?: number;
  q?: string | null;
  sort?: string;
  order?: "ASC" | "DESC";
}

export const customerServerService = {
  get: async (id: number) => {
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), isNull(customers.deletedAt)),
    });
    return customer ?? null;
  },

  getAll: async () => {
    return await db.query.customers.findMany({
      where: isNull(customers.deletedAt),
      orderBy: [asc(customers.name)],
    });
  },

  getPaginated: async (params: GetCustomerPaginatedInput = {}) => {
    const {
      limit = 50,
      page = 1,
      q = null,
      sort = "name",
      order = "ASC",
    } = params;

    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(customers.deletedAt)];
    if (q) {
      conditions.push(
        or(
          ilike(customers.address, `%${q}%`),
          ilike(customers.email, `%${q}%`),
          ilike(customers.name, `%${q}%`),
          ilike(customers.phone, `%${q}%`),
          ilike(customers.notes, `%${q}%`),
        ),
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(whereClause);

    const count = Number(countResult?.count || 0);

    const rows = await db.query.customers.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy:
        order === "DESC" ? [desc(customers.name)] : [asc(customers.name)],
    });

    return {
      data: rows,
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
      },
    };
  },

  create: async (data: CustomerInput) => {
    try {
      const validatedData = CustomerInputSchema.parse(data);
      const [created] = await db
        .insert(customers)
        .values({
          name: validatedData.name,
          email: validatedData.email || null,
          phone: validatedData.phone || null,
          address: validatedData.address || null,
          notes: validatedData.notes || null,
          isActive: validatedData.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return created;
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      const detail = err.detail || err.cause?.detail;
      if (code === "23505") {
        const error: any = new Error("Unique constraint violation");
        error.name = "SequelizeUniqueConstraintError";
        error.fields = detail?.includes("email") ? ["email"] : ["name"];
        throw error;
      }
      throw err;
    }
  },

  update: async (id: number, data: CustomerUpdateInput) => {
    const validatedData = CustomerUpdateSchema.parse(data);
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), isNull(customers.deletedAt)),
    });
    if (!existing) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    const updateValues: any = {
      ...validatedData,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(customers)
      .set(updateValues)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  },

  delete: async (id: number) => {
    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), isNull(customers.deletedAt)),
    });
    if (!existing) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    await db
      .update(customers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(customers.id, id));

    return { success: true, message: `Customer ${id} deleted successfully` };
  },
};
export default customerServerService;
