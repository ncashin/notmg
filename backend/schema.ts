import { sql } from "drizzle-orm";
import { pgSchema, text, uuid, varchar } from "drizzle-orm/pg-core";

export const notmgSchema = pgSchema("notmg");
export const users = notmgSchema.table("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`).notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
