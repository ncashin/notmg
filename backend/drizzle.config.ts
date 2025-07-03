import { defineConfig } from "drizzle-kit";
import invariant from "tiny-invariant";

invariant(process.env.DATABASE_URL, "DATABASE_URL is required");
export default defineConfig({
  dialect: "sqlite",
  schema: "./schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
