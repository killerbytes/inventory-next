import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products";

export const variantTypes = pgTable(
  "VariantTypes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    productId: integer("productId"),
    isTemplate: boolean("isTemplate").$defaultFn(() => false),
    isBreakpackFilter: boolean("isBreakpackFilter").default(false),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [foreignKey({ name: "VariantTypes_productId_fkey", columns: [table.productId], foreignColumns: [products.id] }).onDelete("cascade").onUpdate("cascade")],
);

export const variantValues = pgTable(
  "VariantValues",
  {
    id: serial("id").primaryKey(),
    value: varchar("value", { length: 255 }).notNull(),
    variantTypeId: integer("variantTypeId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [foreignKey({ name: "VariantValues_variantTypeId_fkey", columns: [table.variantTypeId], foreignColumns: [variantTypes.id] }).onDelete("cascade").onUpdate("cascade")],
);

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
