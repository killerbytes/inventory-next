import { pgTable, serial, integer, numeric, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { goodReceipts } from "./goodReceipts";
import { productCombinations } from "./productCombinations";

export const goodReceiptLines = pgTable("GoodReceiptLines", {
  id: serial("id").primaryKey(),
  goodReceiptId: integer("goodReceiptId").notNull(),
  combinationId: integer("combinationId").notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
  purchasePrice: numeric("purchasePrice", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  discountNote: text("discountNote"),
  unit: varchar("unit", { length: 50 }).notNull(),
  skuSnapshot: varchar("skuSnapshot", { length: 255 }).notNull().default(""),
  nameSnapshot: varchar("nameSnapshot", { length: 255 }).notNull().default(""),
  categorySnapshot: jsonb("categorySnapshot").$type<any>(),
  variantSnapshot: jsonb("variantSnapshot").$type<any>(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});

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
