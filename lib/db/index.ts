import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let dbInstance: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (dbInstance) return dbInstance;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // Pooled HTTP connection — safe for serverless/edge and Next.js Server Components.
  const sql = neon(databaseUrl);
  dbInstance = drizzle({ client: sql, schema, casing: "snake_case" });
  return dbInstance;
}

// Backwards-compatible export for existing call sites.
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { schema };
