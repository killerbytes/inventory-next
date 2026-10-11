import { InvoiceInput } from "@/schemas";
import { INVOICE_STATUS, ORDER_STATUS, PAGINATION } from "@/constants";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { getDateBounds } from "./dateFilter";
import db from "@/server/db/drizzle";
import {
  goodReceipts,
  invoiceLines,
  invoices,
  suppliers,
} from "@/server/db/schema";
import { and, asc, desc, eq, gte, ilike, isNull, lte, sql } from "drizzle-orm";

export interface ListInvoicesParams {
  q?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  limit?: number;
  page?: number;
  sort?: string;
  order?: "ASC" | "DESC";
}

const updateGoodReceiptStatus = async (
  lines: { goodReceiptId: number | null }[],
  status: string,
  tx: any,
) => {
  for (const line of lines) {
    if (line.goodReceiptId) {
      await tx
        .update(goodReceipts)
        .set({ status, updatedAt: new Date() })
        .where(eq(goodReceipts.id, line.goodReceiptId));
    }
  }
};

export const invoiceServerService = {
  get: async (id: number) => {
    const result = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
      with: {
        supplier: true,
        invoiceLines: {
          where: (lines, { isNull }) => isNull(lines.deletedAt),
          with: {
            goodReceipt: true,
          },
        },
        applications: {
          where: (apps, { isNull }) => isNull(apps.deletedAt),
          with: {
            payment: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });
    return result ?? null;
  },

  getAll: async (params: ListInvoicesParams = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      q = null,
      startDate,
      endDate,
      status,
      sort = "id",
      order: sortOrder = "DESC",
    } = params;

    try {
      const conditions: any[] = [isNull(invoices.deletedAt)];
      if (q) {
        conditions.push(ilike(invoices.invoiceNumber, `%${q}%`));
      }
      if (status) {
        conditions.push(eq(invoices.status, status));
      }
      const { startBound, endBound } = getDateBounds(startDate, endDate);
      if (startBound) {
        conditions.push(gte(invoices.updatedAt, startBound));
      }
      if (endBound) {
        conditions.push(lte(invoices.updatedAt, endBound));
      }

      const whereClause = and(...conditions);
      const offset = (page - 1) * limit;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(whereClause);

      const count = Number(countResult?.count || 0);

      const rows = await db.query.invoices.findMany({
        where: whereClause,
        limit,
        offset,
        orderBy:
          sortOrder === "DESC" ? [desc(invoices.id)] : [asc(invoices.id)],
        with: {
          supplier: true,
          invoiceLines: {
            where: (lines, { isNull }) => isNull(lines.deletedAt),
            with: {
              goodReceipt: true,
            },
          },
        },
      });

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

  getPaginated: async (params: ListInvoicesParams = {}) => {
    return await invoiceServerService.getAll(params);
  },

  create: async (data: InvoiceInput, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const lines = data.invoiceLines || [];
        const totalAmount = lines.reduce(
          (acc, item) => acc + Number(item.amount || 0),
          0,
        );

        for (const line of lines) {
          const gr = await tx.query.goodReceipts.findFirst({
            where: and(
              eq(goodReceipts.id, line.goodReceiptId),
              isNull(goodReceipts.deletedAt),
            ),
          });
          if (!gr) {
            throw new Error(
              `Good Receipt with ID ${line.goodReceiptId} not found`,
            );
          }
          if (gr.status !== ORDER_STATUS.RECEIVED) {
            throw new Error(
              `Good Receipt with ID ${line.goodReceiptId} is not in RECEIVED status`,
            );
          }
          if (Number(line.amount) > Number(gr.totalAmount)) {
            throw new Error(
              `Invoice line amount for Good Receipt ID ${line.goodReceiptId} exceeds the Good Receipt total amount`,
            );
          }
        }

        const [invoice] = await tx
          .insert(invoices)
          .values({
            supplierId: Number(data.supplierId),
            invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
            invoiceDate: data.invoiceDate
              ? new Date(data.invoiceDate)
              : new Date(),
            totalAmount: totalAmount.toString(),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            status: data.status || INVOICE_STATUS.DRAFT,
            notes: data.notes || null,
            changedBy: userId ?? 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (lines.length > 0) {
          await tx.insert(invoiceLines).values(
            lines.map((l) => ({
              invoiceId: invoice.id,
              goodReceiptId: Number(l.goodReceiptId),
              amount: Number(l.amount || 0).toString(),
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
        }

        if (data.status === INVOICE_STATUS.POSTED) {
          await updateGoodReceiptStatus(
            lines,
            ORDER_STATUS.COMPLETED,
            tx,
          );
        }

        return invoice;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: InvoiceInput) => {
    try {
      return await db.transaction(async (tx) => {
        const invoice = await tx.query.invoices.findFirst({
          where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
          with: {
            invoiceLines: {
              where: (lines, { isNull }) => isNull(lines.deletedAt),
            },
          },
        });
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        const updateData: any = {
          updatedAt: new Date(),
        };

        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.status !== undefined) updateData.status = data.status;

        const updateLines = Array.isArray(data.invoiceLines);
        if (updateLines && data.invoiceLines) {
          const totalAmount = data.invoiceLines.reduce(
            (acc: number, item: any) => acc + Number(item.amount || 0),
            0,
          );
          updateData.totalAmount = totalAmount.toString();
        }

        switch (true) {
          case invoice.status === INVOICE_STATUS.DRAFT &&
            (data.status === INVOICE_STATUS.DRAFT || !data.status):
          case invoice.status === INVOICE_STATUS.DRAFT &&
            data.status === INVOICE_STATUS.POSTED:
            if (updateLines && data.invoiceLines) {
              await tx
                .update(invoiceLines)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(
                  and(
                    eq(invoiceLines.invoiceId, invoice.id),
                    isNull(invoiceLines.deletedAt),
                  ),
                );

              const linesToInsert = data.invoiceLines.map((line: any) => ({
                goodReceiptId: Number(line.goodReceiptId),
                amount: Number(line.amount || 0).toString(),
                invoiceId: invoice.id,
                createdAt: new Date(),
                updatedAt: new Date(),
              }));

              if (linesToInsert.length > 0) {
                await tx.insert(invoiceLines).values(linesToInsert);
              }
            }

            await tx
              .update(invoices)
              .set(updateData)
              .where(eq(invoices.id, invoice.id));

            if (data.status === INVOICE_STATUS.POSTED) {
              const currentLines = await tx.query.invoiceLines.findMany({
                where: and(
                  eq(invoiceLines.invoiceId, invoice.id),
                  isNull(invoiceLines.deletedAt),
                ),
              });
              await updateGoodReceiptStatus(
                currentLines,
                ORDER_STATUS.COMPLETED,
                tx,
              );
            }
            break;
          case invoice.status === INVOICE_STATUS.POSTED &&
            data.status === INVOICE_STATUS.PARTIALLY_PAID:
          case invoice.status === INVOICE_STATUS.PARTIALLY_PAID &&
            data.status === INVOICE_STATUS.PAID:
            await tx
              .update(invoices)
              .set({ status: data.status, updatedAt: new Date() })
              .where(eq(invoices.id, invoice.id));
            break;
          default:
            throw new Error(
              `Invalid status change from ${invoice.status} to ${data.status}`,
            );
        }

        return invoice;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number) => {
    try {
      return await db.transaction(async (tx) => {
        const invoice = await tx.query.invoices.findFirst({
          where: and(eq(invoices.id, id), isNull(invoices.deletedAt)),
        });
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        if (invoice.status !== INVOICE_STATUS.DRAFT) {
          throw new Error("Invoice is not in a valid state");
        }

        const now = new Date();
        await tx
          .update(invoiceLines)
          .set({ deletedAt: now, updatedAt: now })
          .where(
            and(
              eq(invoiceLines.invoiceId, id),
              isNull(invoiceLines.deletedAt),
            ),
          );

        await tx
          .update(invoices)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(invoices.id, id));

        return { success: true, message: `Invoice ${id} deleted successfully` };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },
};
export default invoiceServerService;
