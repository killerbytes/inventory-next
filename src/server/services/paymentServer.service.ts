import { normalize } from "@/lib/compute";
import sequelize from "@/server/db/sequelize";
import {
  Invoice,
  Payment,
  PaymentApplication,
  Supplier,
  User,
} from "@/server/models";
import { INVOICE_STATUS, PAGINATION } from "@/types/definitions";
import { Op } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";

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
  paymentMethod?: string;
  referenceNo?: string;
  referenceNumber?: string;
  notes?: string;
  applications?: PaymentApplicationInput[];
}

export interface UpdatePaymentInput {
  amount?: number;
  amountPaid?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

export const paymentServerService = {
  get: async (id: number) => {
    return await Payment.findByPk(id, {
      include: [
        { model: Supplier, as: "supplier" },
        { model: PaymentApplication, as: "applications" },
      ],
    });
  },

  getAll: async () => {
    return await Payment.findAll({
      include: [{ model: Supplier, as: "supplier" }],
      order: [["id", "DESC"]],
    });
  },

  getPaginated: async (params: any = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      q,
      startDate,
      endDate,
      status,
      sort = "id",
      order: sortOrder = "DESC",
    } = params;

    try {
      const where: any = {};
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
        "payment.user.username": [
          { model: Payment, as: "payment" },
          { model: User, as: "user" },
          "username",
        ],
        "payment.supplier.name": [
          { model: Payment, as: "payment" },
          { model: Supplier, as: "supplier" },
          "name",
        ],
        "payment.referenceNo": [
          { model: Payment, as: "payment" },
          "referenceNo",
        ],
        "invoice.invoiceNumber": [
          { model: Invoice, as: "invoice" },
          "invoiceNumber",
        ],
      };

      const orderBy = orderByMap[sort]
        ? [...orderByMap[sort], sortOrder]
        : [sort, sortOrder];

      const { count, rows } = await PaymentApplication.findAndCountAll({
        limit,
        offset,
        order: [orderBy as any],
        where: Object.keys(where).length ? where : undefined,
        distinct: true,
        include: [
          {
            model: Payment,
            as: "payment",
            include: [
              {
                model: Supplier,
                as: "supplier",
              },
              {
                model: User,
                as: "user",
              },
            ],
          },
          {
            model: Invoice,
            as: "invoice",
            where: q ? { invoiceNumber: { [Op.iLike]: `%${q}%` } } : undefined,
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

  create: async (data: CreatePaymentInput, userId?: number) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        const paymentAmount = Number(data.amountPaid ?? data.amount ?? 0);
        const payment = await Payment.create(
          {
            supplierId: data.supplierId ? Number(data.supplierId) : null,
            amount: paymentAmount,
            referenceNo: data.referenceNumber || data.referenceNo || null,
            notes: data.notes || null,
            changedBy: userId ?? (data as any).changedBy ?? 1,
            paymentMethod: data.paymentMethod || "CASH",
          } as any,
          { transaction },
        );

        const apps = data.applications || [];
        let totalApplied = 0;

        for (const app of apps) {
          const invoice = await Invoice.findByPk(app.invoiceId, {
            transaction,
          });
          if (!invoice) {
            throw new Error("Invoice not found");
          }

          const invoicePaid = await PaymentApplication.sum("amountApplied", {
            where: { invoiceId: invoice.id },
            transaction,
          });
          const alreadyPaid = invoicePaid || 0;
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

          await PaymentApplication.create(
            {
              paymentId: payment.id,
              invoiceId: invoice.id,
              amountApplied: Number(app.amountApplied),
              amountRemaining: remaining - Number(app.amountApplied),
            },
            { transaction },
          );

          totalApplied += Number(app.amountApplied);

          if (Number(app.amountApplied) >= remaining) {
            await invoice.update(
              { status: INVOICE_STATUS.PAID },
              { transaction },
            );
          } else {
            await invoice.update(
              { status: INVOICE_STATUS.PARTIALLY_PAID },
              { transaction },
            );
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
      const payment = await Payment.findByPk(id);
      if (!payment) {
        throw new Error(`Payment with ID ${id} not found`);
      }
      return await payment.update({
        ...(data.amountPaid !== undefined || data.amount !== undefined
          ? { amount: Number(data.amountPaid ?? data.amount) }
          : {}),
        ...(data.paymentMethod !== undefined && {
          paymentMethod: data.paymentMethod,
        }),
        ...(data.referenceNumber !== undefined && {
          referenceNumber: data.referenceNumber,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        const payment = await Payment.findByPk(id, { transaction });
        if (!payment) {
          throw new Error("Payment not found");
        }

        await PaymentApplication.destroy({
          where: { paymentId: id },
          transaction,
        });
        await payment.destroy({ transaction });
        return { success: true, message: `Payment ${id} deleted successfully` };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },
};
