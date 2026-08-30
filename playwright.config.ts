import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm e2e:server",
    url: "http://127.0.0.1:3000/scout-runs",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_ENV: "test",
      SEARCH_PROVIDER: "fixture",
      MODEL_PROVIDER: "fixture",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgres://scout:scout@127.0.0.1:5432/scout_test",
    },
  },
});
