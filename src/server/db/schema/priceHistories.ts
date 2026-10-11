import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";

export const priceHistories = pgTable("PriceHistories", {
  id: serial("id").primaryKey(),
  productId: integer("productId").notNull(),
  combinationId: integer("combinationId"),
  fromPrice: numeric("fromPrice", { precision: 10, scale: 2 }).notNull(),
  toPrice: numeric("toPrice", { precision: 10, scale: 2 }).notNull(),
  changedBy: integer("changedBy").notNull(),
  changedAt: timestamp("changedAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const priceHistoriesRelations = relations(priceHistories, ({ one }) => ({
  user: one(users, {
    fields: [priceHistories.changedBy],
    references: [users.id],
  }),
  combination: one(productCombinations, {
    fields: [priceHistories.combinationId],
    references: [productCombinations.id],
  }),
}));
