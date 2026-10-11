import { pgTable, serial, varchar, text, integer, timestamp, customType } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { categories } from "./categories";
import { variantTypes } from "./variantTypes";
import { productCombinations } from "./productCombinations";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const products = pgTable("Products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  baseUnit: varchar("baseUnit", { length: 50 }).notNull(),
  categoryId: integer("categoryId").notNull(),
  sku: varchar("sku", { length: 255 }),
  searchText: tsvector("search_text"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(variantTypes),
  combinations: many(productCombinations),
}));
