import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const databaseDirectory = dirname("database/sqlite.db");
try {
  await mkdir(databaseDirectory, { recursive: true });
} catch (error) {}

const sqlite = new Database("database/sqlite.db");
export const database = drizzle({ client: sqlite });

await migrate(database, { migrationsFolder: "./migrations" });
