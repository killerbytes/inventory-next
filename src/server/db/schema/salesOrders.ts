import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  numeric,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { customers } from "./customers";
import { salesOrderItems } from "./salesOrderItems";
import { orderStatusHistories } from "./orderStatusHistories";
import { returnTransactions } from "./returnTransactions";

export const salesOrders = pgTable(
  "SalesOrders",
  {
    id: serial("id").primaryKey(),
    salesOrderNumber: varchar("salesOrderNumber", { length: 255 }).unique("SalesOrders_salesOrderNumber_key"),
    customerId: integer("customerId"),
    status: varchar("status", { length: 255 }).notNull().default("DRAFT"),
    orderDate: timestamp("orderDate", { withTimezone: true, mode: "date" }),
    isDelivery: boolean("isDelivery").default(false),
    isDeliveryCompleted: boolean("isDeliveryCompleted"),
    deliveryAddress: text("deliveryAddress"),
    deliveryInstructions: text("deliveryInstructions"),
    deliveryDate: timestamp("deliveryDate", { withTimezone: true, mode: "date" }),
    cancellationReason: text("cancellationReason"),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull().$defaultFn(() => "0"),
    notes: text("notes"),
    internalNotes: text("internalNotes"),
    modeOfPayment: varchar("modeOfPayment", { length: 255 }).notNull().default("CASH"),
    // Full unique: two orders can never share a check number.
    checkNumber: varchar("checkNumber", { length: 255 }).unique("SalesOrders_checkNumber_key"),
    dueDate: timestamp("dueDate", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  // ON DELETE CASCADE in production: hard-deleting a customer deletes their orders.
  // Customers are only soft-deleted, so this is never triggered by the app.
  (table) => [foreignKey({ name: "SalesOrders_customerId_fkey", columns: [table.customerId], foreignColumns: [customers.id] }).onDelete("cascade").onUpdate("cascade")],
);

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  salesOrderItems: many(salesOrderItems),
  salesOrderStatusHistory: many(orderStatusHistories),
  returnTransactions: many(returnTransactions),
}));
