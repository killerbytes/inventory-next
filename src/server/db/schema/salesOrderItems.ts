import { pgTable, serial, integer, varchar, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { salesOrders } from "./salesOrders";
import { productCombinations } from "./productCombinations";

export const salesOrderItems = pgTable("SalesOrderItems", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("salesOrderId").notNull(),
  combinationId: integer("combinationId").notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
  originalPrice: numeric("originalPrice", { precision: 10, scale: 2 }).notNull().default("0"),
  purchasePrice: numeric("purchasePrice", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  unit: varchar("unit", { length: 50 }).notNull(),
  discountNote: text("discountNote"),
  skuSnapshot: varchar("skuSnapshot", { length: 255 }).notNull().default(""),
  nameSnapshot: varchar("nameSnapshot", { length: 255 }).notNull().default(""),
  categorySnapshot: jsonb("categorySnapshot").$type<any>(),
  variantSnapshot: jsonb("variantSnapshot").$type<any>(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  combination: one(productCombinations, {
    fields: [salesOrderItems.combinationId],
    references: [productCombinations.id],
  }),
}));
