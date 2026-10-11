import { pgTable, serial, integer, varchar, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "./customers";
import { salesOrderItems } from "./salesOrderItems";
import { orderStatusHistories } from "./orderStatusHistories";
import { returnTransactions } from "./returnTransactions";

export const salesOrders = pgTable("SalesOrders", {
  id: serial("id").primaryKey(),
  salesOrderNumber: varchar("salesOrderNumber", { length: 255 }).unique(),
  customerId: integer("customerId"),
  status: varchar("status", { length: 50 }).notNull().default("DRAFT"),
  orderDate: timestamp("orderDate", { withTimezone: true, mode: "date" }),
  isDelivery: boolean("isDelivery").default(false),
  isDeliveryCompleted: boolean("isDeliveryCompleted"),
  deliveryAddress: text("deliveryAddress"),
  deliveryInstructions: text("deliveryInstructions"),
  deliveryDate: timestamp("deliveryDate", { withTimezone: true, mode: "date" }),
  cancellationReason: text("cancellationReason"),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  internalNotes: text("internalNotes"),
  modeOfPayment: varchar("modeOfPayment", { length: 50 }).notNull().default("CASH"),
  checkNumber: varchar("checkNumber", { length: 255 }),
  dueDate: timestamp("dueDate", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  salesOrderItems: many(salesOrderItems),
  salesOrderStatusHistory: many(orderStatusHistories),
  returnTransactions: many(returnTransactions),
}));
