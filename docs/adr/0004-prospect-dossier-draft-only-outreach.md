# ADR 0004: Prospect Dossier and draft-only outreach boundary

Status: Accepted
Date: 2026-08-30

## Context

The MVP at `src/infrastructure/db/schema.ts:1-508` and `src/application/orchestration.ts:123-494` covers `company URL -> Research Dossier -> Opportunity -> ReviewDecision` with evidence-first rules (ADR 0001-0003). The approved extension at `docs/OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md:1-707` requests bounded professional person research, company-specific cold-email angles, Hermes handoff bundles, and optional Gmail draft creation without automatic sending.

This ADR locks the boundary between research, export, create-draft, and send. It must be written before any implementation code (Phase 0 gate, plan sec 10).

## Decision

### Separate dossier
Keep `Research Dossier` as the company evidence artifact (`CONTEXT.md:58-60`). Add a separate `Prospect Dossier` (`CONTEXT.md:69-72`) that compiles research + selected opportunity + person research + angles + drafts + unknowns + approval provenance. Do not mix person facts into company `claims`.

### Person and contact model
- `person_profiles` — public professional identity only (name, role, profile URL), with `source discovery method`, `first_seen`, `last_verified`, `uncertainty notes` (`OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md:124-133`).
- `person_claims` — dedicated table mirroring company claim policy fields (claim text/type, confidence, evidence links, reasoning, alternative explanation, confirmation question, freshness) — avoids unsafe polymorphic FK on `claims` (`OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md:139-149`).
- `contact_points` — channel `public professional email | public profile URL | company form | other`, with `normalized_value`, `status in (candidate, source_verified, user_confirmed, rejected, stale, suppressed)`, `confidence, first_seen, last_checked, discovery_method`. No `inferred` status. Encrypted at rest, never logged or in URLs/diagnostics (`OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md:152-163`).
- Provenance via M2M links to `SourceDocument` + `EvidenceItem` as the foundation (`OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md:137-138`).

### Angles and drafts
- `outreach_angles` — evidence-backed hypothesis (thesis + verified signal + workflow hypothesis + relevance + value hypothesis + CTA) with refs to claims/person-claims/evidence plus assumptions and alternates (`OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md:166-182`).
- `outreach_sequences` + `message_drafts` — max 3 steps (observation -> useful follow-up -> close-the-loop), stored with evidence refs, personalization notes, state `generated|reviewed|approved|rejected|withdrawn|gmail_draft_created`, `content_fingerprint` (`plan sec 5.5`). No send status or scheduling in v1.

### Approvals and suppression
- `outreach_approvals` (append-only) — exact `target_batch + fingerprint + approver + timestamp + expiry + result` — distinct from `ReviewDecision` (`schema.ts:397-409`) which is research judgment, not permission for external side effect (`plan sec 4.7`).
- `suppression_records` — company domains / contact values / people / manual entries; checked before any draft creation (`plan sec 4.7`).
- State machine `not_started -> person_research_requested -> person_research_ready -> angle_review -> drafts_ready -> approved_for_gmail_draft -> gmail_draft_created` plus `suppressed/stale/failed`. Reject `person_research_ready -> drafts_ready` without angle + target + evidence + review; `gmail_draft_created` is not sending (`plan sec 3`).

### Modules
Deep modules with narrow interfaces, per `docs/ARCHITECTURE.md:36-178`:
- `researchPeople(company, dossier, budget) -> PersonResearchResult` (max 3, bounded cost, provenance, no-guessing)
- `findProfessionalCandidates(company, roleQuestions) -> PersonCandidate[]` seam — adapters: search+permitted retrieval, manual input, optional licensed enrichment (verified terms). No LinkedIn scraper (`plan sec 5.2`).
- `buildProspectDossier(companyId, opportunityId)`, `generateOutreachAngles`, `composeDraftSequence`, `exportProspectDossier -> HermesHandoffBundle (MD+JSON prospect-dossier.v1)`, `createGmailDrafts(approvedBatch)`.

### Gmail draft-only
- Narrow adapter exposing only draft creation; no `send/schedule/searchMailbox/readMailbox` (`plan sec 5.7`).
- 5-step gate: target reviewed, sequence passes validation, owner approves exact fingerprint, recheck suppression+freshness, explicit external-action confirm.
- Requires owner-auth boundary before OAuth usable; tokens not in `settings` jsonb (`schema.ts:491-495`). Idempotency key prevents duplicates; result reconciliation visible (`plan sec 5.7`, `IMPLEMENTATION_PLAN.md:191-197`).

### Costs and observability
Separate `prospect_jobs` queue (distinct from `work_items:411-441` company stages) with `people_research | angle_generation | draft_generation | handoff_export` + budget `max_people / max_searches / max_sources / max_model_spend / max_runtime` (`plan sec 6`, `sec 12`). Inline worker remains opt-in (`env.ts:38-41`). Logs carry `runId/companyId/workItemId/stage/attempt` via pino (`src/infrastructure/observability/logger.ts`).

### Prohibited in this extension
LinkedIn scraping/messaging, guessed emails, harvesting personal emails/phones, sensitive inferences, bulk discovery, sending/scheduling/tracking/CRM mutation, mailbox reading (`plan sec 2`).

## Consequences
Positive: keeps evidence separation (company vs person), prevents spam and PII over-collection, preserves human review, enables Hermes handoff without external side effects, keeps modules testable via deterministic gates.

Costs: additional relational tables, encryption handling, explicit state machine and approval plumbing, provider seam overhead.

## Deferred
Auto-send, follow-up scheduling, inbox read/reply classification, LinkedIn automation, CRM sync, bulk campaign management — each needs new product decision, platform review, and separate approval design (`plan sec 14`).

## Revisit when
Source/platform terms change, enrichment provider added, or a product decision expands beyond draft-only. Any expansion requires new ADR + user authorization per `AGENTS.md:199-221`.
