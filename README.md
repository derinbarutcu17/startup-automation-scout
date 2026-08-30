# Startup Automation Scout

Status: **runnable MVP, fixture providers enabled by default**

Startup Automation Scout is an evidence-first research workbench for finding
promising early-stage startups, understanding their public operating signals,
identifying plausible high-value workflows that could be automated, and
turning the strongest opportunities into briefs for human review.

The product is intentionally not a generic lead generator and not an
autonomous cold-email bot. Its job is to answer one question well:

> Which startup is worth investigating for an automation project, what workflow is plausibly painful, what evidence supports that hypothesis, and what small system could be built to help?

## Primary user

The initial user is Derin, using the Scout to find Berlin and Germany startup
opportunities for portfolio work, product conversations, freelance work, and
hands-on AI automation projects.

## Core weekly outcome

A useful weekly run should:

1. discover or ingest a broad set of startup candidates;
2. filter them to companies that fit the target profile;
3. deeply research a small subset using public evidence;
4. generate workflow hypotheses and automation opportunities;
5. reject weak or generic ideas;
6. rank the strongest opportunities;
7. return a short, cited shortlist for human review.

The intended funnel is approximately:

```text
50+ discovered companies
        ↓
15 eligible candidates
        ↓
5 deeply researched companies
        ↓
3 credible automation opportunities
        ↓
1 company worth prototyping for
```

These numbers are initial operating targets, not hard product truths. The
current fixture evaluation does not validate the 20-company human-reviewed
golden benchmark described in `docs/EVALUATION.md`.

## Run locally

Requirements: Node 22, pnpm 11.10, and PostgreSQL 17 or compatible.

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Run `pnpm worker` in a second terminal. For a local fixture-only shortcut, set
`RUN_INLINE_WORKER=true` in `.env` and use `https://berlinflow.example` in the
new-run form.

The default providers are deterministic fixtures. Set
`SEARCH_PROVIDER=brave` with `SEARCH_API_KEY` for live search, or
`MODEL_PROVIDER=openai_compatible` with `MODEL_API_KEY` for live structured
model calls. Read [AGENTS.md](AGENTS.md) for the full operational handoff.

## Verification

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
pnpm e2e
```

`pnpm verify` runs the core checks and build in one command. Integration and
browser checks use a guarded test database whose name must contain `test`.

## Product boundary

The current vertical slice is:

```text
public company URL -> durable ScoutRun -> research dossier
  -> workflow hypothesis -> quality-gated opportunity
  -> deterministic scorecard -> human review
```

The MVP stores source versions, evidence, epistemic claim types, unknowns,
signals, budget diagnostics, score rationales and append-only review decisions.
It does not send outreach, access private company systems, or generate a
20-company reliability claim. CSV ingestion exists as an application service;
the user-facing intake is currently a URL or domain form.

## Key product principles

- Evidence before inference.
- Public or explicitly authorized data only.
- Search results help locate evidence, but original sources support claims.
- Facts, inferences, estimates, and unknowns are stored separately.
- Ordinary deterministic automation is preferred when AI is unnecessary.
- Human approval is required before outreach, publishing claims, or spending above configured limits.
- The system optimizes for useful opportunities, not for generating the largest number of leads.
- A small number of deeply researched companies is more valuable than hundreds of shallow AI-generated suggestions.

## Documentation map

- [CONTEXT.md](CONTEXT.md): canonical domain vocabulary.
- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md): problem, user stories, scope, acceptance criteria.
- [docs/SOURCE_STRATEGY.md](docs/SOURCE_STRATEGY.md): discovery and evidence sources, access constraints, freshness.
- [docs/EVIDENCE_POLICY.md](docs/EVIDENCE_POLICY.md): fact, inference, confidence, and citation rules.
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md): domain entities and relationships.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system shape, modules, seams, state machine.
- [docs/SCORING.md](docs/SCORING.md): startup and opportunity ranking rules.
- [docs/EVALUATION.md](docs/EVALUATION.md): benchmark and quality gates.
- [docs/FAILURE_MODES.md](docs/FAILURE_MODES.md): known failure cases and expected handling.
- [docs/UX_SPEC.md](docs/UX_SPEC.md): user flow and product surfaces.
- [docs/COST_AND_OPERATIONS.md](docs/COST_AND_OPERATIONS.md): run budgets, scheduling, observability.
- [docs/PRIVACY_LEGAL_PLATFORM.md](docs/PRIVACY_LEGAL_PLATFORM.md): platform, privacy, and outreach constraints.
- [docs/adr](docs/adr): hard-to-reverse architecture decisions.
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): build sequence,
  verification gates, and definition of done.
- [AGENTS.md](AGENTS.md): current implementation handoff and agent guardrails.
- [PRODUCT.md](PRODUCT.md): product context used for implementation decisions.
- [DESIGN.md](DESIGN.md): current visual design system and component rules.

## Project boundary

The first release ends at a human-reviewed opportunity shortlist. Automatic cold outreach, autonomous client contact, automatic prototype generation, private company-system access, and legal/compliance determinations are outside the MVP.
