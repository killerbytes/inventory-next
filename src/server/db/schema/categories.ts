import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const categories = pgTable(
  "Categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique("Categories_name_key"),
    description: text("description"),
    order: integer("order"),
    parentId: integer("parentId"),
  },
  (table) => [
    foreignKey({ name: "Categories_parentId_fkey", columns: [table.parentId], foreignColumns: [table.id] })
      .onDelete("set null")
      .onUpdate("cascade"),
  ],
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }),
  subCategories: many(categories, {
    relationName: "categoryHierarchy",
  }),
}));
