import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import invariant from "tiny-invariant";

// Load environment variables from .env file
config();

const env = process.env;

invariant(env.DATABASE_URL, "DATABASE_URL is required");

console.log(env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  schemaFilter: ["notmg"],
  verbose: true,
  strict: true,
  custom: {
    createSchema: true,
  },
});
