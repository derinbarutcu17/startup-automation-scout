import { describe, expect, it } from "vitest";
import { parseEnv } from "@/src/infrastructure/config/env";

describe("configuration", () => {
  it("accepts deterministic fixture providers without credentials", () => {
    const env = parseEnv({
      APP_ENV: "test",
      DATABASE_URL: "postgres://scout:scout@127.0.0.1:5432/scout_test",
      SEARCH_PROVIDER: "fixture",
      MODEL_PROVIDER: "fixture",
    } as unknown as NodeJS.ProcessEnv);

    expect(env.SEARCH_PROVIDER).toBe("fixture");
    expect(env.MODEL_PROVIDER).toBe("fixture");
    expect(env.SCHEDULER_ENABLED).toBe(false);
  });

  it("requires credentials when a live provider is selected", () => {
    expect(() => parseEnv({
      APP_ENV: "test",
      DATABASE_URL: "postgres://scout:scout@127.0.0.1:5432/scout_test",
      SEARCH_PROVIDER: "brave",
      MODEL_PROVIDER: "fixture",
    } as unknown as NodeJS.ProcessEnv)).toThrow(/SEARCH_API_KEY/);

    expect(() => parseEnv({
      APP_ENV: "test",
      DATABASE_URL: "postgres://scout:scout@127.0.0.1:5432/scout_test",
      SEARCH_PROVIDER: "fixture",
      MODEL_PROVIDER: "openai_compatible",
    } as unknown as NodeJS.ProcessEnv)).toThrow(/MODEL_API_KEY/);
  });
});
