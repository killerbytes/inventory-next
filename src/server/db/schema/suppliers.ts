import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { invoices } from "./invoices";

export const suppliers = pgTable("Suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: text("phone"),
  address: varchar("address", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
});

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  invoices: many(invoices),
}));
