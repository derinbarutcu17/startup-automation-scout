import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "@/src/infrastructure/db/client";
import { getEnv } from "@/src/infrastructure/config/env";

export async function runMigrations(url = getEnv().DATABASE_URL): Promise<void> {
  const { sql, db } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: "src/infrastructure/db/migrations" });
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => console.log("Database migrations complete."));
}
