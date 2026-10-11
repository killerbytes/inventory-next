import { pgTable, serial, integer, varchar, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { invoiceLines } from "./invoices";
import { goodReceiptLines } from "./goodReceiptLines";
import { orderStatusHistories } from "./orderStatusHistories";
import { returnTransactions } from "./returnTransactions";

export const goodReceipts = pgTable("GoodReceipts", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId").notNull(),
  status: varchar("status", { length: 50 }).default("DRAFT").notNull(),
  receiptDate: timestamp("receiptDate", { withTimezone: true, mode: "date" }).notNull(),
  cancellationReason: text("cancellationReason"),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
  referenceNo: varchar("referenceNo", { length: 255 }).notNull(),
  internalNotes: text("internalNotes"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const goodReceiptsRelations = relations(goodReceipts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [goodReceipts.supplierId],
    references: [suppliers.id],
  }),
  invoiceLines: many(invoiceLines),
  goodReceiptLines: many(goodReceiptLines),
  goodReceiptStatusHistory: many(orderStatusHistories),
  returnTransactions: many(returnTransactions),
}));
