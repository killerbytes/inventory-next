import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { goodReceipts } from "./goodReceipts";
import { salesOrders } from "./salesOrders";

export const orderStatusHistories = pgTable("OrderStatusHistories", {
  id: serial("id").primaryKey(),
  goodReceiptId: integer("goodReceiptId"),
  salesOrderId: integer("salesOrderId"),
  status: varchar("status", { length: 50 }).notNull(),
  changedBy: integer("changedBy").notNull(),
  changedAt: timestamp("changedAt", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
});

export const orderStatusHistoriesRelations = relations(orderStatusHistories, ({ one }) => ({
  user: one(users, {
    fields: [orderStatusHistories.changedBy],
    references: [users.id],
  }),
  goodReceipt: one(goodReceipts, {
    fields: [orderStatusHistories.goodReceiptId],
    references: [goodReceipts.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [orderStatusHistories.salesOrderId],
    references: [salesOrders.id],
  }),
}));
