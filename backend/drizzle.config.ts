import { defineConfig } from "drizzle-kit";
import invariant from "tiny-invariant";

invariant(process.env.DATABASE_URL, "DATABASE_URL is required");
export default defineConfig({
  dialect: "postgresql",
  schema: "./schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schemaFilter: ["notmg"],
  verbose: true,
  strict: true,
  // @ts-ignore evil but required this seems to be an allowed option
  custom: {
    createSchema: true,
  },
});
