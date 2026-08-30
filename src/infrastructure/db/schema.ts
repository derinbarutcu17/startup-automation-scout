import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const claimTypeEnum = pgEnum("claim_type", ["verified", "inferred", "estimated", "unknown"]);
export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);
export const claimEvidenceRelationEnum = pgEnum("claim_evidence_relation", ["supports", "contradicts", "motivates"]);
export const runStatusEnum = pgEnum("run_status", [
  "draft",
  "queued",
  "running",
  "partially_succeeded",
  "succeeded",
  "failed",
  "cancelled",
]);
export const workStageEnum = pgEnum("work_stage", [
  "identity",
  "eligibility",
  "research",
  "evidence",
  "workflow_hypothesis",
  "opportunity",
  "quality_gate",
  "scoring",
]);
export const workStatusEnum = pgEnum("work_status", [
  "pending",
  "running",
  "succeeded",
  "failed_retryable",
  "failed_terminal",
  "cancelled",
]);
export const reviewDecisionEnum = pgEnum("review_decision_value", ["reject", "investigate", "prototype", "archive"]);
export const reviewTargetEnum = pgEnum("review_target_type", [
  "company",
  "claim",
  "workflow_hypothesis",
  "automation_opportunity",
]);
export const scoreTargetEnum = pgEnum("score_target_type", ["company", "automation_opportunity"]);
export const sourceTierEnum = pgEnum("source_tier", ["tier_1", "tier_2", "tier_3"]);
export const retrievalStatusEnum = pgEnum("retrieval_status", ["retrieved", "unavailable", "blocked", "failed"]);
export const genericnessEnum = pgEnum("genericness_status", ["specific", "borderline", "generic"]);
export const strengthEnum = pgEnum("strength_level", ["high", "medium", "low"]);

export const prospectStatusEnum = pgEnum("prospect_status", [
  "not_started",
  "person_research_requested",
  "person_research_ready",
  "angle_review",
  "drafts_ready",
  "approved_for_gmail_draft",
  "gmail_draft_created",
  "suppressed",
  "stale",
  "failed",
]);
export const personProfileStatusEnum = pgEnum("person_profile_status", [
  "candidate",
  "reviewed",
  "rejected",
  "stale",
  "suppressed",
]);
export const contactChannelEnum = pgEnum("contact_channel_type", [
  "public_professional_email",
  "public_profile_url",
  "company_contact_form",
  "other",
]);
export const contactPointStatusEnum = pgEnum("contact_point_status", [
  "candidate",
  "source_verified",
  "user_confirmed",
  "rejected",
  "stale",
  "suppressed",
]);
export const draftStateEnum = pgEnum("draft_state", [
  "generated",
  "reviewed",
  "approved",
  "rejected",
  "withdrawn",
  "gmail_draft_created",
]);
export const prospectJobTypeEnum = pgEnum("prospect_job_type", [
  "people_research",
  "angle_generation",
  "draft_generation",
  "handoff_export",
]);
export const prospectJobStatusEnum = pgEnum("prospect_job_status", [
  "pending",
  "running",
  "succeeded",
  "failed_retryable",
  "failed_terminal",
  "cancelled",
]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalName: text("canonical_name").notNull(),
    canonicalDomain: text("canonical_domain").notNull(),
    normalizedLocation: text("normalized_location"),
    status: text("status").notNull().default("active"),
    identityStatus: text("identity_status").notNull().default("resolved"),
    firstDiscoveredAt: timestamp("first_discovered_at", { withTimezone: true }).notNull().defaultNow(),
    lastResearchedAt: timestamp("last_researched_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [unique("companies_canonical_domain_unique").on(table.canonicalDomain), index("companies_domain_idx").on(table.canonicalDomain)],
);

export const companyAliases = pgTable(
  "company_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    aliasType: text("alias_type").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    sourceNamespace: text("source_namespace").notNull().default("manual"),
    provenance: jsonb("provenance").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    unique("company_aliases_identity_unique").on(table.aliasType, table.normalizedValue, table.sourceNamespace),
    index("company_aliases_lookup_idx").on(table.normalizedValue, table.aliasType),
  ],
);

export const scoutRuns = pgTable(
  "scout_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: runStatusEnum("status").notNull().default("draft"),
    currentStage: text("current_stage").notNull().default("CREATED"),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull(),
    maxEur: numeric("max_eur", { precision: 12, scale: 4 }).notNull(),
    maxSearchRequests: integer("max_search_requests").notNull(),
    maxModelSpendEur: numeric("max_model_spend_eur", { precision: 12, scale: 4 }).notNull(),
    maxDeepCompanies: integer("max_deep_companies").notNull(),
    maxRuntimeSeconds: integer("max_runtime_seconds").notNull(),
    maxRetriesPerWorkItem: integer("max_retries_per_work_item").notNull(),
    actualCostEur: numeric("actual_cost_eur", { precision: 12, scale: 4 }).notNull().default("0"),
    actualSearchRequests: integer("actual_search_requests").notNull().default(0),
    actualModelSpendEur: numeric("actual_model_spend_eur", { precision: 12, scale: 4 }).notNull().default("0"),
    deepCompaniesStarted: integer("deep_companies_started").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    degradationWarnings: jsonb("degradation_warnings").$type<string[]>().notNull().default([]),
    diagnostics: jsonb("diagnostics").$type<Record<string, unknown>>().notNull().default({}),
    scheduleOccurrenceId: text("schedule_occurrence_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("scout_runs_schedule_occurrence_unique").on(table.scheduleOccurrenceId),
    index("scout_runs_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const discoveryRecords = pgTable(
  "discovery_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoutRunId: uuid("scout_run_id").references(() => scoutRuns.id, { onDelete: "restrict" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "restrict" }),
    sourceType: text("source_type").notNull(),
    sourceUrl: text("source_url"),
    externalIdentifier: text("external_identifier"),
    rawName: text("raw_name"),
    rawDomain: text("raw_domain"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("discovery_records_run_time_idx").on(table.scoutRunId, table.discoveredAt)],
);

export const eligibilityDecisions = pgTable(
  "eligibility_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    scoutRunId: uuid("scout_run_id").notNull().references(() => scoutRuns.id, { onDelete: "restrict" }),
    eligible: boolean("eligible").notNull(),
    reasonCodes: jsonb("reason_codes").$type<string[]>().notNull(),
    supportingClaimIds: jsonb("supporting_claim_ids").$type<string[]>().notNull().default([]),
    unresolvedChecks: jsonb("unresolved_checks").$type<string[]>().notNull().default([]),
    policyVersion: text("policy_version").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("eligibility_company_run_unique").on(table.companyId, table.scoutRunId)],
);

export const sourceDocuments = pgTable(
  "source_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    canonicalUrl: text("canonical_url").notNull(),
    sourceTier: sourceTierEnum("source_tier").notNull(),
    title: text("title"),
    publisher: text("publisher"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    contentFingerprint: text("content_fingerprint").notNull(),
    retrievalStatus: retrievalStatusEnum("retrieval_status").notNull(),
    permittedAccessMetadata: jsonb("permitted_access_metadata").$type<Record<string, unknown>>().notNull().default({}),
    extractedText: text("extracted_text"),
    byteLength: integer("byte_length").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
  },
  (table) => [
    unique("source_documents_version_unique").on(table.companyId, table.canonicalUrl, table.contentFingerprint),
    index("source_documents_company_url_time_idx").on(table.companyId, table.canonicalUrl, table.fetchedAt),
    index("source_documents_fingerprint_idx").on(table.contentFingerprint),
  ],
);

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceDocumentId: uuid("source_document_id").notNull().references(() => sourceDocuments.id, { onDelete: "restrict" }),
    evidenceType: text("evidence_type").notNull(),
    normalizedContent: text("normalized_content").notNull(),
    sourceLocator: text("source_locator").notNull(),
    extractionMethod: text("extraction_method").notNull(),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("evidence_items_source_content_locator_unique").on(
      table.sourceDocumentId,
      table.normalizedContent,
      table.sourceLocator,
    ),
    index("evidence_items_source_idx").on(table.sourceDocumentId),
  ],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    claimText: text("claim_text").notNull(),
    claimType: claimTypeEnum("claim_type").notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    temporalScope: text("temporal_scope"),
    contradictionStatus: text("contradiction_status").notNull().default("none"),
    reasoningSummary: text("reasoning_summary"),
    alternativeExplanation: text("alternative_explanation"),
    confirmationQuestion: text("confirmation_question"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("claims_company_subject_text_type_unique").on(
      table.companyId,
      table.subject,
      table.claimText,
      table.claimType,
    ),
    index("claims_company_type_time_idx").on(table.companyId, table.claimType, table.createdAt),
  ],
);

export const claimEvidence = pgTable(
  "claim_evidence",
  {
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "restrict" }),
    evidenceItemId: uuid("evidence_item_id").notNull().references(() => evidenceItems.id, { onDelete: "restrict" }),
    relation: claimEvidenceRelationEnum("relation").notNull(),
    strength: integer("strength").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.claimId, table.evidenceItemId, table.relation] })],
);

export const recentSignals = pgTable(
  "recent_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    signalType: text("signal_type").notNull(),
    label: text("label").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    claimId: uuid("claim_id").references(() => claims.id, { onDelete: "restrict" }),
    evidenceItemId: uuid("evidence_item_id").references(() => evidenceItems.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    unique("recent_signals_company_type_label_unique").on(table.companyId, table.signalType, table.label),
    index("recent_signals_company_time_idx").on(table.companyId, table.occurredAt),
  ],
);

export const researchDossiers = pgTable(
  "research_dossiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    scoutRunId: uuid("scout_run_id").notNull().references(() => scoutRuns.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    knownUnknowns: jsonb("known_unknowns").$type<string[]>().notNull().default([]),
    sourceCoverageSummary: jsonb("source_coverage_summary").$type<Record<string, unknown>>().notNull().default({}),
    researchCompleteness: numeric("research_completeness", { precision: 5, scale: 4 }).notNull(),
    researchCostEur: numeric("research_cost_eur", { precision: 12, scale: 4 }).notNull().default("0"),
    conclusion: text("conclusion").notNull().default("sufficient"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("research_dossiers_company_run_version_unique").on(table.companyId, table.scoutRunId, table.version),
    index("research_dossiers_lookup_idx").on(table.companyId, table.scoutRunId, table.version),
  ],
);

export const dossierSourceDocuments = pgTable(
  "dossier_source_documents",
  {
    dossierId: uuid("dossier_id").notNull().references(() => researchDossiers.id, { onDelete: "restrict" }),
    sourceDocumentId: uuid("source_document_id").notNull().references(() => sourceDocuments.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.dossierId, table.sourceDocumentId] })],
);

export const dossierClaims = pgTable(
  "dossier_claims",
  {
    dossierId: uuid("dossier_id").notNull().references(() => researchDossiers.id, { onDelete: "restrict" }),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.dossierId, table.claimId] })],
);

export const dossierSignals = pgTable(
  "dossier_signals",
  {
    dossierId: uuid("dossier_id").notNull().references(() => researchDossiers.id, { onDelete: "restrict" }),
    recentSignalId: uuid("recent_signal_id").notNull().references(() => recentSignals.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.dossierId, table.recentSignalId] })],
);

export const workflowHypotheses = pgTable(
  "workflow_hypotheses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
    researchDossierId: uuid("research_dossier_id").notNull().references(() => researchDossiers.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    actors: jsonb("actors").$type<string[]>().notNull(),
    trigger: text("trigger").notNull(),
    likelySteps: jsonb("likely_steps").$type<string[]>().notNull(),
    painHypothesis: text("pain_hypothesis").notNull(),
    evidenceItemIds: jsonb("evidence_item_ids").$type<string[]>().notNull(),
    claimIds: jsonb("claim_ids").$type<string[]>().notNull(),
    assumptions: jsonb("assumptions").$type<string[]>().notNull(),
    confirmationQuestions: jsonb("confirmation_questions").$type<string[]>().notNull(),
    alternativeExplanation: text("alternative_explanation"),
    confidence: confidenceEnum("confidence").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("workflow_hypotheses_dossier_unique").on(table.researchDossierId),
    index("workflow_hypotheses_dossier_idx").on(table.researchDossierId),
  ],
);

export const automationOpportunities = pgTable(
  "automation_opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowHypothesisId: uuid("workflow_hypothesis_id").notNull().references(() => workflowHypotheses.id, { onDelete: "restrict" }),
    proposedSystem: text("proposed_system").notNull(),
    deterministicSteps: jsonb("deterministic_steps").$type<string[]>().notNull(),
    aiRequiredSteps: jsonb("ai_required_steps").$type<string[]>().notNull(),
    requiredIntegrations: jsonb("required_integrations").$type<string[]>().notNull(),
    requiredPrivateAccess: jsonb("required_private_access").$type<string[]>().notNull(),
    measurableOutcome: text("measurable_outcome").notNull(),
    buildability: strengthEnum("buildability").notNull(),
    evidenceStrength: strengthEnum("evidence_strength").notNull(),
    genericnessStatus: genericnessEnum("genericness_status").notNull(),
    risks: jsonb("risks").$type<string[]>().notNull(),
    nextValidationStep: text("next_validation_step").notNull(),
    rankingConfidence: confidenceEnum("ranking_confidence").notNull().default("medium"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("automation_opportunities_hypothesis_unique").on(table.workflowHypothesisId),
    index("automation_opportunities_hypothesis_idx").on(table.workflowHypothesisId),
  ],
);

export const qualityGateResults = pgTable(
  "quality_gate_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id").notNull().references(() => automationOpportunities.id, { onDelete: "restrict" }),
    passed: boolean("passed").notNull(),
    failureCodes: jsonb("failure_codes").$type<string[]>().notNull(),
    warningCodes: jsonb("warning_codes").$type<string[]>().notNull(),
    checkedEvidenceItemIds: jsonb("checked_evidence_item_ids").$type<string[]>().notNull(),
    policyVersion: text("policy_version").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("quality_gate_opportunity_unique").on(table.opportunityId)],
);

export const scorecards = pgTable(
  "scorecards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: scoreTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    rubricVersion: text("rubric_version").notNull(),
    dimensionValues: jsonb("dimension_values").$type<Record<string, number>>().notNull(),
    dimensionRationales: jsonb("dimension_rationales").$type<Record<string, string>>().notNull().default({}),
    evidenceItemIds: jsonb("evidence_item_ids").$type<string[]>().notNull().default([]),
    totalScore: numeric("total_score", { precision: 7, scale: 3 }).notNull(),
    gatingFailures: jsonb("gating_failures").$type<string[]>().notNull().default([]),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("scorecards_target_rubric_unique").on(table.targetType, table.targetId, table.rubricVersion),
    index("scorecards_target_rubric_idx").on(table.targetType, table.targetId, table.rubricVersion),
  ],
);

export const reviewDecisions = pgTable(
  "review_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: reviewTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    decision: reviewDecisionEnum("decision").notNull(),
    reasonLabels: jsonb("reason_labels").$type<string[]>().notNull().default([]),
    note: text("note"),
    createdAt: createdAt(),
  },
  (table) => [index("review_decisions_target_time_idx").on(table.targetType, table.targetId, table.createdAt)],
);

export const workItems = pgTable(
  "work_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoutRunId: uuid("scout_run_id").notNull().references(() => scoutRuns.id, { onDelete: "restrict" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "restrict" }),
    stage: workStageEnum("stage").notNull(),
    status: workStatusEnum("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    inputFingerprint: text("input_fingerprint").notNull(),
    outputFingerprint: text("output_fingerprint"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCategory: text("last_error_category"),
    lastErrorMessage: text("last_error_message"),
    firstAttemptAt: timestamp("first_attempt_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    leaseOwner: text("lease_owner"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("work_items_idempotency_unique").on(table.idempotencyKey),
    index("work_items_claim_idx").on(table.status, table.availableAt),
    index("work_items_lease_idx").on(table.status, table.leaseExpiresAt),
    index("work_items_run_idx").on(table.scoutRunId, table.status),
  ],
);

export const budgetLedger = pgTable(
  "budget_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoutRunId: uuid("scout_run_id").notNull().references(() => scoutRuns.id, { onDelete: "restrict" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "restrict" }),
    workItemId: uuid("work_item_id").references(() => workItems.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    providerId: text("provider_id").notNull(),
    operation: text("operation").notNull(),
    stage: text("stage").notNull(),
    reservedAmountEur: numeric("reserved_amount_eur", { precision: 12, scale: 4 }).notNull().default("0"),
    actualAmountEur: numeric("actual_amount_eur", { precision: 12, scale: 4 }).notNull().default("0"),
    searchRequests: integer("search_requests").notNull().default(0),
    modelSpendEur: numeric("model_spend_eur", { precision: 12, scale: 4 }).notNull().default("0"),
    status: text("status").notNull().default("reserved"),
    createdAt: createdAt(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (table) => [
    unique("budget_ledger_run_idempotency_unique").on(table.scoutRunId, table.idempotencyKey),
    index("budget_ledger_run_idx").on(table.scoutRunId, table.createdAt),
  ],
);

export const providerDiagnostics = pgTable(
  "provider_diagnostics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scoutRunId: uuid("scout_run_id").references(() => scoutRuns.id, { onDelete: "restrict" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "restrict" }),
    workItemId: uuid("work_item_id").references(() => workItems.id, { onDelete: "restrict" }),
    providerId: text("provider_id").notNull(),
    operation: text("operation").notNull(),
    ok: boolean("ok").notNull(),
    category: text("category"),
    retryable: boolean("retryable").notNull().default(false),
    latencyMs: integer("latency_ms").notNull().default(0),
    requestCount: integer("request_count").notNull().default(0),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costEur: numeric("cost_eur", { precision: 12, scale: 4 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [index("provider_diagnostics_run_idx").on(table.scoutRunId, table.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
});

export const scheduleOccurrences = pgTable(
  "schedule_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scheduleId: text("schedule_id").notNull(),
    scheduledForUtc: timestamp("scheduled_for_utc", { withTimezone: true }).notNull(),
    scoutRunId: uuid("scout_run_id").references(() => scoutRuns.id, { onDelete: "restrict" }),
    outcome: text("outcome").notNull().default("created"),
    createdAt: createdAt(),
  },
  (table) => [unique("schedule_occurrence_unique").on(table.scheduleId, table.scheduledForUtc)],
);

export const prospectDossiers = pgTable(
  "prospect_dossiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    researchDossierId: uuid("research_dossier_id")
      .notNull()
      .references(() => researchDossiers.id, { onDelete: "restrict" }),
    opportunityId: uuid("opportunity_id").references(() => automationOpportunities.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    schemaVersion: text("schema_version").notNull().default("prospect-dossier.v1"),
    status: prospectStatusEnum("status").notNull().default("not_started"),
    readinessReason: text("readiness_reason"),
    targetRole: text("target_role"),
    outreachObjective: text("outreach_objective"),
    knownUnknowns: jsonb("known_unknowns").$type<string[]>().notNull().default([]),
    openQuestions: jsonb("open_questions").$type<string[]>().notNull().default([]),
    sourceCoverage: jsonb("source_coverage").$type<Record<string, unknown>>().notNull().default({}),
    freshnessSummary: jsonb("freshness_summary").$type<Record<string, unknown>>().notNull().default({}),
    contentFingerprint: text("content_fingerprint"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("prospect_dossiers_company_version_unique").on(table.companyId, table.researchDossierId, table.version),
    index("prospect_dossiers_company_status_idx").on(table.companyId, table.status),
    index("prospect_dossiers_opportunity_idx").on(table.opportunityId),
  ],
);

export const personProfiles = pgTable(
  "person_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    roleTitle: text("role_title"),
    function: text("function"),
    seniority: text("seniority"),
    profileUrl: text("profile_url"),
    profilePlatform: text("profile_platform"),
    status: personProfileStatusEnum("status").notNull().default("candidate"),
    discoveryMethod: text("discovery_method").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    uncertaintyNotes: text("uncertainty_notes"),
    reviewNotes: text("review_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("person_profiles_company_idx").on(table.companyId, table.status),
    unique("person_profiles_company_name_url_unique").on(table.companyId, table.normalizedName, table.profileUrl),
  ],
);

export const personClaims = pgTable(
  "person_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personProfileId: uuid("person_profile_id")
      .notNull()
      .references(() => personProfiles.id, { onDelete: "restrict" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    claimText: text("claim_text").notNull(),
    claimType: claimTypeEnum("claim_type").notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    reasoningSummary: text("reasoning_summary"),
    alternativeExplanation: text("alternative_explanation"),
    confirmationQuestion: text("confirmation_question"),
    contradictionStatus: text("contradiction_status").notNull().default("none"),
    freshnessStatus: text("freshness_status").notNull().default("fresh"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("person_claims_person_subject_text_type_unique").on(
      table.personProfileId,
      table.subject,
      table.claimText,
      table.claimType,
    ),
    index("person_claims_company_idx").on(table.companyId, table.claimType),
  ],
);

export const personProfileSources = pgTable(
  "person_profile_sources",
  {
    personProfileId: uuid("person_profile_id")
      .notNull()
      .references(() => personProfiles.id, { onDelete: "cascade" }),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.personProfileId, table.sourceDocumentId] })],
);

export const personProfileEvidence = pgTable(
  "person_profile_evidence",
  {
    personProfileId: uuid("person_profile_id")
      .notNull()
      .references(() => personProfiles.id, { onDelete: "cascade" }),
    evidenceItemId: uuid("evidence_item_id")
      .notNull()
      .references(() => evidenceItems.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.personProfileId, table.evidenceItemId] })],
);

export const personClaimEvidence = pgTable(
  "person_claim_evidence",
  {
    personClaimId: uuid("person_claim_id")
      .notNull()
      .references(() => personClaims.id, { onDelete: "cascade" }),
    evidenceItemId: uuid("evidence_item_id")
      .notNull()
      .references(() => evidenceItems.id, { onDelete: "restrict" }),
    relation: claimEvidenceRelationEnum("relation").notNull(),
  },
  (table) => [primaryKey({ columns: [table.personClaimId, table.evidenceItemId, table.relation] })],
);

export const contactPoints = pgTable(
  "contact_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personProfileId: uuid("person_profile_id").references(() => personProfiles.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "restrict" }),
    channelType: contactChannelEnum("channel_type").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    displayValue: text("display_value").notNull(),
    encryptedValue: text("encrypted_value"),
    sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "restrict" }),
    userSupplied: boolean("user_supplied").notNull().default(false),
    status: contactPointStatusEnum("status").notNull().default("candidate"),
    confidence: confidenceEnum("confidence").notNull().default("medium"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    discoveryMethod: text("discovery_method").notNull(),
    restrictionNotes: text("restriction_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("contact_points_person_idx").on(table.personProfileId, table.status),
    index("contact_points_company_idx").on(table.companyId),
    index("contact_points_normalized_idx").on(table.normalizedValue),
    unique("contact_points_person_value_unique").on(table.personProfileId, table.normalizedValue),
  ],
);

export const prospectDossierPersons = pgTable(
  "prospect_dossier_persons",
  {
    prospectDossierId: uuid("prospect_dossier_id")
      .notNull()
      .references(() => prospectDossiers.id, { onDelete: "cascade" }),
    personProfileId: uuid("person_profile_id")
      .notNull()
      .references(() => personProfiles.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.prospectDossierId, table.personProfileId] })],
);

export const outreachAngles = pgTable(
  "outreach_angles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prospectDossierId: uuid("prospect_dossier_id")
      .notNull()
      .references(() => prospectDossiers.id, { onDelete: "cascade" }),
    opportunityId: uuid("opportunity_id").references(() => automationOpportunities.id, { onDelete: "restrict" }),
    targetPersonId: uuid("target_person_id").references(() => personProfiles.id, { onDelete: "restrict" }),
    targetRole: text("target_role"),
    title: text("title").notNull(),
    thesis: text("thesis").notNull(),
    verifiedSignal: text("verified_signal").notNull(),
    workflowHypothesis: text("workflow_hypothesis").notNull(),
    relevanceReason: text("relevance_reason").notNull(),
    valueHypothesis: text("value_hypothesis").notNull(),
    callToAction: text("call_to_action").notNull(),
    evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull().default([]),
    claimIds: jsonb("claim_ids").$type<string[]>().notNull().default([]),
    personClaimIds: jsonb("person_claim_ids").$type<string[]>().notNull().default([]),
    assumptions: jsonb("assumptions").$type<string[]>().notNull().default([]),
    alternativeExplanations: jsonb("alternative_explanations").$type<string[]>().notNull().default([]),
    confirmationQuestions: jsonb("confirmation_questions").$type<string[]>().notNull().default([]),
    confidence: confidenceEnum("confidence").notNull().default("medium"),
    status: text("status").notNull().default("candidate"),
    reviewHistory: jsonb("review_history").$type<Record<string, unknown>[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("outreach_angles_dossier_idx").on(table.prospectDossierId, table.status),
    index("outreach_angles_opportunity_idx").on(table.opportunityId),
  ],
);

export const outreachSequences = pgTable(
  "outreach_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prospectDossierId: uuid("prospect_dossier_id")
      .notNull()
      .references(() => prospectDossiers.id, { onDelete: "cascade" }),
    outreachAngleId: uuid("outreach_angle_id")
      .notNull()
      .references(() => outreachAngles.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("outreach_sequences_dossier_angle_unique").on(table.prospectDossierId, table.outreachAngleId),
    index("outreach_sequences_dossier_idx").on(table.prospectDossierId),
  ],
);

export const messageDrafts = pgTable(
  "message_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outreachSequenceId: uuid("outreach_sequence_id")
      .notNull()
      .references(() => outreachSequences.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    purpose: text("purpose").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    contactPointId: uuid("contact_point_id").references(() => contactPoints.id, { onDelete: "restrict" }),
    evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull().default([]),
    claimIds: jsonb("claim_ids").$type<string[]>().notNull().default([]),
    personalizationNotes: text("personalization_notes"),
    state: draftStateEnum("state").notNull().default("generated"),
    modelVersion: text("model_version"),
    promptVersion: text("prompt_version"),
    contentFingerprint: text("content_fingerprint").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("message_drafts_sequence_step_unique").on(table.outreachSequenceId, table.stepNumber),
    index("message_drafts_sequence_idx").on(table.outreachSequenceId, table.stepNumber),
  ],
);

export const outreachApprovals = pgTable(
  "outreach_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionType: text("action_type").notNull(),
    prospectDossierId: uuid("prospect_dossier_id")
      .notNull()
      .references(() => prospectDossiers.id, { onDelete: "restrict" }),
    draftBatchIds: jsonb("draft_batch_ids").$type<string[]>().notNull(),
    contentFingerprint: text("content_fingerprint").notNull(),
    approverIdentity: text("approver_identity").notNull(),
    result: text("result"),
    rejectionReason: text("rejection_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("outreach_approvals_dossier_idx").on(table.prospectDossierId, table.createdAt),
    index("outreach_approvals_fingerprint_idx").on(table.prospectDossierId, table.contentFingerprint),
  ],
);

export const suppressionRecords = pgTable(
  "suppression_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: text("scope").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    reason: text("reason").notNull(),
    source: text("source").notNull().default("manual"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("suppression_scope_value_unique").on(table.scope, table.normalizedValue),
    index("suppression_value_idx").on(table.normalizedValue),
  ],
);

export const gmailDraftResults = pgTable(
  "gmail_draft_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prospectDossierId: uuid("prospect_dossier_id")
      .notNull()
      .references(() => prospectDossiers.id, { onDelete: "restrict" }),
    approvalId: uuid("approval_id")
      .notNull()
      .references(() => outreachApprovals.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestedDraftIds: jsonb("requested_draft_ids").$type<string[]>().notNull(),
    succeededDraftIds: jsonb("succeeded_draft_ids").$type<string[]>().notNull().default([]),
    failedDraftIds: jsonb("failed_draft_ids").$type<string[]>().notNull().default([]),
    gmailDraftIds: jsonb("gmail_draft_ids").$type<Record<string, string>>().notNull().default({}),
    providerResponse: jsonb("provider_response").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    unique("gmail_draft_results_idempotency_unique").on(table.idempotencyKey),
    index("gmail_draft_results_dossier_idx").on(table.prospectDossierId, table.createdAt),
  ],
);

export const gmailConnections = pgTable(
  "gmail_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("google"),
    email: text("email"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scope: text("scope").notNull(),
    status: text("status").notNull().default("connected"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("gmail_connections_provider_unique").on(table.provider),
    index("gmail_connections_status_idx").on(table.status),
  ],
);

export const prospectJobs = pgTable(
  "prospect_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prospectDossierId: uuid("prospect_dossier_id")
      .notNull()
      .references(() => prospectDossiers.id, { onDelete: "restrict" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    opportunityId: uuid("opportunity_id").references(() => automationOpportunities.id, { onDelete: "restrict" }),
    jobType: prospectJobTypeEnum("job_type").notNull(),
    status: prospectJobStatusEnum("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    inputFingerprint: text("input_fingerprint").notNull(),
    outputFingerprint: text("output_fingerprint"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCategory: text("last_error_category"),
    lastErrorMessage: text("last_error_message"),
    leaseOwner: text("lease_owner"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    approvalId: uuid("approval_id").references(() => outreachApprovals.id, { onDelete: "restrict" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("prospect_jobs_idempotency_unique").on(table.idempotencyKey),
    index("prospect_jobs_claim_idx").on(table.status, table.availableAt),
    index("prospect_jobs_lease_idx").on(table.status, table.leaseExpiresAt),
    index("prospect_jobs_dossier_idx").on(table.prospectDossierId, table.status),
  ],
);
