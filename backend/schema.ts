import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const inventories = sqliteTable("inventories", {
  id: text("id").primaryKey().notNull(),
  userID: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const items = sqliteTable("items", {
  id: text("id").primaryKey().notNull(),
  userID: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  offsetX: integer("offset_x").notNull(),
  offsetY: integer("offset_y").notNull(),
  equipped: integer("equipped", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});
