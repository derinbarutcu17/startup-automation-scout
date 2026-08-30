import postgres from "postgres";
import { runMigrations } from "@/src/infrastructure/db/migrate";

const DEFAULT_TEST_DATABASE_URL = "postgres://scout:scout@127.0.0.1:5432/scout_test";

function parsedDatabaseUrl() {
  const raw = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const url = new URL(raw);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!databaseName || !/(?:^|[_-])test(?:$|[_-])/i.test(databaseName)) {
    throw new Error(`Refusing to reset non-test database: ${databaseName || "<empty>"}`);
  }
  return { raw, url, databaseName };
}

function maintenanceUrl(url: URL) {
  const copy = new URL(url);
  copy.pathname = "/postgres";
  return copy.toString();
}

export async function resetTestDatabase() {
  const { raw, url, databaseName } = parsedDatabaseUrl();
  const admin = postgres(maintenanceUrl(url), { max: 1, prepare: false });
  try {
    const rows = await admin<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;
    if (!rows[0]?.exists) {
      await admin.unsafe(`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`);
    }
  } finally {
    await admin.end();
  }

  const target = postgres(raw, { max: 1, prepare: false });
  try {
    await target`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await target`DROP SCHEMA IF EXISTS public CASCADE`;
    await target`CREATE SCHEMA public`;
  } finally {
    await target.end();
  }

  await runMigrations(raw);
  return { databaseName, databaseUrl: raw };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetTestDatabase()
    .then(({ databaseName }) => process.stdout.write(`Reset and migrated ${databaseName}.\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
