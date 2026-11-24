import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
  json,
  foreignKey,
} from "drizzle-orm/pg-core";
import { inventories } from "./inventories";
import { relations } from "drizzle-orm";
import { salesOrders } from "./salesOrders";
import { productCombinations } from "./productCombinations";

export const salesOrderItems = pgTable(
  "SalesOrderItems",
  {
    id: serial("id").primaryKey(),
    salesOrderId: integer("salesOrderId").notNull(),
    combinationId: integer("combinationId").notNull(),
    /** Legacy column from the Sequelize API; no longer written. */
    inventoryId: integer("inventoryId"),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    originalPrice: numeric("originalPrice", { precision: 10, scale: 2 }).notNull().default("0"),
    purchasePrice: numeric("purchasePrice", { precision: 10, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
    unit: varchar("unit", { length: 255 }).notNull(),
    discountNote: text("discountNote"),
    skuSnapshot: varchar("skuSnapshot", { length: 255 }).notNull().$defaultFn(() => ""),
    nameSnapshot: varchar("nameSnapshot", { length: 255 }).notNull().$defaultFn(() => ""),
    categorySnapshot: json("categorySnapshot").$type<any>().notNull(),
    variantSnapshot: json("variantSnapshot").$type<any>().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({ name: "SalesOrderItems_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "SalesOrderItems_inventoryId_fkey", columns: [table.inventoryId], foreignColumns: [inventories.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "SalesOrderItems_salesOrderId_fkey", columns: [table.salesOrderId], foreignColumns: [salesOrders.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

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
