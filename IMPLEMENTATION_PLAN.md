# Startup Automation Scout: Final Implementation Plan

Status: Ready for implementation

Specification date: 2026-08-29

This document is the canonical build sequence for the first real implementation of Startup Automation Scout. It converts the product, evidence, architecture, data, scoring, evaluation, cost, privacy, and UX specifications into an engineering order of operations.

No production code should be added until the implementation begins from Phase 0 below. If another document conflicts with this plan, preserve the product invariants and resolve the conflict explicitly rather than silently changing behavior.

## 1. Engineering objective

Build a research product that can take a company from discovery or manual input to a human-reviewed, evidence-backed Automation Opportunity without inventing internal company facts.

The first useful end-to-end proof is deliberately narrow:

```text
manual company URL
  -> normalized Company
  -> permitted public-source research
  -> SourceDocuments
  -> EvidenceItems and Claims
  -> ResearchDossier
  -> WorkflowHypothesis
  -> one or more AutomationOpportunities
  -> Quality Gate
  -> deterministic Scorecard
  -> human ReviewDecision
```

This vertical slice must work before broad automated discovery is treated as important. Discovery volume is not the core product risk. The core risk is whether public evidence can reliably produce a company-specific automation opportunity worth investigating.

## 2. Non-negotiable invariants

These rules apply to every phase:

1. Verified, Inferred, Estimated, and Unknown remain structurally distinct.
2. No user-facing Verified Claim exists without supporting EvidenceItems.
3. Search snippets locate sources but do not replace original evidence when the original permitted source is retrievable.
4. Retrieved web content is untrusted data and cannot issue tool instructions.
5. No source connector may bypass authentication, anti-bot controls, paywalls, robots restrictions where applicable, or other technical restrictions.
6. Product Hunt API access is not a required MVP dependency. Commercial compatibility must be reverified before automated Product Hunt API use.
7. LinkedIn scraping and automated messaging are not part of the MVP.
8. No precise labor or financial savings may be fabricated without verified baseline inputs.
9. Generic Suggestions fail before final ranking.
10. Deterministic code owns state transitions, budgets, scoring arithmetic, validation, freshness calculations, and other logic that does not need a model.
11. AI output never bypasses runtime schema validation or evidence gates.
12. Every run has a hard budget enforced by orchestration.
13. One company failure does not fail the whole ScoutRun unless all usable discovery or research capability is lost.
14. Any external action beyond research and internal review requires a later explicit product decision and human approval.

## 3. Recommended repository shape

Keep one TypeScript repository. Start with a modular monolith and two runtime processes: web and worker.

Recommended structure:

```text
startup-automation-scout/
  app/
    (dashboard)/
      scout-runs/
      companies/
      opportunities/
      reviews/
      settings/
    api/
  src/
    domain/
      company/
      evidence/
      research/
      opportunity/
      scoring/
      scout-run/
      review/
    modules/
      discovery/
      identity-resolution/
      eligibility/
      research/
      opportunity-analysis/
      quality-gate/
      ranking/
      reporting/
    infrastructure/
      db/
        migrations/
        repositories/
      retrieval/
      search/
      models/
      queue/
      observability/
      config/
    worker/
      orchestration/
      jobs/
    evaluation/
      fixtures/
      golden-set/
      metrics/
      reports/
  tests/
    integration/
    e2e/
  docs/
    adr/
    agents/
  CONTEXT.md
  IMPLEMENTATION_PLAN.md
  README.md
```

Do not force every folder into existence on day one. Create a directory when the corresponding phase creates real code. The shape above is a boundary guide, not scaffolding work for its own sake.

## 4. Initial technology decisions

Use:

- TypeScript in strict mode;
- the current maintained Node.js LTS release at implementation time;
- `pnpm` as the package manager;
- current stable Next.js using the App Router and current stable React at implementation time;
- a separate Node.js worker process;
- PostgreSQL as the only durable application datastore and work-queue backing for MVP;
- Drizzle ORM plus Drizzle Kit migrations as the typed SQL/data-access layer;
- Zod for runtime validation of configuration, external inputs, provider responses, and model-produced structured data;
- Vitest for unit and integration tests;
- Playwright for critical end-to-end flows;
- Pino for structured application and worker logging;
- native Node `fetch`/Undici-compatible HTTP behavior behind the safe retrieval module;
- a permitted commercial web-search provider behind the research/discovery seam;
- normal HTTP retrieval for sources whose access method permits it.

Do not add Redis, Kafka, a vector database, a second application datastore, GraphQL, a separate API framework, or a microservice boundary for the MVP. The Next.js application and Node worker may be separate processes, but they share the same domain/service modules and PostgreSQL source of truth.

Before locking exact package versions, verify current stable releases, security advisories, provider SDK status, and official documentation. Do not encode model or search vendor names in the domain model.

## 4A. Implementation-agent execution contract

This file is intended to be sufficient as the primary handoff to an implementation agent working inside this repository. The agent must treat the documents linked from this plan as normative supporting specifications, not optional background reading.

Before writing production code, the implementation agent must read, in this order:

1. `IMPLEMENTATION_PLAN.md`;
2. `CONTEXT.md`;
3. `docs/PRODUCT_SPEC.md`;
4. `docs/EVIDENCE_POLICY.md`;
5. `docs/DATA_MODEL.md`;
6. `docs/ARCHITECTURE.md`;
7. `docs/SCORING.md`;
8. `docs/EVALUATION.md`;
9. `docs/SOURCE_STRATEGY.md`;
10. `docs/FAILURE_MODES.md`;
11. `docs/UX_SPEC.md`;
12. `docs/COST_AND_OPERATIONS.md`;
13. `docs/PRIVACY_LEGAL_PLATFORM.md`;
14. all existing ADRs in `docs/adr/`.

The agent may make ordinary reversible implementation choices without asking for approval, including exact compatible package versions, file naming, helper boundaries, provider SDK choice, and UI component structure, provided those choices satisfy this plan and current official documentation. The canonical stack choices in Section 4 are already decided and should not be replaced merely because another library is familiar.

The agent must not silently decide a product or architecture question that changes a non-negotiable invariant, expands source-access rights, enables external outreach, weakens the evidence model, changes the scoring meaning, introduces a materially different persistence model, or adds a hard-to-reverse infrastructure dependency. Those changes require a new ADR and, when they expand user-visible scope or external authority, explicit user approval.

When an external credential, paid account, or source permission is unavailable, the implementation must continue using the required fake/provider seam and complete all deterministic functionality, fixtures, tests, UI, and adapter contracts that do not require the credential. The missing live credential is recorded as a launch blocker, not used as a reason to leave the architecture unfinished.

The implementation agent should execute phases in order and keep the repository runnable after each phase. A phase is not complete because files exist. It is complete only when its acceptance criteria and stated checks pass.

### Decision hierarchy during implementation

When implementation details appear ambiguous, use this order:

1. non-negotiable invariants in this file;
2. explicit acceptance criteria and domain rules in the linked specifications;
3. existing ADRs;
4. the public module interfaces in `docs/ARCHITECTURE.md`;
5. the simplest reversible implementation that satisfies the above;
6. a new ADR only when the decision is genuinely hard to reverse or changes architecture.

Do not invent missing company facts, source permissions, credentials, user preferences, or business requirements merely to keep coding moving.

## 4B. Single-user and deployment boundary

The MVP is a single-user product for the owner of this repository.

Initial implementation assumptions:

- no organizations, teams, roles, billing, invitations, or multi-tenant authorization;
- local development must work without any public deployment;
- a private single-user deployment is allowed later;
- if the application is exposed to the public internet, add a minimal owner-authentication boundary before treating that deployment as usable;
- authentication must protect the application and review data, but it must not grow into a multi-user identity product during MVP;
- scheduled jobs run with the same single-user configuration and budget policy as manual jobs;
- no target-company credentials or private systems are required for MVP operation.

Public deployment is not required to complete Phases 0 through 8. Phase 9 decides whether and how recurring real use is hosted.

## 4C. Minimum application contract

The exact Next.js routing syntax may follow the current stable framework, but the implemented product must expose the following capabilities through stable application/service boundaries. UI code should call these boundaries rather than embedding orchestration logic in components.

### Run operations

```text
createScoutRun(configuration, seeds?) -> ScoutRun
startScoutRun(runId) -> accepted/current ScoutRun state
cancelScoutRun(runId) -> ScoutRun
getScoutRun(runId) -> ScoutRunDetail
listScoutRuns(filters) -> ScoutRunSummary[]
```

`createScoutRun` persists the complete budget and source configuration before work begins. `startScoutRun` is idempotent for a run already started. `cancelScoutRun` stops future work safely but does not delete completed Company results.

### Company and research operations

```text
addCompanySeed(urlOrSeed, runId?) -> DiscoveryRecord/ResolutionResult
listCompanies(filters) -> CompanySummary[]
getCompany(companyId) -> CompanyDetail
getResearchDossier(companyId, runIdOrVersion?) -> ResearchDossier
requestCompanyResearch(companyId, runId) -> accepted work item
```

Manual seed input must enter the same identity, eligibility, research, evidence, and budget machinery as automatically discovered candidates.

### Opportunity and review operations

```text
listOpportunities(filters) -> OpportunitySummary[]
getOpportunity(opportunityId) -> OpportunityDetail
recordReviewDecision(targetId, decision, reasons?, note?) -> ReviewDecision
listReviewHistory(targetId?) -> ReviewDecision[]
```

Allowed MVP opportunity decisions are:

```text
reject
investigate
prototype
archive
```

These are internal review states only. None sends a message, creates an external CRM object, purchases anything, or changes third-party state.

### Configuration operations

The Settings surface must allow the owner to inspect and change non-secret run defaults, enabled source adapters, freshness policy, model/search configuration identifiers, and scheduling state. Secret values come from environment/secret storage and should be displayed only as configured/not-configured status.

The application API may be implemented with route handlers, server actions, or another current framework-native mechanism. The transport is reversible. The service behavior above is the contract.

## 4D. Canonical implementation defaults

These defaults exist so two competent implementation agents converge on materially the same repository rather than making unnecessary architectural choices.

### Runtime and package layout

- Use one `pnpm` workspace/repository unless an implementation-time Next.js constraint makes a workspace unnecessary; do not split the project into separately versioned services.
- Keep reusable domain, orchestration, provider, persistence, and policy code outside React components and route handlers.
- The web process owns UI and application entry points. The worker process owns durable background execution. Both call the same application/domain services.
- PostgreSQL is the coordination mechanism for durable work, leases, budgets, and scheduling. Do not introduce an external queue for MVP.
- Use UTC timestamps in persistence and domain logic. Convert to local display time only at the UI edge.
- Generate UUIDs in application code or PostgreSQL consistently. Do not use sequential public IDs as product semantics.
- Use JSONB only for bounded metadata/provider diagnostics or versioned dimension maps. Canonical relationships, evidence links, statuses, and review history remain relational.
- No vector embeddings are generated in the default build.

### Web/application boundary

Use Next.js App Router. Prefer server-side reads for initial page data and thin route handlers or server actions for mutations. Do not make React components responsible for run orchestration, budget arithmetic, evidence validation, scoring, or provider calls.

Regardless of transport mechanism, the functions in Section 4C are application-service methods with stable typed inputs and outputs. Route handlers/server actions adapt HTTP/UI concerns to those methods and must not duplicate domain logic.

### Database and migrations

Use Drizzle schema definitions and generated/reviewed forward migrations committed to the repository. A fresh empty PostgreSQL database must be buildable to the latest schema using one documented migration command.

Do not use ORM auto-sync behavior in place of migrations. Production-like startup must never silently mutate the schema.

### Testing

- Vitest owns unit, domain, persistence-integration, and provider-contract tests.
- Playwright owns user-visible end-to-end flows.
- Ordinary automated tests use deterministic fakes and must not make paid model/search calls.
- Database integration tests use an isolated PostgreSQL test database/schema and apply the real migrations.
- A single documented command must run the normal non-live verification suite from a clean checkout after dependencies and PostgreSQL are available.

### Logging and diagnostics

Use Pino structured JSON logs. Every worker log concerning durable work should carry `runId`, `companyId` when applicable, `workItemId`, `stage`, and `attempt` when known. Never log API keys, raw authorization headers, full secret-bearing URLs, or unbounded retrieved page contents.

### Version policy

The library choices above are canonical; exact versions are intentionally not frozen in this planning document. At implementation start, select currently maintained compatible versions from official documentation, record them in the lockfile/package manifest, and do not opportunistically upgrade major versions mid-build unless required to resolve a real incompatibility or security issue.

## 4E. Minimum TypeScript/domain contracts

These shapes define semantic compatibility. Exact source-file placement and additional internal fields may vary, but public application/domain behavior must preserve these meanings. Application code uses camelCase. Database columns may use snake_case through the Drizzle mapping layer.

```ts
type ClaimType = "verified" | "inferred" | "estimated" | "unknown";
type Confidence = "high" | "medium" | "low";
type RunStatus =
  | "draft"
  | "queued"
  | "running"
  | "partially_succeeded"
  | "succeeded"
  | "failed"
  | "cancelled";

type WorkStage =
  | "identity"
  | "eligibility"
  | "research"
  | "evidence"
  | "workflow_hypothesis"
  | "opportunity"
  | "quality_gate"
  | "scoring";

interface RunBudget {
  maxEur: number;
  maxSearchRequests: number;
  maxModelSpendEur: number;
  maxDeepCompanies: number;
  maxRuntimeSeconds: number;
  maxRetriesPerWorkItem: number;
}

interface RunConfiguration {
  geographicScope: string[];
  enabledDiscoverySources: string[];
  enabledResearchSources: string[];
  freshnessPolicyVersion: string;
  evidencePolicyVersion: string;
  scoringRubricVersion: string;
  promptSetVersion: string;
  searchProviderId: string;
  modelProviderId: string;
  extractionModelId: string;
  reasoningModelId: string;
  targetCandidateCount: number;
  budget: RunBudget;
}

interface EligibilityDecision {
  companyId: string;
  eligible: boolean;
  reasonCodes: string[];
  supportingClaimIds: string[];
  unresolvedChecks: string[];
  policyVersion: string;
  decidedAt: string;
}

interface ResearchBudget {
  runId: string;
  companyId: string;
  maxSearchRequests: number;
  maxModelSpendEur: number;
  maxSourceDocuments: number;
  maxRuntimeSeconds: number;
}

interface ResearchDossier {
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

interface WorkflowHypothesis {
  id: string;
  companyId: string;
  researchDossierId: string;
  description: string;
  actors: string[];
  trigger: string;
  likelySteps: string[];
  painHypothesis: string;
  evidenceItemIds: string[];
  claimIds: string[];
  assumptions: string[];
  confirmationQuestions: string[];
  confidence: Confidence;
}

interface AutomationOpportunity {
  id: string;
  workflowHypothesisId: string;
  proposedSystem: string;
  deterministicSteps: string[];
  aiRequiredSteps: string[];
  requiredIntegrations: string[];
  requiredPrivateAccess: string[];
  measurableOutcome: string;
  buildability: "high" | "medium" | "low";
  evidenceStrength: "high" | "medium" | "low";
  genericnessStatus: "specific" | "borderline" | "generic";
  risks: string[];
  nextValidationStep: string;
}

interface QualityGateResult {
  passed: boolean;
  failureCodes: string[];
  warningCodes: string[];
  checkedEvidenceItemIds: string[];
  policyVersion: string;
}

interface Scorecard {
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

type ReviewDecisionValue = "reject" | "investigate" | "prototype" | "archive";

interface ReviewDecision {
  id: string;
  targetType: "company" | "claim" | "workflow_hypothesis" | "automation_opportunity";
  targetId: string;
  decision: ReviewDecisionValue;
  reasonLabels: string[];
  note: string | null;
  createdAt: string;
}

type ProviderErrorCategory =
  | "timeout"
  | "rate_limited"
  | "authentication"
  | "configuration"
  | "invalid_response"
  | "budget_denied"
  | "access_denied"
  | "network"
  | "terminal_provider_failure";

interface ProviderUsage {
  providerId: string;
  operation: string;
  requestCount: number;
  inputTokens?: number;
  outputTokens?: number;
  costEur?: number;
  latencyMs: number;
}

type ProviderResult<T> =
  | { ok: true; value: T; usage: ProviderUsage }
  | { ok: false; category: ProviderErrorCategory; retryable: boolean; message: string; usage?: ProviderUsage };
```

Additional rules:

- `researchCompleteness` is a bounded deterministic value from `0` to `1`, not a model's free-form confidence statement.
- monetary values stored for budget enforcement use an exact fixed-precision representation in PostgreSQL. Do not rely on binary floating point for hard ceilings.
- provider diagnostics may contain vendor-specific fields, but the contracts above and canonical domain entities do not.
- a `verified` Claim is invalid for user-visible use unless at least one `supports` ClaimEvidence link exists to an EvidenceItem.
- `QualityGateResult.passed = false` prevents deterministic scoring/shortlisting as an eligible opportunity, while preserving the rejected artifact and gate reasons for inspection.
- ReviewDecision records are append-only events. The current UI state is derived from the latest decision; historical rows are never rewritten to simulate current state.

## 5. Configuration and environment contract

Create typed environment validation in Phase 0. Exact provider variable names can change, but the application needs these configuration categories:

```text
DATABASE_URL
APP_BASE_URL

SEARCH_PROVIDER
SEARCH_API_KEY

MODEL_PROVIDER
MODEL_API_KEY
MODEL_EXTRACTION_MODEL
MODEL_REASONING_MODEL

DEFAULT_RUN_MAX_EUR
DEFAULT_RUN_MAX_SEARCH_REQUESTS
DEFAULT_RUN_MAX_MODEL_SPEND
DEFAULT_RUN_MAX_DEEP_COMPANIES
DEFAULT_RUN_MAX_RUNTIME_SECONDS
DEFAULT_RUN_MAX_RETRIES

RETRIEVAL_MAX_BYTES
RETRIEVAL_TIMEOUT_MS
RETRIEVAL_USER_AGENT

WORKER_CONCURRENCY
LOG_LEVEL
```

Rules:

- secrets never enter committed config or application tables;
- provider-specific metadata belongs in diagnostics/configuration, not canonical domain entities;
- defaults are safe and bounded;
- missing production-critical configuration fails startup with a clear message;
- tests use explicit fake providers and isolated test configuration.

### Provider adapter contract

The project must have provider-neutral interfaces before adding any paid/live implementation.

Minimum search seam:

```text
searchWeb(query, options, budgetContext) -> SearchResult[] + usage diagnostics
```

Minimum model seam:

```text
runStructuredModel(taskType, input, outputSchema, budgetContext) -> validated output + usage diagnostics
```

Minimum retrieval seam:

```text
retrieveDocument(validatedUrl, retrievalPolicy) -> RetrievalResult
```

Provider adapters must map provider-specific errors into internal error categories such as timeout, rate-limited, authentication/configuration failure, invalid response, budget denied, and terminal provider failure. Domain modules must not branch on vendor-specific exception classes.

Required provider modes:

1. deterministic fake adapters for normal tests and local flows;
2. at least one real permitted search adapter before MVP Definition of Done;
3. at least one real model adapter before MVP Definition of Done;
4. standard safe HTTP retrieval for permitted public pages.

If real credentials are missing, fake adapters must still allow the full application state machine, UI, persistence, failure handling, and evaluation harness to run. A live provider contract test may remain explicitly blocked by credentials, but the code path and configuration validation must already exist.

Provider selection at implementation time must be based on then-current official documentation, commercial-use compatibility, required features, cost observability, and stable structured-output/tooling support where relevant. Record the chosen adapters and verification date in implementation documentation without changing canonical domain vocabulary.

## 6. Database and migration strategy

Use forward-only, versioned SQL migrations from the beginning.

Initial migration order:

1. `companies` and `company_aliases`;
2. `scout_runs` and run-stage/work-item state;
3. `discovery_records`;
4. `source_documents`;
5. `evidence_items`;
6. `claims` and `claim_evidence`;
7. `recent_signals`;
8. `research_dossiers` plus dossier membership/version links;
9. `workflow_hypotheses`;
10. `automation_opportunities`;
11. `scorecards`;
12. `review_decisions`;
13. provider diagnostics, budget ledger, and operational event tables if separate tables are justified by the implementation.

Migration rules:

- migrations are additive by default;
- never silently overwrite historical source content;
- changed SourceDocuments create a new retrieval/version identified by fingerprint and timestamp;
- store rubric version with every Scorecard;
- store model/provider configuration with the ScoutRun diagnostics needed to reproduce evaluation;
- human ReviewDecisions append history;
- schema changes that transform evidence categories require an explicit migration test and ADR review;
- destructive migrations require backup/restore rehearsal before production use.

Before a real deployment exists, migration rollback can mean restoring a disposable development database. Once real review/evidence history exists, prefer forward fixes plus tested backups over destructive reversal.

## 6A. Durable work, idempotency, and concurrency contract

The MVP worker must assume at-least-once execution. A crash, retry, duplicate delivery, or process restart must not create duplicate evidence, duplicate opportunities, double-spend a run budget, or illegally advance state.

Use PostgreSQL-backed durable work/state for the MVP. Do not add Redis, Kafka, or another queue system unless measured implementation requirements later justify it through an ADR.

Every durable Company-stage execution must have an idempotency identity derived from the smallest stable inputs needed to prove equivalence, conceptually:

```text
run_id
+ company_id
+ stage
+ relevant input/version fingerprint
+ policy/prompt/rubric version where output depends on it
```

Rules:

- claiming work and recording its execution state is transactional;
- only one active lease/claim may own the same logical work item at a time;
- leases expire or can be recovered after a worker crash;
- retries reuse the same logical work identity and increment attempt history;
- successful deterministic results are reused when their input fingerprint and applicable policy version are unchanged;
- model/search calls are charged to the budget ledger exactly once per actual provider call;
- a budget reservation/check occurs before dispatching paid work;
- concurrent workers cannot collectively exceed a hard run ceiling through race conditions;
- stage completion is committed only after its required durable outputs validate successfully;
- orchestration may resume an interrupted run by inspecting durable state rather than restarting the entire run;
- cancellation prevents new work from being claimed and allows currently executing bounded operations to settle safely;
- no retry path bypasses source-access restrictions or hard quality gates.

### Work-item states

Use a durable execution state equivalent to:

```text
pending
running
succeeded
failed_retryable
failed_terminal
cancelled
```

Store attempt count, last error category, first/last attempt timestamps, lease/owner metadata when running, and input/output version fingerprints needed for idempotency. Exact table naming is an implementation detail.

### Transaction boundaries

Do not hold database transactions open across network/model calls. The normal pattern is:

1. transactionally claim/reserve work and budget;
2. commit;
3. perform bounded external work;
4. validate returned data;
5. transactionally persist outputs, usage/cost, and final work state;
6. commit;
7. advance orchestration if the stage contract is satisfied.

If a provider succeeds but persistence fails, the retry path must be safe. Where a provider cannot support idempotent requests, accept that the external call may be repeated but ensure budget/cost diagnostics reflect actual calls and internal domain records remain deduplicated by work identity/content fingerprint.

## 6B. Minimum database constraints and indexes

The exact migration filenames may vary, but the following integrity rules are not optional.

### Company identity

- `companies.id` is the stable primary key.
- A normalized non-null canonical domain is unique among active canonical Company records. Domain normalization must lowercase the hostname, remove a leading `www.`, remove path/query/fragment data, and use an IDNA-safe canonical hostname representation.
- A domain collision is resolved through the identity-resolution service before insertion. Do not silently merge two companies inside a database upsert.
- `company_aliases` is unique on the normalized alias value plus alias type/source namespace needed to distinguish legitimate external identifiers.
- Every CompanyAlias references exactly one Company and preserves its source/provenance metadata.

### Source, evidence, and claims

- Every EvidenceItem has a non-null foreign key to SourceDocument.
- A SourceDocument version is unique by the tuple needed to prevent duplicate persistence for the same Company/canonical URL/content fingerprint. Re-fetching unchanged content may update retrieval diagnostics/cached freshness metadata but must not create duplicate historical content versions.
- Changed source content creates a new SourceDocument version/fingerprint; old evidence remains linked to the historical version that produced it.
- `claim_evidence` is unique on `(claim_id, evidence_item_id, relation)`.
- ClaimEvidence foreign keys use restrictive behavior that prevents deleting evidence still referenced by retained claims/history.
- The database schema should constrain Claim `claim_type`, confidence, ClaimEvidence relation, statuses, review values, and work states to known values through PostgreSQL enums or checked text columns. The canonical values remain represented in TypeScript unions so migrations are explicit when they change.
- The service/domain write path must reject a `verified` Claim that has no supporting EvidenceItem. Because this invariant spans rows and transaction ordering, it may be enforced in the transactional service layer rather than with a fragile cross-table database check, but there must be an integration test proving invalid verified claims cannot commit through the supported write API.

### Dossiers, opportunities, scores, and review

- ResearchDossier versions are unique within a Company/ScoutRun identity and preserve their membership/version links.
- AutomationOpportunity has a non-null WorkflowHypothesis foreign key. An opportunity cannot be shortlisted without that relationship.
- Every Scorecard stores a non-null `rubric_version` and the target type/id it scored.
- Scorecard total/dimension values are persisted outputs of deterministic scoring code, not model-provided authoritative arithmetic.
- ReviewDecision rows are append-only. No normal application method updates or deletes an existing review row.
- ReviewDecision has an index on `(target_type, target_id, created_at)` so the latest state and history can be derived efficiently.

### ScoutRun, budget ledger, and durable work

- Every budget charge/reservation has a stable idempotency key unique within the ScoutRun.
- Budget ledger rows record run id, provider operation, reserved/actual amount where applicable, currency/units, work-item identity, and timestamps sufficient to reconcile actual provider calls.
- Hard run budget enforcement and reservation happen transactionally using row locking or equivalent PostgreSQL serialization around the relevant ScoutRun/budget state.
- Durable work items have a unique idempotency key derived from the identity contract in Section 6A.
- Index pending/retryable work by `(status, available_at)` and running work by lease expiry so workers can claim/recover work without full-table scans.
- At most one active logical execution exists per work-item idempotency key. Attempts may have separate history rows, but they cannot create separate successful domain outputs for equivalent work.
- Lease ownership metadata includes owner id, claimed timestamp, and lease expiry. A worker may only mark an item complete when it still owns the active lease or a transactionally safe recovery path proves equivalence.
- Cancellation status is indexed/retrievable cheaply enough that workers can stop claiming new work for a cancelled ScoutRun.

### Operational indexes

At minimum add indexes supporting:

- Company canonical domain lookup;
- alias lookup for identity resolution;
- DiscoveryRecord by ScoutRun and discovered timestamp;
- SourceDocument by Company, canonical URL, fetched timestamp, and content fingerprint;
- Claim by Company/type/created timestamp;
- ResearchDossier by Company/ScoutRun/version;
- AutomationOpportunity by WorkflowHypothesis;
- Scorecard by target/rubric version;
- ReviewDecision history by target/time;
- ScoutRun by status/created or scheduled time;
- work claim/recovery by status/available time/lease expiry;
- budget ledger by ScoutRun and idempotency key.

Do not add indexes speculatively beyond these and obvious foreign-key support until query plans or real usage justify them.

## 6C. Scheduler and duplicate-run semantics

Scheduling is an orchestration trigger, not a second execution system.

Rules:

- The scheduler is disabled by default and remains disabled until Phase 9 launch readiness passes.
- Manual and scheduled ScoutRuns use the same `createScoutRun` plus `startScoutRun` orchestration path, the same RunConfiguration schema, the same budget enforcement, and the same worker stages.
- Store the owner's weekly schedule as non-secret Settings data: enabled flag, timezone, local weekday/time, and the default RunConfiguration reference/version used to instantiate the run.
- Store the intended schedule occurrence identity, conceptually `schedule_id + scheduled_for_utc`, with a uniqueness constraint so two web/worker/scheduler processes cannot create duplicate ScoutRuns for the same weekly occurrence.
- Use PostgreSQL transactional uniqueness and/or a narrowly scoped advisory lock while materializing a due occurrence. Do not rely on in-memory timers as the source of truth for duplicate prevention.
- If the scheduler process is down at the exact due time, it may create the most recent missed occurrence within an explicitly bounded catch-up window. It must not backfill an unbounded series of stale weekly runs.
- Schedule edits affect future occurrences only. They do not mutate already-created ScoutRuns.
- Disabling scheduling prevents new automatic ScoutRuns but does not cancel a run that has already been created or started.
- The implementation must expose the next scheduled occurrence and last scheduler outcome in Settings/diagnostics.

## 6D. Required fake-provider and demo-mode behavior

The entire application must be buildable and testable before the user supplies any live paid credentials.

Implement deterministic fixture-backed adapters for all three provider seams:

1. `FixtureSearchProvider` maps normalized fixture queries to stable SearchResults plus deterministic usage diagnostics.
2. `FixtureRetrievalProvider` maps permitted fixture URLs to stored HTML/text/source metadata and can deterministically simulate timeout, oversized response, redirect rejection, SSRF rejection, changed-content fingerprint, and unavailable-source cases.
3. `FixtureModelProvider` maps task type plus fixture input identity to schema-valid structured outputs and can deterministically simulate malformed structured output, retryable provider failure, terminal failure, and budget denial.

Create at least one canonical seed company fixture with enough evidence to traverse the complete happy path:

```text
manual seed
-> identity resolution
-> eligibility
-> source retrieval
-> EvidenceItems and Claims
-> ResearchDossier
-> WorkflowHypothesis
-> AutomationOpportunity
-> QualityGateResult passed
-> deterministic Scorecard
-> displayed shortlist/review detail
-> appended ReviewDecision
```

Also include fixture cases that deliberately produce:

- insufficient evidence and therefore no shortlisted opportunity;
- conflicting/stale claims;
- duplicate company discovery from two sources;
- a generic AutomationOpportunity that fails the quality gate;
- prompt-injection text inside retrieved content that remains inert data;
- one retryable company-stage provider failure without failing the whole ScoutRun;
- a hard budget denial before another paid/fake-paid operation is dispatched.

The normal local demo/E2E mode selects fake adapters explicitly through typed configuration. It must not silently fall back from a configured live provider to a fake in production-like use because that could hide configuration mistakes.

## 7. Build order

The phases below are sequential gates. Some UI and infrastructure tasks can happen within the same phase, but later phases must not be used to compensate for a failing earlier core value test.

## Phase 0: Repository bootstrap and engineering baseline

### Goal

Create the smallest production-shaped repository that can run a web process, a worker process, connect to PostgreSQL, validate configuration, execute tests, and apply migrations.

### Build

- initialize package manager and TypeScript project;
- initialize Next.js web app;
- create worker entry point;
- configure PostgreSQL locally;
- configure Drizzle ORM and Drizzle Kit as the canonical typed SQL/migration layer;
- configure Zod, Vitest, Playwright, and Pino;
- add migration runner;
- add runtime schema validation;
- add Vitest and Playwright configuration;
- add lint, type-check, unit-test, integration-test, and build scripts;
- add environment validation;
- add structured logging with run/company/stage identifiers;
- add CI for type-check, tests, and build;
- add local development instructions to README.

### Acceptance criteria

- a clean checkout can install dependencies and start the web app;
- the worker starts independently and reports healthy configuration;
- a migration can create and migrate an empty local database;
- missing required configuration fails clearly;
- CI passes on an otherwise empty feature baseline;
- no production deployment is required yet.

### Tests

- config validator accepts valid test configuration and rejects missing critical values;
- database integration test creates a transaction and rolls it back/cleans it safely;
- worker smoke test starts with fake providers;
- web smoke test renders a basic shell.

## Phase 1: Domain model, persistence, and state machine

### Goal

Create the durable data model and deterministic run semantics before provider integrations or model prompts exist.

### Build

- implement core domain types from `docs/DATA_MODEL.md`;
- implement migrations through ReviewDecision;
- implement repositories at aggregate/module boundaries;
- implement ScoutRun statuses and per-company work-item statuses;
- implement legal state transitions;
- implement run budget object and budget ledger primitives;
- implement source version/fingerprint fields;
- implement rubric version storage;
- implement audit timestamps;
- implement append-only ReviewDecision behavior.

### State transition rules

Run states:

```text
CREATED
  -> DISCOVERING
  -> RESOLVING
  -> SCREENING
  -> RESEARCHING
  -> ANALYZING
  -> VALIDATING
  -> RANKING
  -> READY_FOR_REVIEW
```

The implementation may record partial/degraded terminal outcomes defined in `docs/COST_AND_OPERATIONS.md` without pretending every stage completed.

### Acceptance criteria

- invalid state transitions are rejected deterministically;
- a Company can retain aliases and discovery provenance from multiple runs;
- SourceDocument history is versioned rather than overwritten;
- a Verified Claim cannot be persisted/displayed as valid without evidence linkage according to the domain service contract;
- Scorecards retain `rubric_version`;
- ReviewDecisions append rather than mutate previous decisions;
- budget consumption can be recorded transactionally.

### Tests

Test through the highest useful public domain/repository interface:

- state-machine happy path and illegal transition cases;
- duplicate alias uniqueness constraints;
- SourceDocument version creation from changed fingerprint;
- ClaimEvidence invariants;
- ReviewDecision append history;
- Scorecard version persistence;
- budget cannot drop below zero or exceed configured ceiling without changing run outcome.

## Phase 2: First vertical slice input, identity, and eligibility

### Goal

Allow the user to paste a company URL and create a normalized Company that can enter research. Add broad discovery only after this path is solid.

### Build

1. manual URL input;
2. URL/domain normalization;
3. Company identity creation;
4. exact and conservative near-exact duplicate resolution;
5. uncertain-merge review state;
6. deterministic target-profile eligibility rules;
7. EligibilityDecision with machine-readable reasons;
8. basic Company Queue UI showing identity, source, eligibility, and reasons;
9. CSV seed import after single-URL path works;
10. permitted search-provider discovery behind `runDiscovery` after manual/CSV path works.

### Identity rules

- canonical domain is a strong identity signal but not proof in every edge case;
- never auto-merge uncertain companies merely because names are similar;
- retain every DiscoveryRecord when records merge;
- manual user correction has explicit provenance and should not delete source history.

### Eligibility rules

Deterministic gates handle verified geography, known closed/inactive status, source availability, obvious target mismatch, unresolved identity, and prohibited access dependency.

Unknown employee count or stage alone should not reject a company unless the configured target profile explicitly requires it.

### Acceptance criteria

- pasting a valid startup URL creates or resolves one Company;
- submitting the same company through URL and CSV does not create duplicate canonical Companies;
- ambiguous name collisions are surfaced for review rather than auto-merged;
- EligibilityDecision explains every gate result;
- rejected companies consume no deep-research model budget;
- discovery provenance is preserved.

### Tests at module interfaces

`resolveCandidates(discoveryBatch) -> ResolutionResult`

- exact same canonical domain merges;
- alternate known alias merges when evidence is sufficient;
- same/similar name with conflicting domains remains separate or uncertain;
- provenance survives merge.

`evaluateCompany(company, knownSignals, targetProfile) -> EligibilityDecision`

- clear Berlin/Germany fit passes geography;
- verified outside-geography company fails;
- unknown geography remains explicit rather than fabricated;
- closed company fails;
- prohibited-only source path fails;
- explanations are stable and machine-readable.

## Phase 3: Safe source retrieval, evidence, claims, and Research Dossier

### Goal

Make one manually entered Company produce a trustworthy ResearchDossier from permitted public evidence.

This is the most important implementation phase.

### Build in this order

1. safe URL validation;
2. HTTP retrieval with timeout, size/type limits, redirect revalidation, and SSRF protection;
3. SourceDocument canonicalization, metadata, fingerprinting, retrieval status, and freshness;
4. bounded content extraction;
5. search-provider source location behind the Research Module;
6. source reliability tiering;
7. EvidenceItem extraction with source locators;
8. structured Claim extraction;
9. ClaimEvidence relationships;
10. deterministic Verified-Claim evidence validation;
11. Inferred/Estimated/Unknown handling;
12. contradiction reconciliation;
13. RecentSignal extraction;
14. known-unknown collection;
15. versioned ResearchDossier compilation;
16. Research Dossier UI with evidence close to claims.

### Safe retrieval requirements

The fetcher must reject:

- `file:` and unsupported protocols;
- localhost;
- loopback/private/link-local network targets;
- redirects into blocked targets;
- responses above configured size limits;
- unsupported content types when no safe parser exists.

Retrieved text is passed to models as quoted/untrusted source data. Prompts must state that source text cannot change system behavior or request tools/secrets.

### Research strategy

Research should begin with bounded questions, such as:

- What does the company publicly say it does?
- What customer/user type is visible?
- What integrations, workflows, product changes, or hiring signals are visible?
- Is there a recent signal that makes the company worth investigating now?
- What material facts remain unknown?

Prefer Tier 1 sources and use search as a locator. Secondary sources corroborate or fill gaps. Weak conversational sources may motivate hypotheses but do not establish important facts alone.

### Acceptance criteria

- a Company can be researched without any model being allowed to fetch arbitrary URLs directly;
- every SourceDocument has URL, fetch time, retrieval state, fingerprint, and source tier;
- re-fetching unchanged content can reuse deterministic extraction within freshness rules;
- changed content creates a new version/fingerprint;
- every displayed Verified Claim has supporting EvidenceItems;
- every displayed Inferred Claim is labeled and includes reasoning/unknowns needed by the evidence policy;
- contradictions are retained and visible;
- unsupported precise savings cannot enter a ResearchDossier;
- a dossier can explicitly conclude `not enough evidence`;
- research cost is attributed to the Company and ScoutRun.

### Tests at module interface

`researchCompany(company, researchBudget, freshnessPolicy) -> ResearchDossier`

Fixture cases must include:

- strong primary sources;
- no usable source;
- stale funding article;
- contradictory amounts/dates;
- prompt injection text inside a source page;
- redirect to a private-network address;
- oversized document;
- malformed model structured output;
- changed page fingerprint;
- explicit unknown team size.

Expected behavior is asserted on the returned ResearchDossier and diagnostics, not on internal prompt wording.

## Phase 4: Workflow hypotheses and Automation Opportunities

### Goal

Turn evidence into a small number of useful, falsifiable opportunity hypotheses without pretending to know private operations.

### Build

- WorkflowHypothesis generation from ResearchDossier only;
- structured actors, trigger, likely steps, pain hypothesis, evidence, assumptions, and confirmation questions;
- explicit alternative explanation when material;
- AutomationOpportunity generation tied to exactly one WorkflowHypothesis;
- split proposed system into deterministic steps and AI-required steps;
- required integrations and private-access dependencies;
- measurable outcome definition;
- buildability assessment;
- next validation step;
- semantic genericness critic;
- adversarial assumption critic;
- Quality Gate implementing `docs/EVIDENCE_POLICY.md` and `docs/SCORING.md` hard rejects;
- Opportunity Detail UI.

### Opportunity generation contract

An opportunity must answer:

1. What evidence was observed?
2. What workflow is hypothesized?
3. Which part of that workflow is probably painful or expensive in attention, delay, repetition, or errors?
4. What system could reduce that friction?
5. Which steps need AI and which should be ordinary software?
6. What must be true for this to matter?
7. What is still unknown?
8. How would value be measured without inventing a financial baseline?
9. What access would a prototype require?
10. What is the smallest next validation step?

### Genericness gate

Apply the canonical test:

> If the company name and evidence were removed, could this exact proposal be sent to 50 unrelated startups with almost no change?

If yes, reject it or send the Company back for another bounded research pass if budget remains.

### Acceptance criteria

- every opportunity references one WorkflowHypothesis and company-specific evidence;
- private workflow facts remain assumptions/validation questions unless verified;
- deterministic and AI-required implementation steps are separated;
- every surviving opportunity has a measurable outcome and realistic validation path;
- fabricated numeric savings are rejected;
- obvious generic chatbot, lead-gen, meeting-summary, CRM-enrichment, social-content, and knowledge-bot ideas fail unless company-specific evidence materially differentiates them;
- inaccessible integrations lower buildability or trigger a hard gate as defined by scoring rules;
- existing company product capability is checked before proposing a duplicative automation when public evidence can establish it.

### Tests at module interfaces

`analyzeOpportunities(researchDossier) -> OpportunitySet`

- specific dossier produces company-specific workflow hypotheses;
- sparse dossier can produce no opportunity and explain why;
- private assumptions remain assumptions;
- deterministic/AI split is present;
- measurable outcomes do not invent baselines.

`validateOpportunity(opportunity, evidencePolicy) -> QualityGateResult`

- no company-specific evidence rejects;
- generic proposal rejects;
- fabricated savings rejects;
- missing measurable outcome rejects;
- impossible private access rejects or returns the configured hard-gate reason;
- unsupported fact presented as verified rejects;
- valid evidence-backed opportunity passes.

## Phase 5: Deterministic scoring, ranking, reporting, and review

### Goal

Make surviving opportunities comparable and fully inspectable without turning model confidence into a hidden score.

### Build

- implement company rubric `v0.1-prebuild`;
- implement opportunity rubric `v0.1-prebuild`;
- implement fixed 0 to 4 ordinal dimensions normalized to configured weights;
- require rationale and evidence/inference references for non-zero dimensions;
- enforce hard gates before weighted scoring;
- store Scorecard and rubric version;
- separate ranking confidence from raw total score;
- implement uncertainty-band tie behavior;
- implement Ranking Module;
- implement Report Module that introduces no new factual claims;
- implement Weekly Report with at most 3 primary opportunities by default;
- implement ReviewDecisions: reject, investigate, prototype, archive, and note;
- implement Review History.

### Acceptance criteria

- score arithmetic is deterministic and unit tested;
- identical input and rubric version produce identical totals;
- every score is decomposable into dimensions and rationale;
- confidence is displayed separately from score;
- hard-gated opportunities never appear in final ranking;
- report facts are assembled from existing claims/evidence rather than freshly invented during formatting;
- a user can move an opportunity through review decisions without losing historical decisions;
- no contact or outreach action exists.

### Tests at module interfaces

`rankOpportunities(validOpportunities, rubricVersion) -> RankedOpportunitySet`

- arithmetic matches rubric weights;
- hard gates cannot be bypassed by a high weighted score;
- close scores respect confidence/uncertainty policy;
- rubric version is persisted;
- deterministic tie behavior is stable.

`compileReport(scoutRun) -> WeeklyScoutReport`

- no uncited factual claims are created in presentation;
- report honors shortlist maximum;
- partial/degraded run warnings remain visible;
- each opportunity links to score breakdown, evidence, assumptions, and next validation step.

## Phase 6: Golden evaluation benchmark and regression gate

### Goal

Prove the Scout is useful and trustworthy before scheduling it weekly or describing it as reliable.

### Build

- manually create at least 20 real-company golden cases according to `docs/EVALUATION.md`;
- include fit, reject, sparse-evidence, contradiction, duplicate, generic-trap, and strong-opportunity cases;
- record manually verified facts and sources;
- record accepted/rejected WorkflowHypotheses and opportunities;
- create a holdout subset not used during prompt iteration;
- implement fixture importer;
- implement evaluation runner;
- calculate provenance, factual support, unsupported claims, inference labeling, contradiction retention, genericness, opportunity usefulness, ranking overlap, cost, and latency;
- emit a human-readable evaluation report with run/provider/rubric versions;
- create a regression command used before material prompt/model/retrieval/rubric changes ship.

### Required initial release gates

From `docs/EVALUATION.md`:

- no incorrect merges in golden identity cases;
- at least 95% provenance retention;
- at least 90% precision on deterministic eligibility rejects where verified data exists;
- at least 95% sampled displayed factual-claim support;
- unsupported factual claims below 5%;
- 100% of displayed Inferred Claims labeled as inferred;
- zero invented precise monetary/labor savings without a baseline;
- zero silent contradiction drops in designed contradiction cases;
- WorkflowHypothesis median human score at least 4/5 on suitable holdout companies;
- at least 70% of final-shortlist opportunities score 4/5 or better for overall usefulness;
- generic suggestion rate below 15%;
- at least 80% of shortlisted opportunities contain a concrete measurable outcome and realistic next validation step;
- at least 2 of the human top 3 appear in the Scout top 5 on the holdout ranking comparison;
- full development benchmark stays within the €20 equivalent safety ceiling unless explicitly overridden.

### Acceptance criteria

- benchmark runs from one documented command;
- result includes quality, cost, and latency metrics;
- holdout cases are not silently moved into tuning data;
- a material model/prompt/source-ranking change that fails regression gates is blocked from release;
- failures retain enough artifacts to understand which module regressed.

## Phase 7: Cost controls, caching, resilience, and worker operations

### Goal

Make repeated use economically predictable and operationally boring.

### Build

- enforce all Budget Object fields in orchestration;
- implement stage-level cost ledger;
- attribute search/model/retrieval usage to ScoutRun and Company;
- cache unchanged SourceDocuments under freshness policy;
- reuse deterministic extraction for unchanged content;
- implement bounded reason-specific retries;
- implement rate-limit handling;
- implement one constrained structured-output repair where appropriate;
- implement company-level failure isolation;
- implement partial run outcomes;
- implement worker concurrency limit;
- implement cancellation;
- implement run diagnostics and stage timings;
- implement manual run trigger;
- add scheduler but keep it disabled until launch gate passes.

### Acceptance criteria

- a provider timeout does not cause unlimited retries;
- a prohibited/blocked source is not retried with bypass behavior;
- budget cannot be exceeded through concurrent work without the run entering an explicit exhausted/degraded outcome;
- one failed Company does not destroy completed dossiers for other companies;
- cached unchanged content reduces repeated retrieval/model work where safe;
- every run records configured vs actual budget, calls, retries, failures, cache hits, and final shortlist count;
- cost per ResearchDossier and cost per human-shortlisted opportunity can be calculated.

### Tests

- inject search rate limit;
- inject retrieval timeout;
- inject malformed structured output twice;
- exhaust currency/search/deep-company budgets independently;
- crash one Company job during a multi-company run;
- cancel a running ScoutRun;
- verify partial status and retained completed work;
- verify stale content is refreshed instead of incorrectly served from cache.

## Phase 8: UX trust layer and product polish

### Goal

Make the evidence model understandable at a glance and make review faster than reading raw research.

### Build

Primary navigation:

- Scout Runs;
- Companies;
- Opportunities;
- Reviews;
- Settings.

Required surfaces:

1. Scout Run detail;
2. Company Queue;
3. Research Dossier;
4. Opportunity Detail;
5. Weekly Report;
6. Review History;
7. Settings.

Opportunity Detail must show:

- observed evidence;
- Workflow Hypothesis;
- proposed automation;
- deterministic vs AI-required steps;
- expected/measurable value without fabricated baseline;
- assumptions and Unknowns;
- buildability;
- score breakdown;
- confidence;
- next validation step.

### Trust UI requirements

- Verified/Inferred/Estimated/Unknown use text labels and semantics, not color alone;
- citations remain near the claim they support;
- contradictions are visible;
- stale evidence has a warning;
- score dimensions and rationale are inspectable;
- run budget and degraded status are visible;
- partial runs are never styled as complete;
- the UI does not collapse all uncertainty into one confidence badge.

### Acceptance criteria

- a reviewer can trace any displayed factual claim to its source in one interaction;
- keyboard navigation works for primary review actions;
- labels remain understandable without color perception;
- responsive layout works for laptop and common mobile widths used for review;
- no clipped evidence, score, or review controls in supported viewport checks;
- all destructive-looking review actions are actually reversible history entries, not evidence deletion.

### End-to-end Playwright flows

1. paste company URL -> research -> dossier -> opportunity -> review decision;
2. duplicate company input -> existing Company resolved;
3. sparse evidence -> `not enough evidence` visible;
4. generic opportunity -> rejected before shortlist;
5. partial budget run -> warning visible in report;
6. contradiction -> both evidence paths visible;
7. stale source -> staleness warning visible;
8. review decision -> history retained.

## Phase 9: Launch-readiness gate and weekly scheduling

### Goal

Enable recurring real use only after the product demonstrates trustworthy output, predictable cost, permitted source access, and recoverable operations.

### Pre-launch review

Recheck at the actual launch date:

- Product Hunt terms if any Product Hunt integration is contemplated;
- search-provider commercial and caching/storage terms;
- model-provider data retention and commercial-use terms;
- automated retrieval compatibility for each configured source;
- Berlin/Dealroom/portfolio source access assumptions;
- privacy/data-retention policy;
- deletion/export needs;
- dependency security advisories;
- secret handling;
- database backup/restore procedure;
- SSRF and retrieval controls;
- evaluation benchmark results;
- measured weekly cost estimate.

### Operational gate

Before enabling weekly scheduling:

- golden benchmark meets the current release gates;
- no open severity-one fact/inference presentation defect exists;
- benchmark cost is measured and a lower normal weekly budget is chosen from evidence;
- one full manual run has completed from discovery through review;
- a partial provider outage has been tested safely;
- backup and restore have been demonstrated on non-production data;
- source configuration lists access method and current verification date;
- user can disable scheduling immediately.

### Acceptance criteria

- weekly scheduling is opt-in;
- schedule configuration includes scope and budget;
- scheduled run uses the same orchestration path as manual run;
- failures do not trigger external outreach or uncontrolled retries;
- run completion produces an internal Weekly Report only.

## 8. Exact first vertical slice

The first vertical slice is the highest-priority implementation target and should be demonstrable before broad discovery work expands.

### Input

User pastes one company homepage URL.

### Required path

1. normalize URL/domain;
2. create/resolve Company;
3. create ScoutRun with small explicit budget;
4. validate homepage URL and retrieve it safely;
5. use permitted search to locate a bounded set of strong supporting pages;
6. fetch original permitted pages;
7. persist SourceDocuments with fingerprints;
8. extract EvidenceItems;
9. create Verified/Inferred/Unknown Claims;
10. retain contradictions if found;
11. compile ResearchDossier;
12. generate up to three WorkflowHypotheses;
13. generate up to three AutomationOpportunities;
14. run evidence, genericness, unsupported-number, access, and measurable-outcome gates;
15. score the surviving opportunity set;
16. show the highest-ranked opportunity with evidence and uncertainty;
17. let the user choose reject, investigate, prototype, or archive;
18. persist ReviewDecision;
19. show run cost and diagnostics.

### First vertical slice success condition

For at least several manually reviewed companies, the system should produce either:

- one opportunity the user considers genuinely worth investigating, with company-specific evidence and a realistic next validation step; or
- an explicit, credible `not enough evidence / no good opportunity` result.

The second result is preferable to a generic invention.

If this slice repeatedly fails to produce useful opportunities on hand-picked companies with rich public evidence, stop and revisit the research/opportunity assumptions before investing in broader discovery, scheduling, or UI polish.

## 9. Module verification matrix

| Module | Public seam | Primary proof |
| --- | --- | --- |
| Discovery | `runDiscovery(runConfiguration)` | provenance retained, bounded source use, graceful source failure |
| Identity Resolution | `resolveCandidates(discoveryBatch)` | no incorrect golden-set merges, uncertain cases surfaced |
| Eligibility | `evaluateCompany(...)` | deterministic gate precision and inspectable reasons |
| Research | `researchCompany(...)` | citation support, contradiction retention, hostile-content safety, cost bound |
| Opportunity Analysis | `analyzeOpportunities(...)` | specificity, assumptions, measurable outcomes, deterministic/AI split |
| Quality Gate | `validateOpportunity(...)` | rejects generic, unsupported, fabricated, inaccessible proposals |
| Ranking | `rankOpportunities(...)` | reproducible rubric arithmetic and hard-gate enforcement |
| Reporting | `compileReport(...)` | presentation introduces no new factual claims |
| Orchestration | ScoutRun execution | legal transitions, budgets, retries, isolation, partial outcomes |
| Review | ReviewDecision API/service | append-only history and no automatic external action |

## 10. Test strategy

Use the smallest test layer that proves the behavior while preferring public module seams.

### Unit tests

Use for deterministic pure logic:

- URL/domain normalization;
- score arithmetic;
- freshness windows;
- state transition legality;
- budget arithmetic;
- hard-gate predicates;
- source-tier rules;
- generic required-field validation.

### Integration tests

Use for behavior crossing persistence or provider seams:

- repository invariants with PostgreSQL;
- migrations from empty database;
- Research Module with fake search/model/retrieval providers;
- source versioning/fingerprinting;
- orchestration with budget/failure injection;
- evaluation runner fixture loading.

### Contract tests for provider adapters

For each real search/model/retrieval adapter, test only the behavior the domain depends on:

- request succeeds with valid credentials in an opt-in environment;
- provider response maps to internal schema;
- cost/usage metadata is captured when available;
- rate limit/error maps to the expected retry classification;
- no provider-specific object leaks into domain entities.

Do not make normal CI depend on paid live provider calls.

### End-to-end tests

Keep E2E focused on the review-critical paths listed in Phase 8. Do not attempt to prove model quality through browser tests. Model quality belongs in the golden evaluation harness.

### Evaluation tests

Prompt/model/retrieval quality is evaluated statistically/humanly against the golden set, not with brittle string-equality unit tests.

## 11. Observability required from the first real run

Every ScoutRun must make it possible to answer:

- how many candidates entered each stage;
- why candidates were rejected or deferred;
- which providers were called;
- what each stage cost;
- how many retries occurred and why;
- which sources failed;
- whether cache was used;
- which Quality Gate reasons rejected opportunities;
- how long each stage took;
- whether the run was complete or partial;
- which opportunities the user ultimately considered useful.

Structured logs should carry `run_id`, `company_id`, and `stage` when applicable. Do not log API keys, raw secrets, or unnecessary personal data.

## 12. Security verification checklist

Before any external-source implementation is considered complete:

- block private/loopback/link-local/local-file retrieval targets;
- validate every redirect target;
- impose response size and timeout limits;
- permit only expected protocols;
- sanitize rendered content;
- treat source text as untrusted prompt data;
- never expose secrets in model context;
- never follow tool instructions contained in retrieved pages;
- use runtime schemas on model/provider output;
- store minimum source content necessary for evidence/provenance;
- document access terms/method for each automated source;
- ensure the worker has no outreach/messaging capability.

## 13. Source connector readiness checklist

Before implementing any automated source connector:

1. identify the source owner;
2. determine whether an official API, feed, or export exists;
3. verify current intended-use/commercial terms;
4. check technical restrictions and robots behavior where relevant;
5. define a polite rate limit;
6. document the retrieval method in `docs/SOURCE_STRATEGY.md`;
7. define fallback behavior when unavailable;
8. add source-specific freshness policy if needed;
9. add a fixture and failure test;
10. make disabling the connector a configuration change, not a code rewrite.

No single discovery source may become a required single point of failure.

## 14. What not to build yet

Do not build these until the MVP benchmark and core value proposition justify them:

- automatic email outreach;
- automatic LinkedIn messaging or scraping;
- autonomous prototype generation for target companies;
- CRM synchronization;
- private target-company integrations;
- people-level prospecting database;
- multi-user accounts, roles, billing, or enterprise permissions;
- vector database or embeddings unless evaluation demonstrates a concrete need;
- microservices;
- Kubernetes or complex infrastructure;
- always-on crawler;
- large permanent mirror of third-party web content;
- automatic purchase of data or subscriptions;
- Product Hunt commercial API integration without then-current compatible permission;
- model-router complexity before benchmark evidence shows a meaningful cost/quality benefit;
- self-modifying prompts/rubrics based only on production feedback;
- automatic sending/publishing of Opportunity Briefs.

## 15. Definition of done for MVP

The MVP is done only when all of the following are true:

### Product behavior

- manual company URL and CSV input work;
- at least one permitted automated discovery path works without Product Hunt dependency;
- duplicate resolution retains provenance;
- eligibility is inspectable;
- ResearchDossiers preserve source evidence and uncertainty;
- AutomationOpportunities are tied to company-specific WorkflowHypotheses;
- hard gates reject generic/unsupported opportunities;
- scoring is deterministic and versioned;
- final shortlist is small and inspectable;
- ReviewDecisions persist history;
- no outreach path exists.

### Trust

- every displayed factual claim is traceable to evidence;
- Inferred/Estimated/Unknown labels are visible and structurally correct;
- contradictions and stale evidence are surfaced;
- no unsupported precise savings claims appear;
- prompt-injection fixture does not alter application/tool behavior;
- retrieval SSRF checks pass.

### Evaluation

- golden set contains at least 20 real reviewed companies with holdout cases;
- current release gates in `docs/EVALUATION.md` pass;
- benchmark results include cost and latency;
- prompt/model/retrieval/rubric changes have a repeatable regression command.

### Operations

- ScoutRun budget is enforced deterministically;
- company failures are isolated;
- retries are bounded;
- partial outcomes are explicit;
- cache/freshness behavior is tested;
- run diagnostics are inspectable;
- all committed migrations apply successfully from an empty PostgreSQL database;
- durable work survives worker interruption/restart without duplicate successful domain outputs;
- fake-provider mode completes the canonical seed company flow end to end without secrets;
- duplicate scheduler processes cannot create two ScoutRuns for one schedule occurrence;
- backup/restore is documented and demonstrated before retaining valuable production history.

### UX

- one end-to-end review flow passes in Playwright;
- evidence is one interaction away from claims;
- epistemic labels do not rely on color alone;
- review works at supported laptop/mobile widths;
- degraded and stale states are visible.

### Source/platform readiness

- every enabled automated source has a documented access method and verification date;
- provider commercial-use assumptions are rechecked before regular use;
- Product Hunt is not a hidden required dependency;
- LinkedIn automation is absent;
- data minimization/retention policy is defined before broader commercial use.

## 16. Recommended implementation milestones

Use these milestones for progress reporting:

### Milestone A: Skeleton works

Phases 0 and 1 complete. Web, worker, database, migrations, state, and budgets exist with tests.

### Milestone B: One company becomes a trustworthy dossier

Phases 2 and 3 complete for manual URL input. This proves retrieval, evidence, claims, and provenance.

### Milestone C: One dossier becomes a useful opportunity

Phases 4 and 5 complete. A user can review an evidence-backed opportunity and record a decision.

This is the first point at which the product concept is meaningfully demonstrated.

### Milestone D: Quality is measured

Phase 6 complete. Golden benchmark says whether the system deserves trust.

### Milestone E: Repeated runs are economical and reliable

Phase 7 complete. Cost, retries, caching, failures, and partial runs behave predictably.

### Milestone F: Product is usable weekly

Phases 8 and 9 complete. Trust-oriented UX passes, current source terms are rechecked, manual production run passes, then weekly scheduling can be enabled.

## 17. Stop conditions during implementation

Pause feature expansion and investigate the root cause if any of these occur:

- repeated unsupported factual claims above the evaluation threshold;
- a model can cause retrieval/tool behavior through page prompt injection;
- duplicate resolution incorrectly merges distinct golden-set companies;
- generic suggestion rate remains high after bounded research improvements;
- the first vertical slice cannot produce useful or correctly-empty results on hand-picked rich-evidence companies;
- budget enforcement can be bypassed by concurrency/retry paths;
- source access terms do not support the proposed automated use;
- actual cost per human-shortlisted opportunity is too high to justify the workflow.

The correct response to these failures is to improve or reconsider the relevant module, not to hide the problem with more autonomous behavior or more generated output.

## 18. First coding task when implementation begins

The first implementation PR/change should contain only the Phase 0 baseline and enough Phase 1 schema to prove migrations and the ScoutRun budget/state contract. It should not include model prompts, web scraping, broad discovery, or opportunity generation.

The next implementation change should create the manual-URL vertical path through identity and safe retrieval. This keeps engineering risk aligned with product risk and avoids spending time on a large discovery system before the evidence-to-opportunity core is proven.

## 19. Canonical full-build handoff

When an implementation agent is told to build this project from this file, the intended instruction is:

> Read `IMPLEMENTATION_PLAN.md` and every normative project document it names. Implement Startup Automation Scout through the complete MVP Definition of Done, phase by phase, using the current repository as the source of truth. Continue autonomously through the phases while acceptance criteria pass. Make ordinary reversible engineering decisions yourself using current official documentation and the simplest implementation consistent with the architecture. Do not stop after planning, scaffolding, the first vertical slice, or an intermediate milestone when later in-scope phases remain. Do not weaken evidence, budget, source-access, security, or human-approval invariants to make progress. Run and record the required checks at each phase. If a live API credential, paid account, explicit source permission, or other authority only the user can supply is missing, finish everything that can be implemented and tested with the provider seam/fakes, isolate the exact blocked live verification, and continue with all independent work. Never fabricate credentials or permission. The project is complete only when the Definition of Done is satisfied or the remaining blockers genuinely require external user authority.

### Expected agent behavior during a full build

- Inspect existing work before modifying it and preserve unrelated user changes.
- Initialize Git during Phase 0 if the directory is still not a repository.
- Keep commits/changes scoped by milestone when practical, but do not require the user to approve each reversible implementation step.
- Prefer working software plus tests over creating more planning documents unless a new ADR is actually required.
- Use fake provider adapters in normal automated tests and never make paid live calls from ordinary CI.
- Verify version-sensitive package/provider choices against current official documentation at implementation time.
- Keep the web application and worker independently runnable.
- Keep PostgreSQL as the durable source of truth and initial durable-work backing.
- Build the manual-URL vertical slice before optimizing discovery volume.
- Treat an explicit `not enough evidence` result as successful behavior when evidence is insufficient.
- Do not add outreach, LinkedIn automation, autonomous prototype generation, people-level prospecting, multi-user billing, or other out-of-scope features.
- Do not claim a phase or the MVP is complete without running its stated verification.

### Legitimate blockers that may require the user

The implementation agent should ask for user input only when the missing information or authority cannot safely be derived from the repository or current official documentation. Typical examples are:

- an API key or account credential the user must create or supply;
- acceptance of a paid provider cost;
- a source license or commercial permission requiring the user's agreement;
- a deployment account/domain decision when deployment is explicitly requested;
- an expansion into external outreach or private target-company systems;
- a product/architecture change that would violate or materially revise a non-negotiable invariant.

Routine choices such as compatible package versions, component composition, internal helper naming, migration filenames, route-handler versus server-action transport, or provider SDK implementation details are not blockers when a safe reversible choice exists. Section 4 already fixes the package manager, framework family, SQL/query layer, schema validator, test runners, logger, PostgreSQL work backing, and no-vector/no-external-queue defaults.

### Final completion report required from the implementation agent

At the end of a full build, report:

1. which phases and milestones are complete;
2. exact major files/modules created or changed;
3. database migrations applied/tested;
4. tests, type checks, lint, builds, E2E checks, and evaluation commands run with results;
5. live provider integrations verified and which remain credential-blocked, if any;
6. benchmark quality, cost, and latency results when the golden set is complete;
7. source/access assumptions reverified and their dates;
8. remaining risks or external blockers;
9. whether the MVP Definition of Done is fully satisfied.

Do not substitute a statement such as "the code looks complete" for this evidence.

## 20. Implementation completeness audit

An implementation agent must run this audit before declaring the MVP complete. A checked box means there is executable or inspectable evidence, not merely that a file with the expected name exists.

### Repository and build

- [ ] package manager, Node version policy, install command, development command, worker command, migration command, test command, E2E command, and evaluation command are documented;
- [ ] dependency installation from the lockfile succeeds;
- [ ] TypeScript strict type-check passes;
- [ ] lint/static checks pass;
- [ ] production Next.js build passes;
- [ ] web and worker processes start independently with valid configuration;
- [ ] there are no `TODO`, `TBD`, `FIXME`, or placeholder implementation branches in required MVP paths.

### Database and durable execution

- [ ] all migrations apply in order from an empty PostgreSQL database;
- [ ] required uniqueness, foreign-key, status/value, append-only-service, and operational index behaviors in Section 6B have integration coverage;
- [ ] an interrupted worker lease can be recovered;
- [ ] duplicate delivery/retry does not create duplicate successful evidence, dossiers, opportunities, Scorecards, or budget charges for the same logical work;
- [ ] concurrent budget reservations cannot exceed a ScoutRun hard ceiling;
- [ ] cancellation stops new claims without deleting completed Company results;
- [ ] historical SourceDocument content is not silently overwritten.

### Domain and evidence invariants

- [ ] Verified/Inferred/Estimated/Unknown remain structurally distinct through persistence, services, and UI;
- [ ] the supported write path cannot commit a user-visible Verified Claim without supporting EvidenceItems;
- [ ] Inferred Claims retain reasoning/evidence motivation;
- [ ] conflicting and stale evidence remain visible rather than being silently resolved by generation;
- [ ] AutomationOpportunity requires a WorkflowHypothesis;
- [ ] generic or unsupported opportunities fail the Quality Gate before ranking;
- [ ] scoring arithmetic is deterministic and every persisted Scorecard has a rubric version;
- [ ] ReviewDecisions append history and never trigger external outreach.

### Provider seams and no-secret proof

- [ ] FixtureSearchProvider, FixtureRetrievalProvider, and FixtureModelProvider implement the same public seams as live adapters;
- [ ] the canonical seed fixture completes the full manual-seed-to-ReviewDecision E2E path with no search/model credential present;
- [ ] fake failure fixtures prove retryable failure, terminal failure, invalid model structure, insufficient evidence, prompt injection inertness, duplicate discovery, stale/conflicting evidence, genericness rejection, and budget denial;
- [ ] ordinary CI/test commands cannot accidentally make paid live provider calls;
- [ ] missing live credentials produce an explicit configured/not-configured state rather than invented credentials or silent fake fallback;
- [ ] at least one permitted search adapter and one model adapter are implemented behind the provider-neutral contracts; any credential-blocked live verification is named precisely in the final report.

### Retrieval and security

- [ ] SSRF/private-network/loopback/link-local protections pass for direct URLs and redirects;
- [ ] retrieval byte, redirect, content-type, and timeout limits are enforced before unbounded processing;
- [ ] retrieved text cannot issue application instructions or expand tool/source permissions;
- [ ] secrets are absent from committed files, persisted canonical entities, browser payloads, and normal logs;
- [ ] public deployment, if performed, has an owner-authentication boundary;
- [ ] source-access restrictions cannot be bypassed through retries or alternate adapters.

### Scheduling and operations

- [ ] scheduler is off by default through Phase 8;
- [ ] manual and scheduled runs call the same orchestration path;
- [ ] one weekly occurrence can create at most one ScoutRun across concurrent scheduler processes;
- [ ] schedule timezone and next occurrence are inspectable;
- [ ] catch-up behavior is bounded and does not create an unbounded backlog;
- [ ] run logs/diagnostics expose run, stage, work item, attempt, usage, cost, failure category, and degradation information needed for debugging without exposing secrets.

### Evaluation and UX

- [ ] the golden evaluation command is runnable and uses the versioned rubric/policy/prompt configuration recorded with results;
- [ ] the golden set contains the minimum reviewed cases required by `docs/EVALUATION.md` before final quality claims are made;
- [ ] current release gates pass or the exact failed gate blocks the release claim;
- [ ] evaluation output includes quality, cost, and latency;
- [ ] Playwright covers creating/running a ScoutRun, inspecting evidence-backed output, explicit insufficient-evidence behavior, and appending a ReviewDecision;
- [ ] evidence is one interaction away from displayed factual claims;
- [ ] epistemic labels work without color-only meaning and supported responsive widths pass.

### Platform/scope guardrails

- [ ] enabled automated sources have documented access method, commercial-use assumption, and verification date;
- [ ] Product Hunt is not required for the MVP and no commercial Product Hunt API use is introduced without compatible permission;
- [ ] no LinkedIn scraping, LinkedIn messaging, email outreach, CRM mutation, purchase, or other target-company external action exists;
- [ ] no Redis/Kafka/vector database/microservice architecture has been added without an ADR backed by a demonstrated need;
- [ ] retries, research depth, search count, model spend, runtime, and retrieved bytes are all bounded;
- [ ] one Company failure cannot fail the whole ScoutRun unless the run-level invariant itself is broken.

### Completion rule

The implementation is allowed to report `MVP complete` only when every applicable item above and Section 15 passes. If an item cannot pass solely because it requires a credential, paid account, deployment authority, source license, or other external user-controlled permission, the agent must:

1. finish the code, fake/contract test, UI state, configuration path, and documentation for that capability;
2. mark only the live verification as blocked;
3. state exactly what external authority is missing;
4. continue all unrelated implementation and verification;
5. never reinterpret an external-authority blocker as permission to weaken an invariant.

No new product planning or architecture choice should be required to implement the intended MVP from this plan and its normative documents. If an implementation agent believes such a choice is missing, it must first search the normative documents and decision hierarchy, then identify the exact unresolved contradiction or absent requirement rather than asking a broad design question.
