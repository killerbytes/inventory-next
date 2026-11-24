import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productCombinations } from "./productCombinations";

export const inventories = pgTable(
  "Inventories",
  {
    id: serial("id").primaryKey(),
    // Not unique in production: inventoryIncrease locks the row, but two concurrent first
    // receipts for a new product could still insert two rows (none exist today).
    combinationId: integer("combinationId").notNull(),
    averagePrice: numeric("averagePrice", { precision: 18, scale: 6 }).default("0"),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [foreignKey({ name: "Inventories_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade")],
);

export const inventoriesRelations = relations(inventories, ({ one }) => ({
  combination: one(productCombinations, {
    fields: [inventories.combinationId],
    references: [productCombinations.id],
  }),
}));
