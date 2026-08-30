import { z } from "zod";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const positiveNumber = (fallback: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().positive().default(fallback));

const nonNegativeNumber = (fallback: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().nonnegative().default(fallback));

const positiveInt = (fallback: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(fallback));

export const envSchema = z
  .object({
    DATABASE_URL: z.string().url().default("postgres://scout:scout@127.0.0.1:5432/scout"),
    APP_BASE_URL: z.string().url().default("http://127.0.0.1:3000"),
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    SEARCH_PROVIDER: z.enum(["fixture", "brave"]).default("fixture"),
    SEARCH_API_KEY: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    MODEL_PROVIDER: z.enum(["fixture", "openai_compatible"]).default("fixture"),
    MODEL_API_KEY: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    MODEL_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
    MODEL_EXTRACTION_MODEL: z.string().min(1).default("gpt-5-mini"),
    MODEL_REASONING_MODEL: z.string().min(1).default("gpt-5.1"),
    DEFAULT_RUN_MAX_EUR: positiveNumber(5),
    DEFAULT_RUN_MAX_SEARCH_REQUESTS: positiveInt(20),
    DEFAULT_RUN_MAX_MODEL_SPEND: nonNegativeNumber(4),
    DEFAULT_RUN_MAX_DEEP_COMPANIES: positiveInt(5),
    DEFAULT_RUN_MAX_RUNTIME_SECONDS: positiveInt(900),
    DEFAULT_RUN_MAX_RETRIES: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).default(2)),
    RETRIEVAL_MAX_BYTES: positiveInt(1_000_000),
    RETRIEVAL_TIMEOUT_MS: positiveInt(12_000),
    RETRIEVAL_USER_AGENT: z.string().min(1).default("StartupAutomationScout/0.1 (+local research tool)"),
    WORKER_CONCURRENCY: positiveInt(2),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    RUN_INLINE_WORKER: z.preprocess(
      blankToUndefined,
      z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    ),
    SCHEDULER_ENABLED: z.preprocess(
      blankToUndefined,
      z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    ),
    CONTACT_ENCRYPTION_KEY: z.preprocess(blankToUndefined, z.string().min(32).optional()),
    GMAIL_PROVIDER: z.enum(["fixture", "google"]).default("fixture"),
    GMAIL_CLIENT_ID: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    GMAIL_CLIENT_SECRET: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    GMAIL_ACCESS_TOKEN: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    GMAIL_TIMEOUT_MS: positiveInt(15_000),
    GOOGLE_REDIRECT_URI: z.string().url().optional(),
    PROSPECT_MAX_PEOPLE: positiveInt(3),
    PROSPECT_MAX_DRAFT_STEPS: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(3).default(3)),
    CONTACT_FRESHNESS_DAYS: positiveInt(90),
    PROSPECT_BUDGET_MAX_SEARCH_REQUESTS: positiveInt(10),
    PROSPECT_BUDGET_MAX_MODEL_SPEND: nonNegativeNumber(2),
    PROSPECT_BUDGET_MAX_RUNTIME_SECONDS: positiveInt(600),
    HERMES_EXPORT_REDACT_CONTACTS: z.preprocess(
      blankToUndefined,
      z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
    ),
  })
  .superRefine((env, ctx) => {
    if (env.SEARCH_PROVIDER !== "fixture" && !env.SEARCH_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["SEARCH_API_KEY"], message: "required for live search provider" });
    }
    if (env.MODEL_PROVIDER !== "fixture" && !env.MODEL_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["MODEL_API_KEY"], message: "required for live model provider" });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid configuration: ${details}`);
  }
  return parsed.data;
}

export function getEnv(): AppEnv {
  cached ??= parseEnv(process.env);
  return cached;
}

export function resetEnvForTests(): void {
  cached = undefined;
}
