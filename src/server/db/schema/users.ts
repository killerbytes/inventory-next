import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("Users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true),
  role: varchar("role", { length: 50 }).default("USER"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  deletedAt: timestamp("deletedAt"),
});
