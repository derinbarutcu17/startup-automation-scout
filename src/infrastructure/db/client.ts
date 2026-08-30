import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import { getEnv } from "@/src/infrastructure/config/env";
import * as schema from "@/src/infrastructure/db/schema";

type DbBundle = { sql: Sql; db: PostgresJsDatabase<typeof schema> };

let bundle: DbBundle | undefined;

export function createDb(url = getEnv().DATABASE_URL): DbBundle {
  const sql = postgres(url, { max: 10, prepare: false });
  return { sql, db: drizzle(sql, { schema }) };
}

export function getDb(): DbBundle {
  bundle ??= createDb();
  return bundle;
}

export async function closeDb(): Promise<void> {
  if (bundle) {
    await bundle.sql.end();
    bundle = undefined;
  }
}
