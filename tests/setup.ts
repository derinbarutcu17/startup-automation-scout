import { afterAll } from "vitest";
import { closeDb } from "@/src/infrastructure/db/client";
import { resetEnvForTests } from "@/src/infrastructure/config/env";

process.env.APP_ENV = "test";
process.env.SEARCH_PROVIDER = "fixture";
process.env.MODEL_PROVIDER = "fixture";
process.env.SCHEDULER_ENABLED = "false";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://scout:scout@127.0.0.1:5432/scout_test";
delete process.env.SEARCH_API_KEY;
delete process.env.MODEL_API_KEY;
resetEnvForTests();

afterAll(async () => {
  await closeDb();
  resetEnvForTests();
});
