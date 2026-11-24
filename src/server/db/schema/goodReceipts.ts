import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  text,
  numeric,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { invoiceLines } from "./invoices";
import { goodReceiptLines } from "./goodReceiptLines";
import { orderStatusHistories } from "./orderStatusHistories";
import { returnTransactions } from "./returnTransactions";

export const goodReceipts = pgTable(
  "GoodReceipts",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplierId").notNull(),
    status: varchar("status", { length: 255 }).default("DRAFT"),
    receiptDate: timestamp("receiptDate", { withTimezone: true, mode: "date" }),
    cancellationReason: text("cancellationReason"),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
    referenceNo: text("referenceNo"),
    internalNotes: text("internalNotes"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [foreignKey({ name: "GoodReceipts_supplierId_fkey", columns: [table.supplierId], foreignColumns: [suppliers.id] }).onDelete("no action").onUpdate("cascade")],
);

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
