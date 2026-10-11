import { pgTable, serial, varchar, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { variantValues } from "./variantTypes";
import { products } from "./products";
import { inventories } from "./inventories";
import { priceHistories } from "./priceHistories";

export const productCombinations = pgTable("ProductCombinations", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 255 }),
  barcode: varchar("barcode", { length: 255 }),
  unit: varchar("unit", { length: 50 }).notNull(),
  conversionFactor: numeric("conversionFactor", { precision: 10, scale: 2 }),
  price: numeric("price", { precision: 10, scale: 2 }),
  reorderLevel: integer("reorderLevel"),
  isBreakPack: boolean("isBreakPack").default(false),
  isBreakPackOfId: integer("isBreakPackOfId"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const combinationValues = pgTable("CombinationValues", {
  combinationId: integer("combinationId").notNull(),
  variantValueId: integer("variantValueId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
});

export const productCombinationsRelations = relations(productCombinations, ({ one, many }) => ({
  product: one(products, {
    fields: [productCombinations.productId],
    references: [products.id],
  }),
  combinationValues: many(combinationValues),
  inventory: one(inventories),
  priceHistories: many(priceHistories),
}));

export const combinationValuesRelations = relations(combinationValues, ({ one }) => ({
  combination: one(productCombinations, {
    fields: [combinationValues.combinationId],
    references: [productCombinations.id],
  }),
  value: one(variantValues, {
    fields: [combinationValues.variantValueId],
    references: [variantValues.id],
  }),
}));
