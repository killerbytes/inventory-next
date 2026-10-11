import { pgTable, serial, integer, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";

export const stockAdjustments = pgTable("StockAdjustments", {
  id: serial("id").primaryKey(),
  referenceNo: varchar("referenceNo", { length: 255 }),
  combinationId: integer("combinationId").notNull(),
  systemQuantity: numeric("systemQuantity", { precision: 18, scale: 6 }).notNull().default("0"),
  newQuantity: numeric("newQuantity", { precision: 18, scale: 6 }).notNull().default("0"),
  difference: numeric("difference", { precision: 18, scale: 6 }).notNull().default("0"),
  reason: varchar("reason", { length: 255 }).notNull(),
  notes: text("notes"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  user: one(users, {
    fields: [stockAdjustments.createdBy],
    references: [users.id],
  }),
  combination: one(productCombinations, {
    fields: [stockAdjustments.combinationId],
    references: [productCombinations.id],
  }),
}));
