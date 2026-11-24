import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull, relations } from "drizzle-orm";
import { invoices } from "./invoices";

export const suppliers = pgTable(
  "Suppliers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    contact: varchar("contact", { length: 255 }),
    email: varchar("email", { length: 255 }),
    phone: text("phone"),
    address: varchar("address", { length: 255 }),
    notes: text("notes"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  // Partial: a soft-deleted supplier's email can be reused.
  (table) => [uniqueIndex("suppliers_email").on(table.email).where(isNull(table.deletedAt))],
);

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  invoices: many(invoices),
}));
