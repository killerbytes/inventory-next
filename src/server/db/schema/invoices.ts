import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  numeric,
  foreignKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull, relations } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { goodReceipts } from "./goodReceipts";
import { paymentApplications } from "./payments";

export const invoices = pgTable(
  "Invoices",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplierId"),
    // Production has both a full unique constraint and a partial one; the full one wins,
    // so a deleted invoice's number can never be reused.
    invoiceNumber: varchar("invoiceNumber", { length: 255 }).notNull().unique("Invoices_invoiceNumber_key"),
    invoiceDate: timestamp("invoiceDate", { withTimezone: true, mode: "date" }).notNull(),
    dueDate: timestamp("dueDate", { withTimezone: true, mode: "date" }).notNull(),
    status: varchar("status", { length: 255 }).default("DRAFT").notNull(),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
    notes: varchar("notes", { length: 255 }),
    // No default: callers must pass the acting user (CLAUDE.md: no user-ID fallbacks).
    changedBy: integer("changedBy").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("invoices_invoice_number").on(table.invoiceNumber).where(isNull(table.deletedAt)),
    foreignKey({ name: "Invoices_supplierId_fkey", columns: [table.supplierId], foreignColumns: [suppliers.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const invoiceLines = pgTable(
  "InvoiceLines",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoiceId"),
    goodReceiptId: integer("goodReceiptId"),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({ name: "InvoiceLines_goodReceiptId_fkey", columns: [table.goodReceiptId], foreignColumns: [goodReceipts.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "InvoiceLines_invoiceId_fkey", columns: [table.invoiceId], foreignColumns: [invoices.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

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
