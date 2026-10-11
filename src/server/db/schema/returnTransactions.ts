import { pgTable, serial, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { returnItems } from "./returnItems";
import { goodReceipts } from "./goodReceipts";
import { salesOrders } from "./salesOrders";

export const returnTransactions = pgTable("ReturnTransactions", {
  id: serial("id").primaryKey(),
  sourceType: varchar("sourceType", { length: 50 }).notNull(),
  referenceId: integer("referenceId").notNull(),
  totalReturnAmount: numeric("totalReturnAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalExchangeAmount: numeric("totalExchangeAmount", { precision: 10, scale: 2 }).default("0"),
  paymentDifference: numeric("paymentDifference", { precision: 10, scale: 2 }).notNull().default("0"),
  type: varchar("type", { length: 50 }).notNull().default("RETURN"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
});

export const returnTransactionsRelations = relations(returnTransactions, ({ many, one }) => ({
  returnItems: many(returnItems),
  goodReceipt: one(goodReceipts, {
    fields: [returnTransactions.referenceId],
    references: [goodReceipts.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [returnTransactions.referenceId],
    references: [salesOrders.id],
  }),
}));
