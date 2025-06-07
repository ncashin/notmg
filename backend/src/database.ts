import { drizzle } from "drizzle-orm/node-postgres";
import invariant from "tiny-invariant";

console.log(process.env);

invariant(process.env.DATABASE_URL, "DATABASE_URL must be set");
export const database = drizzle(process.env.DATABASE_URL);
