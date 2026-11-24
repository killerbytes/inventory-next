import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";

export const stockAdjustments = pgTable(
  "StockAdjustments",
  {
    id: serial("id").primaryKey(),
    referenceNo: varchar("referenceNo", { length: 255 }),
    combinationId: integer("combinationId"),
    systemQuantity: numeric("systemQuantity", { precision: 18, scale: 6 }).notNull().default("0"),
    newQuantity: numeric("newQuantity", { precision: 18, scale: 6 }).notNull().default("0"),
    difference: numeric("difference", { precision: 18, scale: 6 }).notNull().default("0"),
    reason: varchar("reason", { length: 255 }).notNull(),
    // varchar(255) in production: longer notes are rejected by validation, not the DB.
    notes: varchar("notes", { length: 255 }),
    createdBy: integer("createdBy").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    foreignKey({ name: "StockAdjustments_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "StockAdjustments_createdBy_fkey", columns: [table.createdBy], foreignColumns: [users.id] }).onDelete("no action").onUpdate("cascade"),
  ],
);

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
