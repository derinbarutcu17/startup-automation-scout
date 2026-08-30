# Cost and Operations Plan

## Operating Principle

Spend progressively. The Scout should use cheap deterministic filtering and lightweight research on many companies, then reserve expensive model/search work for a small number of high-potential candidates.

## Progressive Funnel

```text
Discovery: broad and cheap
        ↓
Deterministic eligibility
        ↓
Light research on eligible candidates
        ↓
Deep research on top candidates
        ↓
Opportunity analysis only when evidence is sufficient
        ↓
Validation and ranking
```

## Budget Object

Every ScoutRun receives a budget containing:

- maximum total currency cost;
- maximum search requests;
- maximum model tokens or provider spend where measurable;
- maximum deep-research company count;
- maximum elapsed runtime;
- maximum retries per provider/stage.

The budget is enforced by orchestration, not by prompt instruction.

## Initial Development Ceiling

Until measured provider economics are available:

- full development/benchmark run ceiling: €20 equivalent;
- deep research target: no more than 10 companies per normal run;
- final shortlist target: at most 3 primary opportunities.

These are safety limits. The production weekly budget must be reset from actual benchmark data before regular scheduled use.

## Cost Attribution

Track cost by:

- ScoutRun;
- Company;
- stage;
- provider;
- model;
- search/retrieval call;
- successful ResearchDossier;
- shortlisted AutomationOpportunity.

Key derived metrics:

- cost per eligible Company;
- cost per completed ResearchDossier;
- cost per valid AutomationOpportunity;
- cost per human-shortlisted opportunity.

The last metric matters most. Cheap generation of useless ideas is not efficiency.

## Caching

Cache/reuse when safe:

- unchanged SourceDocuments by content fingerprint and freshness window;
- normalized company identity;
- deterministic extraction from unchanged content;
- previous claims with explicit freshness status;
- stable official pages inside their refresh windows.

Do not cache:

- time-sensitive search results beyond their purpose;
- an old "current" company summary without source freshness checks;
- failed provider output as a successful canonical result.

## Scheduling

MVP cadence:

- one manual run supported from day one;
- weekly scheduled run after benchmark quality passes;
- no always-on crawler.

The user can inspect the configured scope and budget before enabling scheduled execution.

## Retry Policy

Retries are bounded and reason-specific:

- network timeout: retry with exponential backoff;
- rate limit: respect provider retry guidance and remaining run deadline;
- malformed AI schema: one constrained repair/retry;
- deterministic validation failure: do not blindly retry the same input;
- prohibited/blocked source: no retry designed to bypass the block.

## Run Degradation

A ScoutRun can finish as:

- `complete`;
- `partial_budget_exhausted`;
- `partial_source_degraded`;
- `failed_no_discovery`;
- `failed_no_research_capability`;
- `cancelled_by_user`.

Partial output is useful only when limitations are visible.

## Operational Diagnostics

The run-detail page should expose:

- stage timing;
- stage counts;
- source failures;
- provider errors;
- retry counts;
- schema-validation errors;
- budget consumption;
- quality-gate rejection reasons;
- cache hit ratio;
- number of user-useful opportunities after review.

## Model Strategy

Do not hardcode one frontier model for every stage.

Initial principle:

- deterministic code for structured gates;
- a cheaper capable model for extraction/classification where benchmark quality permits;
- a stronger reasoning model for opportunity synthesis and adversarial critique only when needed;
- evaluate model changes against the golden set before shipping.

The provider/model mix is an implementation configuration. The domain model remains provider-neutral.
