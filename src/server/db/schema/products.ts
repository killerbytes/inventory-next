import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  customType,
  foreignKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull, relations, sql } from "drizzle-orm";
import { categories } from "./categories";
import { variantTypes } from "./variantTypes";
import { productCombinations } from "./productCombinations";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const products = pgTable(
  "Products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    baseUnit: varchar("baseUnit", { length: 255 }).notNull(),
    categoryId: integer("categoryId").notNull(),
    sku: varchar("sku", { length: 255 }),
    searchText: tsvector("search_text").notNull().default(sql`''::tsvector`),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("idx_products_search_text").using("gin", table.searchText),
    // Partial: a soft-deleted product releases its name + unit.
    uniqueIndex("products_name_base_unit").on(table.name, table.baseUnit).where(isNull(table.deletedAt)),
    foreignKey({ name: "Products_categoryId_fkey", columns: [table.categoryId], foreignColumns: [categories.id] }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(variantTypes),
  combinations: many(productCombinations),
}));
