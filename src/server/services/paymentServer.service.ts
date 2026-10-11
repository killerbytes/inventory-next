import { normalize } from "@/lib/compute";
import { db } from "@/server/db/drizzle";
import { payments, paymentApplications } from "@/server/db/schema/payments";
import { invoices } from "@/server/db/schema/invoices";
import { suppliers } from "@/server/db/schema/suppliers";
import { users } from "@/server/db/schema/users";
import { INVOICE_STATUS, PAGINATION } from "@/constants";
import {
  eq,
  and,
  isNull,
  desc,
  asc,
  gte,
  lte,
  ilike,
  sql,
} from "drizzle-orm";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { getDateBounds } from "./dateFilter";

export interface PaymentApplicationInput {
  invoiceId: number;
  amountApplied: number;
}

export interface CreatePaymentInput {
  salesOrderId?: number | null;
  invoiceId?: number | null;
  supplierId?: number | null;
  amount?: number;
  amountPaid?: number;
  paymentMethod?: string | null;
  referenceNo?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  paymentDate?: Date | string | null;
  applications?: PaymentApplicationInput[];
}

export interface UpdatePaymentInput {
  amount?: number;
  amountPaid?: number;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export const paymentServerService = {
  get: async (id: number) => {
    return await db.query.payments.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.id, Number(id)), isNull(tbl.deletedAt)),
      with: {
        supplier: true,
        applications: {
          where: (tbl, { isNull }) => isNull(tbl.deletedAt),
        },
      },
    });
  },

  getAll: async () => {
    return await db.query.payments.findMany({
      where: (tbl, { isNull }) => isNull(tbl.deletedAt),
      with: {
        supplier: true,
      },
      orderBy: (tbl, { desc }) => [desc(tbl.id)],
    });
  },

  getPaginated: async (params: any = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      q,
      startDate,
      endDate,
      sort = "id",
      order: sortOrder = "DESC",
    } = params;

    try {
      const offset = (page - 1) * limit;
      const { startBound, endBound } = getDateBounds(startDate, endDate);

      const conditions: any[] = [isNull(paymentApplications.deletedAt)];

      if (startBound) {
        conditions.push(gte(paymentApplications.updatedAt, startBound));
      }
      if (endBound) {
        conditions.push(lte(paymentApplications.updatedAt, endBound));
      }

      let invoiceJoinCondition = eq(paymentApplications.invoiceId, invoices.id);
      if (q) {
        invoiceJoinCondition = and(
          eq(paymentApplications.invoiceId, invoices.id),
          ilike(invoices.invoiceNumber, `%${q}%`),
        ) as any;
      }

      const orderDir = sortOrder.toUpperCase() === "ASC" ? asc : desc;
      let orderCol: any = orderDir(paymentApplications.id);
      if (sort === "payment.referenceNo") {
        orderCol = orderDir(payments.referenceNo);
      } else if (sort === "invoice.invoiceNumber") {
        orderCol = orderDir(invoices.invoiceNumber);
      } else if (sort === "payment.supplier.name") {
        orderCol = orderDir(suppliers.name);
      } else if (sort === "payment.user.username") {
        orderCol = orderDir(users.username);
      }

      const countRes = await db
        .select({
          count: sql<number>`count(distinct ${paymentApplications.id})::int`,
        })
        .from(paymentApplications)
        .leftJoin(payments, eq(paymentApplications.paymentId, payments.id))
        .leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
        .leftJoin(users, eq(payments.changedBy, users.id))
        .innerJoin(invoices, invoiceJoinCondition)
        .where(and(...conditions));

      const total = countRes[0]?.count ?? 0;

      const rows = await db
        .select({
          application: paymentApplications,
          payment: payments,
          supplier: suppliers,
          user: users,
          invoice: invoices,
        })
        .from(paymentApplications)
        .leftJoin(payments, eq(paymentApplications.paymentId, payments.id))
        .leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
        .leftJoin(users, eq(payments.changedBy, users.id))
        .innerJoin(invoices, invoiceJoinCondition)
        .where(and(...conditions))
        .orderBy(orderCol)
        .limit(limit)
        .offset(offset);

      const formatted = rows.map((r) => ({
        ...r.application,
        payment: r.payment
          ? {
            ...r.payment,
            supplier: r.supplier,
            user: r.user,
          }
          : null,
        invoice: r.invoice,
      }));

      return {
        data: formatted,
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    } catch (error) {
      handleServiceError(error);
    }
  },

  create: async (data: CreatePaymentInput, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const paymentAmount = Number(data.amountPaid ?? data.amount ?? 0);
        const [payment] = await tx
          .insert(payments)
          .values({
            supplierId: data.supplierId ? Number(data.supplierId) : null,
            amount: String(paymentAmount),
            paymentDate: data.paymentDate
              ? new Date(data.paymentDate)
              : new Date(),
            referenceNo: data.referenceNumber || data.referenceNo || null,
            notes: data.notes || null,
            changedBy: userId ?? (data as any).changedBy ?? 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const apps = data.applications || [];
        let totalApplied = 0;

        for (const app of apps) {
          const invoice = await tx.query.invoices.findFirst({
            where: (tbl, { eq, and, isNull }) =>
              and(eq(tbl.id, Number(app.invoiceId)), isNull(tbl.deletedAt)),
          });
          if (!invoice) {
            throw new Error("Invoice not found");
          }

          const sumRes = await tx
            .select({
              total: sql<string>`coalesce(sum(${paymentApplications.amountApplied}), 0)`,
            })
            .from(paymentApplications)
            .where(
              and(
                eq(paymentApplications.invoiceId, invoice.id),
                isNull(paymentApplications.deletedAt),
              ),
            );

          const alreadyPaid = Number(sumRes[0]?.total ?? 0);
          const remaining = normalize(
            Number(invoice.totalAmount || 0) - alreadyPaid,
          );

          if (Number(app.amountApplied) > remaining) {
            throw new Error(
              `Cannot apply ₱${app.amountApplied} — only ₱${normalize(
                remaining,
              )} remaining on invoice ${invoice.id}`,
            );
          }

          await tx.insert(paymentApplications).values({
            paymentId: payment.id,
            invoiceId: invoice.id,
            amountApplied: String(Number(app.amountApplied)),
            amountRemaining: String(remaining - Number(app.amountApplied)),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          totalApplied += Number(app.amountApplied);

          if (Number(app.amountApplied) >= remaining) {
            await tx
              .update(invoices)
              .set({ status: INVOICE_STATUS.PAID, updatedAt: new Date() })
              .where(eq(invoices.id, invoice.id));
          } else {
            await tx
              .update(invoices)
              .set({
                status: INVOICE_STATUS.PARTIALLY_PAID,
                updatedAt: new Date(),
              })
              .where(eq(invoices.id, invoice.id));
          }
        }

        if (totalApplied > paymentAmount && paymentAmount > 0) {
          throw new Error(
            `Total applied ₱${totalApplied} exceeds payment amount ₱${paymentAmount}`,
          );
        }

        return payment;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: UpdatePaymentInput) => {
    try {
      const payment = await db.query.payments.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, Number(id)), isNull(tbl.deletedAt)),
      });
      if (!payment) {
        throw new Error(`Payment with ID ${id} not found`);
      }

      const updateData: any = { updatedAt: new Date() };
      if (data.amountPaid !== undefined || data.amount !== undefined) {
        updateData.amount = String(Number(data.amountPaid ?? data.amount));
      }
      if (data.referenceNumber !== undefined) {
        updateData.referenceNo = data.referenceNumber;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      const [updated] = await db
        .update(payments)
        .set(updateData)
        .where(eq(payments.id, Number(id)))
        .returning();

      return updated;
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number) => {
    try {
      return await db.transaction(async (tx) => {
        const payment = await tx.query.payments.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.id, Number(id)), isNull(tbl.deletedAt)),
        });
        if (!payment) {
          throw new Error("Payment not found");
        }

        await tx
          .update(paymentApplications)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(paymentApplications.paymentId, Number(id)));

        await tx
          .update(payments)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(payments.id, Number(id)));

        return { success: true, message: `Payment ${id} deleted successfully` };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },
};
