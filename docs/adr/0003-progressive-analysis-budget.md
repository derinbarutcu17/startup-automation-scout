# ADR 0003: Enforce progressive analysis with hard run budgets

Status: Accepted

Date: 2026-08-29

## Context

The Scout can potentially discover dozens or hundreds of companies, while deep research and model reasoning can be materially more expensive than deterministic screening. Running the strongest model and deepest research on every candidate would make operating cost unpredictable and would optimize for activity rather than useful opportunities.

The product goal is a very small number of credible opportunities. The weekly funnel is intentionally broad at discovery and narrow at deep research.

## Decision

Every ScoutRun receives a hard budget object enforced by orchestration. The budget includes, at minimum:

- maximum total currency cost;
- maximum search requests;
- maximum model spend or model tokens where measurable;
- maximum deeply researched companies;
- maximum elapsed runtime;
- maximum retries per stage/provider.

Work proceeds progressively:

```text
broad cheap discovery
  -> deterministic eligibility
  -> light evidence gathering
  -> deep research on top candidates
  -> opportunity analysis only with sufficient evidence
  -> quality gate
  -> final ranking
```

The initial full development benchmark ceiling is €20 equivalent until real provider economics are measured. A normal run should deeply research no more than 10 companies by default and present no more than 3 primary opportunities.

Budget exhaustion produces an explicit partial-run status rather than hidden truncation.

## Consequences

Positive consequences:

- one malformed or difficult company cannot consume an unbounded run budget;
- cost per useful opportunity can be measured;
- cheap filtering protects expensive reasoning capacity;
- provider/model choices can be optimized empirically by stage;
- partial results remain usable because budget exhaustion is visible.

Costs and tradeoffs:

- some promising companies may be deferred when a run reaches its ceiling;
- budget accounting must be implemented across provider boundaries;
- scheduling and retries require explicit orchestration rules;
- ranking before deep research needs enough lightweight evidence to avoid obvious false negatives.

These tradeoffs are acceptable because the product must demonstrate economic discipline as part of its value proposition.

## Rejected alternatives

### Unlimited best-model analysis

Rejected because cost would scale with candidate volume and would not prove that the system is actually efficient.

### Prompt-only spending instructions

Rejected because a prompt cannot reliably enforce provider calls, retries, search usage, or cumulative run cost. Budgets must be deterministic application state.

### Fixed number of model calls without cost attribution

Rejected because different providers, models, and stages have different economics. The system should attribute actual usage where available.

## Revisit when

Reset the operating defaults after benchmark and real weekly-run data establish cost per ResearchDossier, valid AutomationOpportunity, and human-shortlisted opportunity. The principle of deterministic hard budgets remains unless the product goal changes.
