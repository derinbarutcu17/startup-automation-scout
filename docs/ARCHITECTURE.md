# System Architecture

## Architectural Goal

Build a staged, evidence-first research system that is cheap to inspect and easy to test. The architecture should hide complicated provider behavior behind a small number of deep modules while keeping domain decisions deterministic where possible.

The Scout is not one unconstrained autonomous agent. It is an orchestrated workflow in which AI is used only at stages where interpretation or synthesis is genuinely useful.

## System Shape

```text
Manual seeds / permitted discovery sources / search provider
                         ↓
                  Discovery Module
                         ↓
                 Identity Resolution
                         ↓
                 Eligibility Module
                         ↓
                  Research Module
                         ↓
                Evidence + Claims
                         ↓
              Opportunity Analysis
                         ↓
                 Quality Gate
                         ↓
                  Ranking Module
                         ↓
               Opportunity Briefs
                         ↓
                  Human Review
```

## Primary Deep Modules

### 1. Discovery Module

Responsibility:

- ingest candidate companies from configured sources;
- normalize candidate metadata;
- preserve source provenance;
- emit DiscoveryRecords.

External interface concept:

```text
runDiscovery(runConfiguration) -> DiscoveryBatch
```

The caller should not need to know whether candidates came from search queries, curated feeds, manual seeds, or later licensed sources.

### 2. Identity Resolution Module

Responsibility:

- normalize company names and domains;
- match candidates against existing Companies;
- merge aliases and discovery provenance;
- surface uncertain merges for review instead of forcing them.

External interface concept:

```text
resolveCandidates(discoveryBatch) -> ResolutionResult
```

### 3. Eligibility Module

Responsibility:

- apply deterministic target-profile gates;
- compute candidate priority dimensions;
- reject clearly irrelevant candidates before expensive research;
- explain every gate decision.

External interface concept:

```text
evaluateCompany(company, knownSignals, targetProfile) -> EligibilityDecision
```

No LLM is needed for arithmetic, geographic gates, date windows, or already-known structured facts.

### 4. Research Module

Responsibility:

- form bounded research questions;
- locate permitted original sources;
- retrieve and normalize SourceDocuments;
- extract EvidenceItems;
- produce and reconcile Claims;
- identify recent signals and known unknowns;
- emit a versioned ResearchDossier.

External interface concept:

```text
researchCompany(company, researchBudget, freshnessPolicy) -> ResearchDossier
```

This is intentionally a deep module. Provider-specific search calls, page retrieval, source ranking, extraction retries, and contradiction handling should stay inside it.

### 5. Opportunity Analysis Module

Responsibility:

- convert a ResearchDossier into a small set of WorkflowHypotheses;
- identify the evidence and assumptions behind each hypothesis;
- propose deterministic and AI-assisted automation steps separately;
- define measurable outcomes and validation questions;
- reject ideas that require unsupported private facts.

External interface concept:

```text
analyzeOpportunities(researchDossier) -> OpportunitySet
```

### 6. Quality Gate Module

Responsibility:

- enforce evidence requirements;
- detect unsupported numbers;
- reject Generic Suggestions;
- check source freshness and contradictions;
- ensure required fields are present;
- return explicit failures rather than silently repairing serious evidence gaps.

External interface concept:

```text
validateOpportunity(opportunity, evidencePolicy) -> QualityGateResult
```

This interface is also the primary test seam for trust behavior.

### 7. Ranking Module

Responsibility:

- apply versioned deterministic rubrics;
- compute Company and AutomationOpportunity scorecards;
- enforce hard gates before weighted ranking;
- explain why one opportunity outranks another.

External interface concept:

```text
rankOpportunities(validOpportunities, rubricVersion) -> RankedOpportunitySet
```

### 8. Report Module

Responsibility:

- compile Company summaries and Opportunity Briefs;
- expose citations, assumptions, confidence, and next validation steps;
- produce the weekly shortlist;
- never create new factual claims during presentation.

External interface concept:

```text
compileReport(scoutRun) -> WeeklyScoutReport
```

## Orchestration Module

The orchestration layer advances work through the state machine, applies budgets, records failures, and coordinates modules. It does not contain research judgment itself.

```text
CREATED
  ↓
DISCOVERING
  ↓
RESOLVING
  ↓
SCREENING
  ↓
RESEARCHING
  ↓
ANALYZING
  ↓
VALIDATING
  ↓
RANKING
  ↓
READY_FOR_REVIEW
```

Individual Company work items can independently reach:

```text
DISCOVERED
ELIGIBLE
RESEARCHED
OPPORTUNITIES_GENERATED
VALIDATED
SHORTLISTED
REJECTED
DEFERRED
FAILED_RETRYABLE
FAILED_TERMINAL
```

One failed Company must never force an entire ScoutRun into failure unless the run has lost all usable discovery or research capability.

## Deterministic vs AI Responsibilities

### Deterministic software

- URL normalization;
- domain extraction;
- company alias matching where exact/near-exact rules suffice;
- date and freshness calculations;
- geographic gates from verified structured data;
- duplicate prevention;
- budget accounting;
- score arithmetic;
- state transitions;
- required-field validation;
- citation existence checks;
- persistence;
- scheduling;
- retries and timeouts;
- report formatting.

### AI-assisted reasoning

- company/product synthesis from multiple sources;
- source relevance triage where rules are insufficient;
- extracting normalized claims from prose;
- detecting contradictory meaning across sources;
- generating WorkflowHypotheses;
- separating automation steps that need AI from those that do not;
- detecting genericness semantically;
- challenging opportunity assumptions;
- summarizing evidence for the user.

AI outputs never bypass schema validation or evidence gates.

## Initial Runtime Architecture

Use one TypeScript repository with two runtime processes:

1. **Web application**: user interface, review actions, run configuration, read-heavy queries.
2. **Worker**: scheduled ScoutRuns, source retrieval, AI calls, retries, evaluation jobs.

Use PostgreSQL as the durable state store and work queue backing where practical. Avoid a distributed microservice architecture. This is a solo project and benefits from locality.

Recommended initial technology choices:

- TypeScript;
- current stable Next.js with React for the web application;
- PostgreSQL;
- a thin SQL/query layer with migrations;
- Node.js worker process;
- standard HTTP retrieval plus a commercial search provider for permitted web discovery;
- provider SDKs only behind the Research Module implementation;
- structured model outputs validated with a runtime schema library;
- Playwright for end-to-end product tests;
- unit/integration tests using the same public module interfaces callers use.

Do not lock model vendors or search vendors into domain entities. Store provider metadata as run diagnostics, not as core business vocabulary.

## External Seams

Only create explicit provider seams when behavior actually varies or tests need a fake at that level. Expected seams likely to earn their keep:

- model execution;
- web search;
- document retrieval;
- clock for freshness tests;
- cost meter.

Do not create dozens of one-method wrapper classes around every library. The domain modules above should remain the stable interfaces.

## Observability

Every ScoutRun records:

- stage timings;
- candidates entering and leaving each stage;
- provider calls;
- token/search/retrieval cost where measurable;
- cache hits;
- retry counts;
- source failures;
- quality-gate rejection reasons;
- actual vs configured budget;
- model/provider configuration;
- final shortlist count.

This is necessary both for debugging and for proving whether the Scout saves research effort.

## Security Basics

- secrets live in environment/secret storage, never in the database or committed files;
- retrieved content is treated as untrusted input;
- model prompts must treat source text as data, not instructions;
- outbound URLs are validated before fetching;
- private-network and local-file targets are denied by the retrieval layer;
- rendered research text is escaped/sanitized by the application framework;
- no external message-sending or mailbox tools are available to the MVP worker;
  the optional Gmail integration is a separate application-level create-draft
  boundary after explicit approval.
