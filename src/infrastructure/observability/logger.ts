import pino from "pino";
import { getEnv } from "@/src/infrastructure/config/env";

export const logger = pino({
  level: getEnv().LOG_LEVEL,
  redact: {
    paths: ["apiKey", "authorization", "headers.authorization", "*.apiKey", "*.authorization"],
    censor: "[REDACTED]",
  },
});

export function workLogger(fields: {
  runId?: string;
  companyId?: string | null;
  workItemId?: string;
  stage?: string;
  attempt?: number;
}) {
  return logger.child(fields);
}
