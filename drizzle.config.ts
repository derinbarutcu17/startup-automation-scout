import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./src/infrastructure/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://scout:scout@127.0.0.1:5432/scout",
  },
  strict: true,
  verbose: true,
});
