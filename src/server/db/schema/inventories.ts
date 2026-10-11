import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { productCombinations } from "./productCombinations";

export const inventories = pgTable("Inventories", {
  id: serial("id").primaryKey(),
  combinationId: integer("combinationId").notNull(),
  averagePrice: numeric("averagePrice", { precision: 18, scale: 6 }).default("0"),
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

export const inventoriesRelations = relations(inventories, ({ one }) => ({
  combination: one(productCombinations, {
    fields: [inventories.combinationId],
    references: [productCombinations.id],
  }),
}));
