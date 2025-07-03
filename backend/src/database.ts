import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const sqlite = new Database("database/sqlite.db");
export const database = drizzle({ client: sqlite });
