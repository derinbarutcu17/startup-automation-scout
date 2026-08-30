# ADR 0001: Use a staged pipeline, not one open-ended agent

Status: Accepted

Date: 2026-08-29

## Context

Startup Automation Scout must discover companies, resolve identities, screen eligibility, research public evidence, form workflow hypotheses, generate automation opportunities, reject weak ideas, rank the survivors, and present a small shortlist for human review.

These stages have different trust, cost, and test requirements. Many of them are deterministic. A single open-ended agent with broad tools would make it difficult to know why a result was produced, where budget was spent, whether evidence requirements were respected, and how to regression-test a change.

The product also has explicit safety and platform constraints. It must not bypass source restrictions, treat retrieved web text as instructions, invent company facts, or perform outreach in the MVP.

## Decision

Implement the Scout as a staged orchestrated pipeline with stable domain-level module interfaces:

```text
Discovery
  -> Identity Resolution
  -> Eligibility
  -> Research
  -> Opportunity Analysis
  -> Quality Gate
  -> Ranking
  -> Reporting
  -> Human Review
```

The orchestration layer owns state transitions, budgets, retries, failure isolation, and stage sequencing. It does not own research judgment.

AI is used only inside bounded stages where semantic interpretation or synthesis is useful. Deterministic code owns state, arithmetic, validation, freshness, budgets, deduplication rules, and other logic that does not need a model.

## Consequences

Positive consequences:

- each stage has an inspectable input and output;
- expensive work can happen only after cheap gates pass;
- model changes can be benchmarked without rewriting the whole system;
- one company failure can be isolated from the rest of a ScoutRun;
- evidence and quality rules can reject output before ranking;
- provider integrations remain implementation details rather than domain concepts;
- the system is easier to reason about for a solo builder.

Costs and tradeoffs:

- orchestration and persistence require more explicit state than a free-form agent loop;
- some workflows may require passing structured context through several modules;
- adding a new stage requires a deliberate state transition and test seam.

These costs are acceptable because traceability, cost control, and reproducibility are core product requirements.

## Rejected alternatives

### One autonomous research agent

Rejected because it mixes retrieval, reasoning, budgeting, ranking, and presentation into one opaque execution path. It would be difficult to test trust guarantees and to prevent unnecessary model usage.

### Microservice-per-stage architecture

Rejected for the first release. The project is a solo TypeScript product and does not need distributed deployment, network boundaries, or independent scaling between stages. A modular monolith with a separate worker process is sufficient.

## Revisit when

Revisit this ADR only if measured production behavior proves that a stage needs independent scaling, isolation, or ownership, or if a benchmark shows that a more dynamic planning loop produces materially better results without weakening evidence, cost, and test guarantees.
