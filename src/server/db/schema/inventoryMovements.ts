import { pgTable, serial, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";
import { salesOrders } from "./salesOrders";
import { goodReceipts } from "./goodReceipts";

export const inventoryMovements = pgTable("InventoryMovements", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
  costPerUnit: numeric("costPerUnit", { precision: 18, scale: 6 }),
  totalCost: numeric("totalCost", { precision: 18, scale: 6 }),
  referenceType: varchar("referenceType", { length: 255 }),
  referenceId: integer("referenceId"),
  combinationId: integer("combinationId"),
  userId: integer("userId"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
});

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  user: one(users, {
    fields: [inventoryMovements.userId],
    references: [users.id],
  }),
  combination: one(productCombinations, {
    fields: [inventoryMovements.combinationId],
    references: [productCombinations.id],
  }),
  salesOrder: one(salesOrders, {
    fields: [inventoryMovements.referenceId],
    references: [salesOrders.id],
  }),
  goodReceipt: one(goodReceipts, {
    fields: [inventoryMovements.referenceId],
    references: [goodReceipts.id],
  }),
}));
