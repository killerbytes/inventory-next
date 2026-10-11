import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products";

export const variantTypes = pgTable("VariantTypes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productId: integer("productId"),
  isTemplate: boolean("isTemplate").default(false),
  isBreakpackFilter: boolean("isBreakpackFilter").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const variantValues = pgTable("VariantValues", {
  id: serial("id").primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
  variantTypeId: integer("variantTypeId").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const variantTypesRelations = relations(variantTypes, ({ one, many }) => ({
  product: one(products, {
    fields: [variantTypes.productId],
    references: [products.id],
  }),
  values: many(variantValues),
}));

export const variantValuesRelations = relations(variantValues, ({ one }) => ({
  variantType: one(variantTypes, {
    fields: [variantValues.variantTypeId],
    references: [variantTypes.id],
  }),
}));
