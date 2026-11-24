import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { productCombinations } from "./productCombinations";

export const priceHistories = pgTable(
  "PriceHistories",
  {
    id: serial("id").primaryKey(),
    productId: integer("productId").notNull(),
    combinationId: integer("combinationId"),
    fromPrice: numeric("fromPrice", { precision: 10, scale: 2 }).notNull(),
    toPrice: numeric("toPrice", { precision: 10, scale: 2 }).notNull(),
    changedBy: integer("changedBy").notNull(),
    changedAt: timestamp("changedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    foreignKey({ name: "PriceHistories_changedBy_fkey", columns: [table.changedBy], foreignColumns: [users.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "PriceHistories_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade"),
  ],
);

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
