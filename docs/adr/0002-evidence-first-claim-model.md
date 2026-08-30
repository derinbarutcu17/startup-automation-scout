# ADR 0002: Make evidence and epistemic status first-class data

Status: Accepted

Date: 2026-08-29

## Context

The Scout reasons about companies whose internal operations are mostly private. Public evidence can support useful hypotheses, but plausible reasoning is not the same as verified company reality.

If research were stored only as generated prose, the product could not reliably distinguish source-backed facts from model inference, retain contradictions, show freshness, or prove why an opportunity was shortlisted.

Trust in this product depends more on provenance and uncertainty than on fluent summaries.

## Decision

Store research as structured, related entities rather than as one generated document:

```text
SourceDocument
  -> EvidenceItem
  -> ClaimEvidence
  -> Claim
  -> ResearchDossier
  -> WorkflowHypothesis
  -> AutomationOpportunity
```

Every Claim has one of four human-facing epistemic categories:

- Verified
- Inferred
- Estimated
- Unknown

Verified Claims require supporting EvidenceItems. Inferred Claims retain their evidence, reasoning, assumptions, and confirmation path. Estimated Claims separate verified inputs from assumptions and may not invent precise savings without a baseline. Unknown is stored rather than filled by speculation.

Contradictory evidence is retained and surfaced. Source versions are preserved by fingerprint and retrieval time. Human ReviewDecisions append history rather than rewriting prior evidence.

## Consequences

Positive consequences:

- every displayed factual claim can be traced to evidence;
- the UI can visibly separate fact from inference;
- stale or contradictory evidence can be surfaced explicitly;
- quality gates can be deterministic about missing citations and unsupported numbers;
- research can be refreshed incrementally rather than regenerated as an opaque blob;
- evaluation can measure factual support and inference-label accuracy.

Costs and tradeoffs:

- the relational model is more complex than storing one model response;
- extraction must produce bounded evidence and normalized claims;
- presentation code must assemble human-readable dossiers from structured records;
- migrations require care because provenance relationships are durable product data.

The additional complexity is required because provenance is a product feature, not an implementation detail.

## Rejected alternatives

### Store only generated reports

Rejected because provenance, contradictions, and historical refresh behavior become fragile and difficult to query.

### Store a confidence number only

Rejected because a numerical confidence score does not explain whether a statement is directly sourced, inferred, estimated, or unknown. It would imply more precision than the system can justify.

### Treat search snippets as evidence

Rejected because snippets are discovery aids, can be truncated or stale, and are weaker than the original permitted source whenever that source can be retrieved.

## Revisit when

The categories may evolve if evaluation reveals a repeated ambiguity, but any replacement must preserve source provenance, explicit uncertainty, contradiction handling, and the ability to audit user-facing factual claims.
