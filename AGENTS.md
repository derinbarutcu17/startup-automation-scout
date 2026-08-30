# Startup Automation Scout Agent Handoff

## Current status

This repository contains a runnable MVP of Startup Automation Scout. It is a
single-owner, evidence-first research workbench for turning a public company
URL into a reviewable automation opportunity.

The implemented vertical slice is:

```text
company URL
  -> ScoutRun
  -> durable Postgres work queue
  -> identity and eligibility
  -> public-source research
  -> evidence and claim extraction
  -> Research Dossier
  -> Workflow Hypothesis
  -> Automation Opportunity
  -> deterministic quality gate
  -> rubric scorecard
  -> human review decision
```

The MVP is not production-ready. It has no authentication, no multi-user
permissions, no automatic outreach, and no 20-company human-reviewed golden
benchmark. The evaluation command is a deterministic fixture regression
harness and must not be described as that benchmark.

## Read first

For project intent and vocabulary, read these files in order:

1. `/Users/derin/Desktop/CODING/AGENTS.md`
2. `PRODUCT.md`
3. `CONTEXT.md`
4. `docs/PRODUCT_SPEC.md`
5. `docs/ARCHITECTURE.md`
6. `IMPLEMENTATION_PLAN.md`
7. `DESIGN.md`

Use the relevant ADRs in `docs/adr/` before changing a hard-to-reverse
architecture decision.

## Repository shape

- `app/`: Next.js App Router pages, layouts, loading and error boundaries.
- `src/ui/`: server-rendered dashboard components and small client forms.
- `src/application/`: run lifecycle, read models, server actions and staged
  orchestration.
- `src/domain/`: configuration, identity, eligibility, state transitions,
  quality gates, scoring and canonical types.
- `src/infrastructure/db/`: Drizzle schema, migrations and repositories.
- `src/infrastructure/queue/`: Postgres-backed leasing queue.
- `src/infrastructure/budget/`: run budget reservation and provider-call
  accounting.
- `src/providers/`: provider contracts plus fixture, Brave and
  OpenAI-compatible implementations.
- `src/worker/`: independently runnable worker and weekly scheduler.
- `tests/`: unit, integration, provider-contract, security and Playwright
  end-to-end checks.
- `design-system/startup-automation-scout/MASTER.md`: generated UI-UX Pro Max
  design-system reference used while shaping the interface.

## What is implemented

### Web product

The dashboard routes are:

- `/scout-runs`: control room, run creation, attention queue and run history.
- `/scout-runs/[runId]`: live pipeline, work ledger, company lanes and report
  link.
- `/companies`: company queue with eligibility and research state.
- `/companies/[companyId]`: dossier, verified and inferred claims, signals,
  unknowns and sources.
- `/opportunities`: passing and held opportunities.
- `/opportunities/[opportunityId]`: evidence trail, workflow hypothesis,
  deterministic versus AI steps, score breakdown and review form.
- `/reports/[runId]`: concise weekly report for a completed or partial run.
- `/reviews`: append-only review history.
- `/settings`: weekly schedule, provider boundary and operating guardrails.

The visual system is intentionally flat and evidence-led. The dark navy rail,
paper surfaces, cobalt action color, citron active marker, Fira Sans body type,
Fira Code measurement labels and ruled dividers are documented in `DESIGN.md`.
Keep source citations beside the claim they support. Keep Verified, Inferred,
Estimated and Unknown labels visible and never communicate epistemic state by
color alone.

### Run and worker flow

`createScoutRun` stores a validated `RunConfiguration` and optional manual
seeds. `startScoutRun` creates company-scoped work items and advances the run
into the staged pipeline. `src/application/orchestration.ts` processes these
stages:

```text
identity -> eligibility -> research -> evidence
         -> workflow_hypothesis -> opportunity
         -> quality_gate -> scoring
```

The worker claims jobs with Postgres leases, recovers expired leases, retries
retryable provider failures, records terminal failures, reconciles run status,
and isolates a failed company from other work. Domain writes are idempotent or
uniquely constrained where duplicate delivery matters.

The scheduler uses the same run and worker path as manual runs. It stores a
unique schedule occurrence before creating a run, so repeated scheduler ticks
cannot create the same weekly occurrence twice.

### Evidence and safety

- Public-source retrieval goes through the safe HTTP provider, which rejects
  loopback, private, link-local and unsafe addresses.
- Search output is treated as discovery material. Original retrieved sources
  support persisted evidence.
- Verified claims require evidence. Inferred claims require reasoning.
- Source documents retain retrieval status, source tier, timestamp and content
  fingerprint. Re-fetches create versions instead of overwriting history.
- Quality gates reject generic proposals, unsupported precise savings,
  unsupported verified facts, inaccessible private access and prohibited
  platform paths.
- Scores are deterministic weighted rubrics with stored dimension rationales.
- Provider calls reserve run budget before invocation and write diagnostics.
- No worker provider contract exposes messaging or outreach capabilities.

## Local setup

Requirements: Node 22, pnpm 11.10, and PostgreSQL 17 or a compatible local
PostgreSQL instance.

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Run the worker in a second terminal:

```bash
pnpm worker
```

For a short local fixture loop, set `RUN_INLINE_WORKER=true` in `.env`. The
web action then drains the worker after creating a run. The safer default is
`false`, with the web and worker running as separate processes.

The fixture path uses `SEARCH_PROVIDER=fixture` and `MODEL_PROVIDER=fixture`.
Use `https://berlinflow.example` in the new-run form to exercise the complete
deterministic sample. Live search requires `SEARCH_PROVIDER=brave` and
`SEARCH_API_KEY`. Live structured-model calls require
`MODEL_PROVIDER=openai_compatible` and `MODEL_API_KEY`.

For the weekly scheduler, configure the persisted schedule in `/settings`,
set `SCHEDULER_ENABLED=true`, then run:

```bash
pnpm scheduler:once
```

## Verification commands

Run focused checks while editing:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:providers
pnpm test:security
pnpm evaluate
pnpm run audit
pnpm build
```

`pnpm test:integration` resets only a database whose name contains `test`.
It drops and recreates the public and Drizzle schemas before applying
migrations. Never point `TEST_DATABASE_URL` or `DATABASE_URL` at a valuable
non-test database for this command.

The full gate is:

```bash
pnpm verify
```

The browser suite builds the app, resets the test database, starts the web and
worker processes, and runs desktop and mobile Playwright checks:

```bash
pnpm e2e
```

## Change rules

- Preserve the separation between Verified, Inferred, Estimated and Unknown.
- Keep the run state machine and budget enforcement deterministic.
- Keep provider-specific fields at the provider boundary. Do not leak Brave,
  OpenAI or fixture concepts into canonical domain types.
- Keep private access as an explicit requirement or unknown. Never infer that
  a company grants access to internal systems.
- Do not add email, LinkedIn, CRM, publishing or other external-action tools
  without a new product decision and explicit user authorization.
- Do not bypass the safe retrieval provider for convenience.
- Add a focused test for a changed invariant. For gates, validators and
  scanners, prove both an allowed case and a safely rejected case.
- Update `DESIGN.md` when visual tokens, component states or layout grammar
  change. Keep the interface evidence-led and avoid generic card dashboards.
- Do not claim the 20-company benchmark is complete until a human-reviewed
  fixture set and its threshold report exist.

## Known boundaries

- The current user-facing intake is manual URL or domain entry. CSV ingestion
  exists in the application service, but there is no CSV upload screen.
- The fixture provider proves the pipeline with one deterministic company. It
  is not a measure of live-source coverage or ranking quality.
- Reports are compiled from the current read model rather than persisted as a
  separate report artifact.
- Authentication, multi-user permissions, production deployment secrets and
  live-provider operations remain deployment work.
