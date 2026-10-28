import { pgTable, serial, integer, varchar, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "./customers";
import { salesOrders } from "./salesOrders";
import { users } from "./users";

export const salesInvoices = pgTable("SalesInvoices", {
  id: serial("id").primaryKey(),
  customerId: integer("customerId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 255 }).notNull().unique(),
  invoiceDate: timestamp("invoiceDate", { withTimezone: true, mode: "date" }).notNull(),
  dueDate: timestamp("dueDate", { withTimezone: true, mode: "date" }),
  status: varchar("status", { length: 50 }).default("DRAFT").notNull(),
  previousBalance: numeric("previousBalance", { precision: 10, scale: 2 }).default("0").notNull(),
  totalCharges: numeric("totalCharges", { precision: 10, scale: 2 }).notNull(),
  totalPayments: numeric("totalPayments", { precision: 10, scale: 2 }).default("0").notNull(),
  amountDue: numeric("amountDue", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  changedBy: integer("changedBy").default(1),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const salesInvoiceLines = pgTable("SalesInvoiceLines", {
  id: serial("id").primaryKey(),
  salesInvoiceId: integer("salesInvoiceId").notNull(),
  salesOrderId: integer("salesOrderId").notNull(),
  orderDate: timestamp("orderDate", { withTimezone: true, mode: "date" }),
  refNo: varchar("refNo", { length: 255 }),
  description: text("description"),
  charges: numeric("charges", { precision: 10, scale: 2 }).notNull().default("0"),
  payments: numeric("payments", { precision: 10, scale: 2 }).notNull().default("0"),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const salesInvoicesRelations = relations(salesInvoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesInvoices.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [salesInvoices.changedBy],
    references: [users.id],
  }),
  salesInvoiceLines: many(salesInvoiceLines),
}));

export const salesInvoiceLinesRelations = relations(salesInvoiceLines, ({ one }) => ({
  salesInvoice: one(salesInvoices, {
    fields: [salesInvoiceLines.salesInvoiceId],
    references: [salesInvoices.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [salesInvoiceLines.salesOrderId],
    references: [salesOrders.id],
  }),
}));
