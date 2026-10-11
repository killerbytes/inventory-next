import {
  SupplierInput,
  SupplierInputSchema,
  SupplierUpdateInput,
  SupplierUpdateSchema,
} from "@/schemas";
import "server-only";
import db from "@/server/db/drizzle";
import { goodReceipts, suppliers } from "@/server/db/schema";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";


export interface GetSupplierPaginatedInput {
  limit?: number;
  page?: number;
  q?: string | null;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface CreateSupplierInput {
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const supplierServerService = {
  get: async (id: number) => {
    const supplier = await db.query.suppliers.findFirst({
      where: and(eq(suppliers.id, id), isNull(suppliers.deletedAt)),
    });
    return supplier ?? null;
  },

  getAll: async (params: GetSupplierPaginatedInput = {}) => {
    const {
      limit = 50,
      page = 1,
      q = null,
      sort = "name",
      order = "ASC",
    } = params;

    const offset = (page - 1) * limit;

    const conditions: any[] = [isNull(suppliers.deletedAt)];
    if (q) {
      conditions.push(
        or(
          ilike(suppliers.address, `%${q}%`),
          ilike(suppliers.contact, `%${q}%`),
          ilike(suppliers.email, `%${q}%`),
          ilike(suppliers.name, `%${q}%`),
          ilike(suppliers.phone, `%${q}%`),
          ilike(suppliers.notes, `%${q}%`),
        ),
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(suppliers)
      .where(whereClause);

    const count = Number(countResult?.count || 0);

    const rows = await db.query.suppliers.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy:
        order === "DESC" ? [desc(suppliers.name)] : [asc(suppliers.name)],
    });

    return {
      data: rows,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
      },
    };
  },

  getByProductId: async (productId: number | string) => {
    const combos = await db.query.productCombinations.findMany({
      where: (tbl, { eq }) => eq(tbl.productId, Number(productId)),
      columns: { id: true },
    });
    if (combos.length === 0) return [];
    const comboIds = combos.map((c) => c.id);

    const lines = await db.query.goodReceiptLines.findMany({
      where: (tbl, { inArray, and }) => inArray(tbl.combinationId, comboIds),
      with: {
        goodReceipt: {
          with: {
            supplier: true,
          },
        },
        combination: {
          with: {
            combinationValues: {
              with: {
                value: true,
              },
            },
          },
        },
      },
      orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
    });

    return lines.map((line: any) => ({
      ...line,
      combination: line.combination
        ? {
            ...line.combination,
            values: (line.combination.combinationValues || [])
              .map((cv: any) => cv.value)
              .filter(Boolean),
          }
        : null,
    }));
  },

  create: async (data: SupplierInput) => {
    try {
      const validated = SupplierInputSchema.parse(data);
      const [supplier] = await db
        .insert(suppliers)
        .values({
          name: validated.name,
          contact:
            validated.contact ||
            validated.contactName ||
            validated.code ||
            null,
          email: validated.email || null,
          phone: validated.phone || null,
          address: validated.address || null,
          notes: validated.notes || null,
          isActive: validated.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return supplier;
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

  update: async (id: number, data: SupplierUpdateInput) => {
    const validated = SupplierUpdateSchema.parse(data);
    const existing = await db.query.suppliers.findFirst({
      where: and(eq(suppliers.id, id), isNull(suppliers.deletedAt)),
    });
    if (!existing) {
      throw new Error(`Supplier with ID ${id} not found`);
    }

    const updateValues: any = {
      updatedAt: new Date(),
    };
    if (validated.name !== undefined) updateValues.name = validated.name;
    if (
      validated.contact !== undefined ||
      validated.contactName !== undefined ||
      validated.code !== undefined
    ) {
      updateValues.contact =
        validated.contact ||
        validated.contactName ||
        validated.code ||
        null;
    }
    if (validated.email !== undefined) updateValues.email = validated.email;
    if (validated.phone !== undefined) updateValues.phone = validated.phone;
    if (validated.address !== undefined)
      updateValues.address = validated.address;
    if (validated.notes !== undefined) updateValues.notes = validated.notes;
    if (validated.isActive !== undefined)
      updateValues.isActive = validated.isActive;

    const [updated] = await db
      .update(suppliers)
      .set(updateValues)
      .where(eq(suppliers.id, id))
      .returning();

    return updated;
  },

  delete: async (id: number) => {
    const existing = await db.query.suppliers.findFirst({
      where: and(eq(suppliers.id, id), isNull(suppliers.deletedAt)),
    });
    if (!existing) {
      throw new Error(`Supplier with ID ${id} not found`);
    }

    const goodReceipt = await db.query.goodReceipts.findFirst({
      where: and(
        eq(goodReceipts.supplierId, id),
        isNull(goodReceipts.deletedAt),
      ),
    });
    if (goodReceipt) {
      throw new Error(`Supplier ${id} is used in GoodReceipt`);
    }

    await db
      .update(suppliers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(suppliers.id, id));

    return { success: true, message: `Supplier ${id} deleted successfully` };
  },
};
export default supplierServerService;
