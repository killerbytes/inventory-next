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
import { returnTransactions } from "./returnTransactions";
import { productCombinations } from "./productCombinations";

export const returnItems = pgTable(
  "ReturnItems",
  {
    id: serial("id").primaryKey(),
    returnTransactionId: integer("returnTransactionId").notNull(),
    combinationId: integer("combinationId").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    unitPrice: numeric("unitPrice", { precision: 10, scale: 2 }).notNull(),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    type: varchar("type", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    foreignKey({ name: "ReturnItems_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "ReturnItems_returnTransactionId_fkey", columns: [table.returnTransactionId], foreignColumns: [returnTransactions.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  returnTransaction: one(returnTransactions, {
    fields: [returnItems.returnTransactionId],
    references: [returnTransactions.id],
  }),
  combination: one(productCombinations, {
    fields: [returnItems.combinationId],
    references: [productCombinations.id],
  }),
}));
