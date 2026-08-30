# Evidence and Confidence Policy

## Purpose

The most important trust rule in Startup Automation Scout is that plausible reasoning must never be displayed as verified company reality.

The Scout therefore stores and displays four epistemic categories:

1. **Verified**: directly supported by sufficient evidence.
2. **Inferred**: reasoned from evidence but not directly stated.
3. **Estimated**: a modelled numerical or qualitative estimate based on explicit assumptions.
4. **Unknown**: not established from available evidence.

## Claim Requirements

Every Claim must contain:

- normalized claim text;
- claim type;
- subject;
- confidence;
- evidence links;
- created timestamp;
- source freshness information;
- contradiction status;
- optional valid-from or valid-until date when time-sensitive.

## Verified Claim Rules

A Claim can be marked Verified when one of the following is true:

- a Tier 1 source states it directly and no stronger evidence contradicts it;
- two independent Tier 2 sources agree and no Tier 1 evidence contradicts it;
- a deterministic observation from a first-party public product surface establishes it directly.

Examples:

```text
VERIFIED
The company announced a €3M seed round on 2026-06-10.

Evidence:
- company announcement
- lead investor announcement
```

## Inferred Claim Rules

An Inferred Claim must include:

- the evidence that motivated the inference;
- the reasoning in compact human-readable form;
- at least one alternative explanation when material;
- a confidence level;
- what information would confirm or falsify it.

Example:

```text
INFERRED
Enterprise onboarding may require repeated document and integration handoffs.

Why:
- product documentation describes multiple ERP integrations
- implementation roles are actively hiring

Unknown:
- actual onboarding process
- current manual hours
```

## Estimated Claim Rules

The Scout must never invent precise labor or financial savings.

An estimate must separate:

- verified baseline inputs;
- assumed inputs;
- formula;
- range;
- confidence.

If there is no verified baseline, the output should describe the measurable outcome rather than fabricate a monetary value.

Good:

> Potential value would come from reducing manual classification and handoff time. Baseline hours are unknown and must be validated with the team.

Bad:

> This saves the company €36,000 per year.

## Unknown Rules

Unknown is a first-class result. The system should explicitly preserve unknowns such as:

- team size not established;
- workflow ownership not public;
- manual time unknown;
- private tools unknown;
- current automation level unknown.

Unknowns can become validation questions in an Opportunity Brief.

## Contradictions

If sources disagree:

1. retain both Evidence Items;
2. mark the Claim as disputed;
3. prefer stronger and fresher evidence only when justified;
4. do not silently discard the contradiction;
5. lower confidence where the disagreement matters.

## Confidence Scale

Confidence is categorical in the human-facing product:

- **High**: strong direct evidence, low material uncertainty.
- **Medium**: credible evidence with meaningful inference or freshness risk.
- **Low**: weak evidence, significant assumptions, or unresolved contradiction.

Internally a numerical value may support ranking, but the product must not imply scientific precision from an arbitrary decimal score.

## Opportunity Evidence Gate

An Automation Opportunity may reach the final shortlist only if:

1. at least one company-specific Verified Claim supports the context;
2. the Workflow Hypothesis cites its evidence and assumptions;
3. the proposed automation is not generic enough to apply unchanged to most companies;
4. the measurable outcome is named;
5. required private information is listed as a validation dependency rather than assumed;
6. unsupported financial claims are absent.

## Citation Behavior

Every human-facing factual paragraph in a Research Dossier or Opportunity Brief should expose the supporting source links close to the claim. The UI may collapse evidence for readability, but provenance must remain one interaction away.

## Review Feedback

Human Review Decisions can label a Claim or Opportunity as:

- useful;
- unsupported;
- too generic;
- stale;
- wrong company;
- already automated;
- impossible to validate publicly;
- worth investigating;
- worth prototyping.

These labels become evaluation data. They must not retroactively rewrite historical source evidence.
