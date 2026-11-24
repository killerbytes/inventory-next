import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  foreignKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull, relations } from "drizzle-orm";
import { variantValues } from "./variantTypes";
import { products } from "./products";
import { inventories } from "./inventories";
import { priceHistories } from "./priceHistories";

export const productCombinations = pgTable(
  "ProductCombinations",
  {
    id: serial("id").primaryKey(),
    productId: integer("productId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 255 }),
    barcode: varchar("barcode", { length: 255 }),
    unit: varchar("unit", { length: 255 }).notNull(),
    conversionFactor: numeric("conversionFactor", { precision: 18, scale: 6 }),
    price: numeric("price", { precision: 10, scale: 2 }),
    reorderLevel: integer("reorderLevel"),
    isBreakPack: boolean("isBreakPack").default(false),
    isBreakPackOfId: integer("isBreakPackOfId"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    // Partial: soft-deleted combinations release their SKU and barcode.
    uniqueIndex("unique_active_barcode").on(table.barcode).where(isNull(table.deletedAt)),
    uniqueIndex("unique_active_sku").on(table.sku).where(isNull(table.deletedAt)),
    foreignKey({ name: "ProductCombinations_isBreakPackOfId_fkey", columns: [table.isBreakPackOfId], foreignColumns: [table.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "ProductCombinations_productId_fkey", columns: [table.productId], foreignColumns: [products.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const combinationValues = pgTable(
  "CombinationValues",
  {
    combinationId: integer("combinationId").notNull(),
    variantValueId: integer("variantValueId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    foreignKey({ name: "CombinationValues_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "CombinationValues_variantValueId_fkey", columns: [table.variantValueId], foreignColumns: [variantValues.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

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
