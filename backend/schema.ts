import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgSchema,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const notmgSchema = pgSchema("notmg");
export const users = notmgSchema.table("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
export const inventories = notmgSchema.table("inventories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`).notNull(),
  userID: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const items = notmgSchema.table("items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`).notNull(),
  userID: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  offsetX: integer("offset_x").notNull(),
  offsetY: integer("offset_y").notNull(),
  equipped: boolean("equipped").notNull().default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
