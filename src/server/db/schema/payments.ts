import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  numeric,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { users } from "./users";
import { invoices } from "./invoices";

export const payments = pgTable(
  "Payments",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplierId"),
    paymentDate: timestamp("paymentDate", { withTimezone: true, mode: "date" }),
    referenceNo: varchar("referenceNo", { length: 255 }),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    notes: varchar("notes", { length: 255 }),
    // No default: callers must pass the acting user (CLAUDE.md: no user-ID fallbacks).
    changedBy: integer("changedBy").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({ name: "Payments_changedBy_fkey", columns: [table.changedBy], foreignColumns: [users.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "Payments_supplierId_fkey", columns: [table.supplierId], foreignColumns: [suppliers.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const paymentApplications = pgTable(
  "PaymentApplications",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("paymentId"),
    invoiceId: integer("invoiceId"),
    amountApplied: numeric("amountApplied", { precision: 10, scale: 2 }),
    amountRemaining: numeric("amountRemaining", { precision: 10, scale: 2 }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({ name: "PaymentApplications_invoiceId_fkey", columns: [table.invoiceId], foreignColumns: [invoices.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "PaymentApplications_paymentId_fkey", columns: [table.paymentId], foreignColumns: [payments.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [payments.supplierId],
    references: [suppliers.id],
  }),
  user: one(users, {
    fields: [payments.changedBy],
    references: [users.id],
  }),
  applications: many(paymentApplications),
}));

export const paymentApplicationsRelations = relations(paymentApplications, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentApplications.paymentId],
    references: [payments.id],
  }),
  invoice: one(invoices, {
    fields: [paymentApplications.invoiceId],
    references: [invoices.id],
  }),
}));
