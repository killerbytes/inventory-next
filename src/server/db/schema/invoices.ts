import { pgTable, serial, integer, varchar, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { goodReceipts } from "./goodReceipts";
import { paymentApplications } from "./payments";

export const invoices = pgTable("Invoices", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 255 }).notNull().unique(),
  invoiceDate: timestamp("invoiceDate").notNull(),
  dueDate: timestamp("dueDate"),
  status: varchar("status", { length: 50 }).default("DRAFT").notNull(),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
  notes: varchar("notes", { length: 255 }),
  changedBy: integer("changedBy").default(1),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
});

export const invoiceLines = pgTable("InvoiceLines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoiceId"),
  goodReceiptId: integer("goodReceiptId"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [invoices.supplierId],
    references: [suppliers.id],
  }),
  invoiceLines: many(invoiceLines),
  applications: many(paymentApplications),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
  goodReceipt: one(goodReceipts, {
    fields: [invoiceLines.goodReceiptId],
    references: [goodReceipts.id],
  }),
}));
