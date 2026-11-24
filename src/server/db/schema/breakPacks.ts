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

export const breakPacks = pgTable(
  "BreakPacks",
  {
    id: serial("id").primaryKey(),
    fromCombinationId: integer("fromCombinationId").notNull(),
    toCombinationId: integer("toCombinationId").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).$defaultFn(() => "1"),
    conversionFactor: numeric("conversionFactor", { precision: 18, scale: 6 }).$defaultFn(() => "1"),
    type: varchar("type", { length: 255 }).$defaultFn(() => "BREAK_PACK"),
    // No default: callers must pass the acting user (CLAUDE.md: no user-ID fallbacks).
    createdBy: integer("createdBy").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    foreignKey({ name: "BreakPacks_createdBy_fkey", columns: [table.createdBy], foreignColumns: [users.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "BreakPacks_fromCombinationId_fkey", columns: [table.fromCombinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "BreakPacks_toCombinationId_fkey", columns: [table.toCombinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade"),
  ],
);

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
