import {
  calculateStatementBalances,
  DEFAULT_STATEMENT_NOTES,
  SalesInvoiceInput,
} from "@/schemas/salesInvoice.schema";
import { INVOICE_STATUS, ORDER_STATUS, PAGINATION } from "@/constants";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { getDateBounds } from "./dateFilter";
import { db } from "@/server/db/drizzle";
import {
  customers,
  salesInvoiceLines,
  salesInvoices,
  salesOrders,
  users,
} from "@/server/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { format } from "date-fns";
import { getNextSequence } from "@/lib/sequence";

export interface ListSalesInvoicesParams {
  q?: string | null;
  customerId?: number | string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  limit?: number;
  page?: number;
  sort?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
}

export const salesInvoiceServerService = {
  get: async (id: number, tx?: any) => {
    const client = tx || db;
    const result = await client.query.salesInvoices.findFirst({
      where: and(eq(salesInvoices.id, Number(id)), isNull(salesInvoices.deletedAt)),
      with: {
        customer: true,
        user: true,
        salesInvoiceLines: {
          where: (lines: any, { isNull }: any) => isNull(lines.deletedAt),
          orderBy: (lines: any, { asc }: any) => asc(lines.id),
          with: {
            salesOrder: true,
          },
        },
      },
    });
    return result ?? null;
  },

  getAll: async (params: ListSalesInvoicesParams = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      q = null,
      customerId = null,
      startDate,
      endDate,
      status,
      sort = "id",
      order: sortOrder = "DESC",
    } = params;

    try {
      const conditions: any[] = [isNull(salesInvoices.deletedAt)];

      if (q) {
        conditions.push(ilike(salesInvoices.invoiceNumber, `%${q}%`));
      }
      if (customerId) {
        conditions.push(eq(salesInvoices.customerId, Number(customerId)));
      }
      if (status && status !== "ALL") {
        conditions.push(eq(salesInvoices.status, status));
      }

      const { startBound, endBound } = getDateBounds(startDate, endDate);
      if (startBound) {
        conditions.push(gte(salesInvoices.invoiceDate, startBound));
      }
      if (endBound) {
        conditions.push(lte(salesInvoices.invoiceDate, endBound));
      }

      const whereClause = and(...conditions);
      const offset = (page - 1) * limit;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(salesInvoices)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      const orderDir = sortOrder.toUpperCase() === "ASC" ? asc : desc;
      const orderCol =
        sort === "invoiceNumber"
          ? orderDir(salesInvoices.invoiceNumber)
          : sort === "invoiceDate"
            ? orderDir(salesInvoices.invoiceDate)
            : sort === "amountDue"
              ? orderDir(salesInvoices.amountDue)
              : orderDir(salesInvoices.id);

      const rows = await db.query.salesInvoices.findMany({
        where: whereClause,
        with: {
          customer: true,
          salesInvoiceLines: {
            where: (lines: any, { isNull }: any) => isNull(lines.deletedAt),
            with: {
              salesOrder: true,
            },
          },
        },
        orderBy: [orderCol],
        limit,
        offset,
      });

      return {
        data: rows,
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

  create: async (data: SalesInvoiceInput, userId?: number) => {
    try {
      const rawLines = data.salesInvoiceLines || [];
      if (!rawLines || rawLines.length === 0) {
        throw new Error("At least one sales order line is required to generate an invoice.");
      }

      return await db.transaction(async (tx) => {
        let invoiceNumber = data.invoiceNumber;
        if (!invoiceNumber) {
          const currentYearMonth = format(new Date(), "yyyy-MM");
          const nextval = await getNextSequence("sales_invoice_seq");
          invoiceNumber = `SI-${currentYearMonth}-${String(nextval).padStart(4, "0")}`;
        }

        const calculated = calculateStatementBalances(rawLines, Number(data.previousBalance || 0));

        const [invoice] = await tx
          .insert(salesInvoices)
          .values({
            customerId: Number(data.customerId),
            invoiceNumber,
            invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            status: data.status || INVOICE_STATUS.DRAFT,
            previousBalance: String(calculated.previousBalance),
            totalCharges: String(calculated.totalCharges),
            totalPayments: String(calculated.totalPayments),
            amountDue: String(calculated.amountDue),
            notes: data.notes ?? DEFAULT_STATEMENT_NOTES,
            changedBy: userId ?? 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (calculated.lines.length > 0) {
          await tx.insert(salesInvoiceLines).values(
            calculated.lines.map((l) => ({
              salesInvoiceId: invoice.id,
              salesOrderId: Number(l.salesOrderId),
              orderDate: l.orderDate ? new Date(l.orderDate) : null,
              refNo: l.refNo || null,
              description: l.description || null,
              charges: String(l.charges || 0),
              payments: String(l.payments || 0),
              balance: String(l.balance || 0),
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          );
        }

        return await salesInvoiceServerService.get(invoice.id, tx);
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: any, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx.query.salesInvoices.findFirst({
          where: and(eq(salesInvoices.id, id), isNull(salesInvoices.deletedAt)),
          with: {
            salesInvoiceLines: {
              where: (lines: any, { isNull }: any) => isNull(lines.deletedAt),
            },
          },
        });

        if (!existing) {
          throw new Error("Sales Invoice not found");
        }

        if (existing.status !== INVOICE_STATUS.DRAFT) {
          throw new Error(`Cannot modify a sales invoice with status ${existing.status}`);
        }

        const updateData: any = {
          updatedAt: new Date(),
          changedBy: userId ?? 1,
        };

        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        if (data.invoiceDate !== undefined) updateData.invoiceDate = new Date(data.invoiceDate);

        if (Array.isArray(data.salesInvoiceLines) && data.salesInvoiceLines.length > 0) {
          const calculated = calculateStatementBalances(
            data.salesInvoiceLines,
            Number(data.previousBalance ?? existing.previousBalance ?? 0)
          );

          updateData.previousBalance = String(calculated.previousBalance);
          updateData.totalCharges = String(calculated.totalCharges);
          updateData.totalPayments = String(calculated.totalPayments);
          updateData.amountDue = String(calculated.amountDue);

          // Replace lines
          await tx.delete(salesInvoiceLines).where(eq(salesInvoiceLines.salesInvoiceId, id));
          await tx.insert(salesInvoiceLines).values(
            calculated.lines.map((l) => ({
              salesInvoiceId: id,
              salesOrderId: Number(l.salesOrderId),
              orderDate: l.orderDate ? new Date(l.orderDate) : null,
              refNo: l.refNo || null,
              description: l.description || null,
              charges: String(l.charges || 0),
              payments: String(l.payments || 0),
              balance: String(l.balance || 0),
              createdAt: new Date(),
              updatedAt: new Date(),
            }))
          );
        }

        await tx.update(salesInvoices).set(updateData).where(eq(salesInvoices.id, id));
        return await salesInvoiceServerService.get(id, tx);
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  postInvoice: async (id: number, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx.query.salesInvoices.findFirst({
          where: and(eq(salesInvoices.id, id), isNull(salesInvoices.deletedAt)),
        });

        if (!existing) {
          throw new Error("Sales Invoice not found");
        }

        if (existing.status !== INVOICE_STATUS.DRAFT) {
          throw new Error(`Only DRAFT invoices can be posted. Current status: ${existing.status}`);
        }

        await tx
          .update(salesInvoices)
          .set({
            status: INVOICE_STATUS.POSTED,
            changedBy: userId ?? 1,
            updatedAt: new Date(),
          })
          .where(eq(salesInvoices.id, id));

        return await salesInvoiceServerService.get(id, tx);
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  voidInvoice: async (id: number, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx.query.salesInvoices.findFirst({
          where: and(eq(salesInvoices.id, id), isNull(salesInvoices.deletedAt)),
        });

        if (!existing) {
          throw new Error("Sales Invoice not found");
        }

        if (existing.status === "VOID") {
          throw new Error("Cannot void an invoice that is already VOID");
        }

        await tx
          .update(salesInvoices)
          .set({
            status: "VOID",
            changedBy: userId ?? 1,
            updatedAt: new Date(),
          })
          .where(eq(salesInvoices.id, id));

        return await salesInvoiceServerService.get(id, tx);
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const existing = await tx.query.salesInvoices.findFirst({
          where: and(eq(salesInvoices.id, id), isNull(salesInvoices.deletedAt)),
        });

        if (!existing) {
          throw new Error("Sales Invoice not found");
        }

        if (existing.status !== INVOICE_STATUS.DRAFT) {
          throw new Error("Only DRAFT sales invoices can be deleted");
        }

        const now = new Date();
        await tx
          .update(salesInvoices)
          .set({ deletedAt: now, changedBy: userId ?? 1, updatedAt: now })
          .where(eq(salesInvoices.id, id));

        await tx
          .update(salesInvoiceLines)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(salesInvoiceLines.salesInvoiceId, id));

        return true;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  getUninvoicedSalesOrders: async (customerId: number, tx?: any) => {
    const client = tx || db;
    // Active invoiced sales order IDs (non-deleted, non-void invoices)
    const activeInvoicedLines = await client
      .select({ salesOrderId: salesInvoiceLines.salesOrderId })
      .from(salesInvoiceLines)
      .innerJoin(
        salesInvoices,
        and(
          eq(salesInvoiceLines.salesInvoiceId, salesInvoices.id),
          isNull(salesInvoices.deletedAt),
          sql`${salesInvoices.status} != 'VOID'`
        )
      )
      .where(isNull(salesInvoiceLines.deletedAt));

    const invoicedOrderIds = activeInvoicedLines
      .map((l: any) => l.salesOrderId)
      .filter(Boolean);

    const conditions: any[] = [
      eq(salesOrders.customerId, Number(customerId)),
      inArray(salesOrders.status, [ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED]),
      isNull(salesOrders.deletedAt),
    ];

    if (invoicedOrderIds.length > 0) {
      conditions.push(sql`${salesOrders.id} NOT IN (${sql.join(invoicedOrderIds, sql`, `)})`);
    }

    return await client.query.salesOrders.findMany({
      where: and(...conditions),
      orderBy: (tbl: any, { desc }: any) => desc(tbl.orderDate),
    });
  },
};
