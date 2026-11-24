import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  timestamp,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";
import { salesOrders } from "./salesOrders";
import { goodReceipts } from "./goodReceipts";

export const inventoryMovements = pgTable(
  "InventoryMovements",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 255 }).notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    costPerUnit: numeric("costPerUnit", { precision: 18, scale: 6 }),
    totalCost: numeric("totalCost", { precision: 18, scale: 6 }),
    referenceType: varchar("referenceType", { length: 255 }),
    referenceId: integer("referenceId").notNull(),
    combinationId: integer("combinationId"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_inventory_movements_updated_at").on(table.updatedAt),
    index("idx_inventory_movements_combination_id").on(table.combinationId),
    index("idx_inventory_movements_combo_id_id").on(table.combinationId, table.id),
    index("idx_inventory_movements_type").on(table.type),
    index("idx_inventory_movements_reference").on(table.referenceType, table.referenceId),
    foreignKey({ name: "InventoryMovements_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "InventoryMovements_userId_fkey", columns: [table.userId], foreignColumns: [users.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

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
