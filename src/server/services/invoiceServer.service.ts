import { InvoiceInput } from "@/schemas";
import sequelize from "@/server/db/sequelize";
import {
  GoodReceipt,
  Invoice,
  InvoiceLine,
  Payment,
  PaymentApplication,
  Supplier,
  User,
} from "@/server/models";
import { INVOICE_STATUS, ORDER_STATUS, PAGINATION } from "@/types/definitions";
import { Op } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";

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
  lines: any[],
  status: string,
  transaction: any,
) => {
  for (const line of lines) {
    await GoodReceipt.update(
      { status },
      { where: { id: line.goodReceiptId }, transaction },
    );
  }
};

const updateInvoice = async (
  invoice: any,
  payload: any,
  updateLines: boolean = false,
  transaction: any,
) => {
  const updateData: any = {
    ...payload,
  };
  if (payload.invoiceLines && Array.isArray(payload.invoiceLines)) {
    updateData.totalAmount = payload.invoiceLines.reduce(
      (acc: number, item: any) => acc + Number(item.amount || 0),
      0,
    );
  }
  delete updateData.invoiceLines;

  await invoice.update(updateData, { transaction });

  if (updateLines && Array.isArray(payload.invoiceLines)) {
    const lines = payload.invoiceLines.map((line: any) => ({
      goodReceiptId: Number(line.goodReceiptId),
      amount: Number(line.amount || 0),
      invoiceId: invoice.id,
    }));

    await InvoiceLine.destroy({
      where: { invoiceId: invoice.id },
      transaction,
    });
    await InvoiceLine.bulkCreate(lines, { transaction });
  }
};

export const invoiceServerService = {
  get: async (id: number) => {
    return await Invoice.findByPk(id, {
      include: [
        { model: Supplier, as: "supplier" },
        {
          model: InvoiceLine,
          as: "invoiceLines",
          include: [{ model: GoodReceipt, as: "goodReceipt" }],
        },
        {
          model: PaymentApplication,
          as: "applications",
          include: [
            {
              model: Payment,
              as: "payment",
              include: [{ model: User, as: "user" }],
            },
          ],
        },
      ],
    });
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
      const where: any = {};
      if (q) {
        where.invoiceNumber = { [Op.iLike]: `%${q}%` };
      }
      if (status) {
        where.status = status;
      }
      if (startDate || endDate) {
        where.updatedAt = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          where.updatedAt[Op.gte] = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.updatedAt[Op.lte] = end;
        }
      }

      const offset = (page - 1) * limit;

      const orderByMap: Record<string, any> = {
        "supplier.name": [{ model: Supplier, as: "supplier" }, "name"],
      };

      const orderBy = orderByMap[sort]
        ? [...orderByMap[sort], sortOrder]
        : [sort, sortOrder];

      const { count, rows } = await Invoice.findAndCountAll({
        limit,
        offset,
        order: [orderBy as any],
        where: Object.keys(where).length ? where : undefined,
        distinct: true,
        include: [
          {
            model: InvoiceLine,
            as: "invoiceLines",
            include: [{ model: GoodReceipt, as: "goodReceipt" }],
          },
          {
            model: Supplier,
            as: "supplier",
          },
        ],
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
      return await sequelize.transaction(async (transaction) => {
        const lines = data.invoiceLines || [];
        const totalAmount = lines.reduce(
          (acc, item) => acc + Number(item.amount || 0),
          0,
        );

        for (const line of lines) {
          const gr = await GoodReceipt.findByPk(line.goodReceiptId, {
            transaction,
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

        const invoice = await Invoice.create(
          {
            supplierId: Number(data.supplierId),
            invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
            invoiceDate: data.invoiceDate
              ? new Date(data.invoiceDate)
              : new Date(),
            totalAmount,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            status: data.status || INVOICE_STATUS.DRAFT,
            notes: data.notes || null,
            changedBy: userId ?? 1,
            invoiceLines: lines.map((l) => ({
              goodReceiptId: Number(l.goodReceiptId),
              amount: Number(l.amount || 0),
            })),
          } as any,
          {
            include: [
              {
                model: InvoiceLine,
                as: "invoiceLines",
              },
            ],
            transaction,
          },
        );

        if (data.status === INVOICE_STATUS.POSTED) {
          await updateGoodReceiptStatus(
            lines,
            ORDER_STATUS.COMPLETED,
            transaction,
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
      return await sequelize.transaction(async (transaction) => {
        const invoice = await Invoice.findByPk(id, { transaction });
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        switch (true) {
          case invoice.status === INVOICE_STATUS.DRAFT &&
            (data.status === INVOICE_STATUS.DRAFT || !data.status):
          case invoice.status === INVOICE_STATUS.DRAFT &&
            data.status === INVOICE_STATUS.POSTED:
            await updateInvoice(invoice, data, true, transaction);
            if (data.status === INVOICE_STATUS.POSTED) {
              const lines = await InvoiceLine.findAll({
                where: { invoiceId: invoice.id },
                transaction,
              });
              await updateGoodReceiptStatus(
                lines,
                ORDER_STATUS.COMPLETED,
                transaction,
              );
            }
            break;
          case invoice.status === INVOICE_STATUS.POSTED &&
            data.status === INVOICE_STATUS.PARTIALLY_PAID:
          case invoice.status === INVOICE_STATUS.PARTIALLY_PAID &&
            data.status === INVOICE_STATUS.PAID:
            await invoice.update({ status: data.status }, { transaction });
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
      return await sequelize.transaction(async (transaction) => {
        const invoice = await Invoice.findByPk(id, { transaction });
        if (!invoice) {
          throw new Error("Invoice not found");
        }

        if (invoice.status !== INVOICE_STATUS.DRAFT) {
          throw new Error("Invoice is not in a valid state");
        }

        await InvoiceLine.destroy({ where: { invoiceId: id }, transaction });
        await invoice.destroy({ transaction });
        return { success: true, message: `Invoice ${id} deleted successfully` };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },
};
