import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("/app/data/db.sqlite", { create: true });
export const db = drizzle(sqlite);
