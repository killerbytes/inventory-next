import { pgTable, serial, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";

export const breakPacks = pgTable("BreakPacks", {
  id: serial("id").primaryKey(),
  fromCombinationId: integer("fromCombinationId").notNull(),
  toCombinationId: integer("toCombinationId").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  conversionFactor: numeric("conversionFactor", { precision: 10, scale: 2 }).notNull().default("1"),
  type: varchar("type", { length: 255 }).notNull().default("BREAK_PACK"),
  createdBy: integer("createdBy").notNull().default(1),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const breakPacksRelations = relations(breakPacks, ({ one }) => ({
  user: one(users, {
    fields: [breakPacks.createdBy],
    references: [users.id],
  }),
  fromCombination: one(productCombinations, {
    fields: [breakPacks.fromCombinationId],
    references: [productCombinations.id],
  }),
  toCombination: one(productCombinations, {
    fields: [breakPacks.toCombinationId],
    references: [productCombinations.id],
  }),
}));
