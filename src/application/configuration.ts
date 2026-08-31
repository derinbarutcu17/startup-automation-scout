import type { RunConfiguration } from "@/src/domain/types";
import { getEnv } from "@/src/infrastructure/config/env";

export function defaultRunConfiguration(): RunConfiguration {
  const env = getEnv();
  return {
    geographicScope: ["Berlin", "Germany"],
    enabledDiscoverySources: [env.SEARCH_PROVIDER],
    enabledResearchSources: [env.SEARCH_PROVIDER, "public_web"],
    freshnessPolicyVersion: "freshness-v1",
    evidencePolicyVersion: "evidence-v1",
    scoringRubricVersion: "v0.1-prebuild",
    promptSetVersion: "prompts-v1",
    searchProviderId: env.SEARCH_PROVIDER,
    modelProviderId: env.MODEL_PROVIDER,
    extractionModelId: env.MODEL_EXTRACTION_MODEL,
    reasoningModelId: env.MODEL_REASONING_MODEL,
    targetCandidateCount: 10,
    shortlistSize: 3,
    companySizePolicy: "small_or_medium",
    maxEmployeeCount: 500,
    requireCompanySizeEvidence: false,
    excludedCompanyNames: ["n8n", "sumup", "taxfix", "zenjob"],
    excludedCompanyDomains: ["n8n.io", "sumup.com", "taxfix.de", "zenjob.com"],
    budget: {
      maxEur: env.DEFAULT_RUN_MAX_EUR,
      maxSearchRequests: env.DEFAULT_RUN_MAX_SEARCH_REQUESTS,
      maxModelSpendEur: env.DEFAULT_RUN_MAX_MODEL_SPEND,
      maxDeepCompanies: env.DEFAULT_RUN_MAX_DEEP_COMPANIES,
      maxRuntimeSeconds: env.DEFAULT_RUN_MAX_RUNTIME_SECONDS,
      maxRetriesPerWorkItem: Math.max(5, env.DEFAULT_RUN_MAX_RETRIES),
    },
  };
}
