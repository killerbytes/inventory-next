import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { salesOrders } from "./salesOrders";
import { salesInvoices } from "./salesInvoices";

export const customers = pgTable("Customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: text("phone"),
  address: varchar("address", { length: 255 }),
  notes: text("notes"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  deletedAt: timestamp("deletedAt"),
});

export const customersRelations = relations(customers, ({ many }) => ({
  salesOrders: many(salesOrders),
  salesInvoices: many(salesInvoices),
}));
