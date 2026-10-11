import { pgTable, serial, integer, varchar, timestamp, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { suppliers } from "./suppliers";
import { users } from "./users";
import { invoices } from "./invoices";

export const payments = pgTable("Payments", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplierId"),
  paymentDate: timestamp("paymentDate", { withTimezone: true, mode: "date" }),
  referenceNo: varchar("referenceNo", { length: 255 }),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  notes: varchar("notes", { length: 255 }),
  changedBy: integer("changedBy").default(1),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const paymentApplications = pgTable("PaymentApplications", {
  id: serial("id").primaryKey(),
  paymentId: integer("paymentId"),
  invoiceId: integer("invoiceId"),
  amountApplied: numeric("amountApplied", { precision: 10, scale: 2 }),
  amountRemaining: numeric("amountRemaining", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

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
