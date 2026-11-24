import {
  pgTable,
  serial,
  integer,
  numeric,
  varchar,
  text,
  json,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { goodReceipts } from "./goodReceipts";
import { productCombinations } from "./productCombinations";

export const goodReceiptLines = pgTable(
  "GoodReceiptLines",
  {
    id: serial("id").primaryKey(),
    goodReceiptId: integer("goodReceiptId"),
    combinationId: integer("combinationId").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    purchasePrice: numeric("purchasePrice", { precision: 10, scale: 2 }).notNull().default("0"),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
    discountNote: text("discountNote"),
    unit: varchar("unit", { length: 255 }).notNull(),
    skuSnapshot: varchar("skuSnapshot", { length: 255 }).notNull().$defaultFn(() => ""),
    nameSnapshot: varchar("nameSnapshot", { length: 255 }).notNull().$defaultFn(() => ""),
    categorySnapshot: json("categorySnapshot").$type<any>().notNull(),
    variantSnapshot: json("variantSnapshot").$type<any>().notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    foreignKey({ name: "GoodReceiptLines_combinationId_fkey", columns: [table.combinationId], foreignColumns: [productCombinations.id] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "GoodReceiptLines_goodReceiptId_fkey", columns: [table.goodReceiptId], foreignColumns: [goodReceipts.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const goodReceiptLinesRelations = relations(goodReceiptLines, ({ one }) => ({
  goodReceipt: one(goodReceipts, {
    fields: [goodReceiptLines.goodReceiptId],
    references: [goodReceipts.id],
  }),
  combination: one(productCombinations, {
    fields: [goodReceiptLines.combinationId],
    references: [productCombinations.id],
  }),
}));
