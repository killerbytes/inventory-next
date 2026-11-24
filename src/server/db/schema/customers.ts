import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { isNull } from "drizzle-orm";

export const customers = pgTable(
  "Customers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: text("phone"),
    address: varchar("address", { length: 255 }),
    notes: text("notes"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
  },
  // Partial: a soft-deleted customer's email can be reused.
  (table) => [uniqueIndex("customers_email").on(table.email).where(isNull(table.deletedAt))],
);
