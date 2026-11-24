import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("Users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull().unique("Users_username_key"),
  // Full unique (not partial): a soft-deleted user still holds their email.
  email: varchar("email", { length: 255 }).unique("Users_email_key"),
  password: varchar("password", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true),
  role: varchar("role", { length: 255 }).default("USER"),
  /** Legacy column from the Sequelize API's JWT refresh flow; unused. */
  refreshToken: varchar("refreshToken", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull().$defaultFn(() => new Date()),
  deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
});
