import { z } from "zod";

export const claimTypeSchema = z.enum(["verified", "inferred", "estimated", "unknown"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const runStatusSchema = z.enum([
  "draft",
  "queued",
  "running",
  "partially_succeeded",
  "succeeded",
  "failed",
  "cancelled",
]);
export const workStageSchema = z.enum([
  "identity",
  "eligibility",
  "research",
  "evidence",
  "workflow_hypothesis",
  "opportunity",
  "quality_gate",
  "scoring",
]);

export type ClaimType = z.infer<typeof claimTypeSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
export type WorkStage = z.infer<typeof workStageSchema>;

export const runBudgetSchema = z.object({
  maxEur: z.number().positive(),
  maxSearchRequests: z.number().int().positive(),
  maxModelSpendEur: z.number().nonnegative(),
  maxDeepCompanies: z.number().int().positive(),
  maxRuntimeSeconds: z.number().int().positive(),
  maxRetriesPerWorkItem: z.number().int().min(0),
});
export type RunBudget = z.infer<typeof runBudgetSchema>;

export const runConfigurationSchema = z.object({
  geographicScope: z.array(z.string()).min(1),
  enabledDiscoverySources: z.array(z.string()),
  enabledResearchSources: z.array(z.string()).min(1),
  freshnessPolicyVersion: z.string().min(1),
  evidencePolicyVersion: z.string().min(1),
  scoringRubricVersion: z.string().min(1),
  promptSetVersion: z.string().min(1),
  searchProviderId: z.string().min(1),
  modelProviderId: z.string().min(1),
  extractionModelId: z.string().min(1),
  reasoningModelId: z.string().min(1),
  targetCandidateCount: z.number().int().positive(),
  shortlistSize: z.number().int().min(1).max(3).default(3),
  companySizePolicy: z.enum(["any", "small_or_medium"]).default("any"),
  maxEmployeeCount: z.number().int().positive().default(500),
  requireCompanySizeEvidence: z.boolean().default(false),
  excludedCompanyNames: z.array(z.string()).default([]),
  excludedCompanyDomains: z.array(z.string()).default([]),
  budget: runBudgetSchema,
});
export type RunConfiguration = z.infer<typeof runConfigurationSchema>;

export interface EligibilityDecision {
  companyId: string;
  eligible: boolean;
  reasonCodes: string[];
  supportingClaimIds: string[];
  unresolvedChecks: string[];
  policyVersion: string;
  decidedAt: string;
}

export interface ResearchBudget {
  runId: string;
  companyId: string;
  maxSearchRequests: number;
  maxModelSpendEur: number;
  maxSourceDocuments: number;
  maxRuntimeSeconds: number;
}

export interface ResearchDossier {
  id: string;
  companyId: string;
  scoutRunId: string;
  version: number;
  sourceDocumentIds: string[];
  claimIds: string[];
  recentSignalIds: string[];
  knownUnknowns: string[];
  sourceCoverageSummary: Record<string, unknown>;
  researchCompleteness: number;
  researchCostEur: number;
  generatedAt: string;
}

export const workflowHypothesisSchema = z.object({
  description: z.string().min(20),
  actors: z.array(z.string()).min(1),
  trigger: z.string().min(5),
  likelySteps: z.array(z.string()).min(2),
  painHypothesis: z.string().min(10),
  evidenceItemIds: z.array(z.string()).min(1),
  claimIds: z.array(z.string()).min(1),
  assumptions: z.array(z.string()),
  confirmationQuestions: z.array(z.string()).min(1),
  alternativeExplanation: z.string().nullable().optional(),
  confidence: confidenceSchema,
});
export type WorkflowHypothesisInput = z.infer<typeof workflowHypothesisSchema>;

export const automationOpportunitySchema = z.object({
  proposedSystem: z.string().min(20),
  deterministicSteps: z.array(z.string()).min(1),
  aiRequiredSteps: z.array(z.string()),
  requiredIntegrations: z.array(z.string()),
  requiredPrivateAccess: z.array(z.string()),
  measurableOutcome: z.string().min(10),
  buildability: z.enum(["high", "medium", "low"]),
  evidenceStrength: z.enum(["high", "medium", "low"]),
  genericnessStatus: z.enum(["specific", "borderline", "generic"]),
  risks: z.array(z.string()),
  nextValidationStep: z.string().min(10),
  rankingConfidence: confidenceSchema.default("medium"),
});
export type AutomationOpportunityInput = z.infer<typeof automationOpportunitySchema>;

export interface QualityGateResult {
  passed: boolean;
  failureCodes: string[];
  warningCodes: string[];
  checkedEvidenceItemIds: string[];
  policyVersion: string;
}

export interface Scorecard {
  id: string;
  targetType: "company" | "automation_opportunity";
  targetId: string;
  rubricVersion: string;
  dimensionValues: Record<string, number>;
  evidenceItemIds: string[];
  totalScore: number;
  gatingFailures: string[];
  scoredAt: string;
}

export type ReviewDecisionValue = "reject" | "investigate" | "prototype" | "archive";

export type ProviderErrorCategory =
  | "timeout"
  | "rate_limited"
  | "authentication"
  | "configuration"
  | "invalid_response"
  | "budget_denied"
  | "access_denied"
  | "network"
  | "terminal_provider_failure";

export interface ProviderUsage {
  providerId: string;
  operation: string;
  requestCount: number;
  inputTokens?: number;
  outputTokens?: number;
  costEur?: number;
  latencyMs: number;
}

export type ProviderResult<T> =
  | { ok: true; value: T; usage: ProviderUsage }
  | { ok: false; category: ProviderErrorCategory; retryable: boolean; message: string; usage?: ProviderUsage };
