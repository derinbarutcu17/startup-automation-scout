# Scoring and Ranking

## Principle

Scores help prioritize work. They are not measurements of company quality, startup success, or guaranteed business value. Every score must be decomposable into named dimensions and supporting evidence.

Hard gates run before weighted scoring.

## Target Profile

Initial target profile:

- Germany, with Berlin prioritized;
- early-stage, roughly pre-seed through Series A when stage can be established;
- usually 3 to 100 employees when reliable data exists, but unknown team size is not automatically disqualifying;
- digital product or digitally intensive operations;
- recent activity or another reason the company is worth looking at now;
- sufficient public evidence for credible analysis;
- plausible workflow where a small automation could create measurable value.

The target profile is configuration, not domain truth.

## Company Hard Gates

A Company cannot enter deep research when any of these are true:

- clearly outside the configured geography;
- clearly inactive/closed;
- no usable public or authorized source can be found;
- company identity cannot be resolved with acceptable confidence;
- automation work is obviously irrelevant to the business being targeted;
- source access would require bypassing platform restrictions.

## Company Priority Score

Total: 100 points.

| Dimension | Weight | Question |
| --- | ---: | --- |
| Recent signal | 20 | Is there a current reason to investigate now? |
| Stage fit | 10 | Is the company likely small enough for accessible workflows and large enough for operational pain? |
| Evidence density | 15 | Is there enough strong public evidence to reason credibly? |
| Workflow visibility | 20 | Can we see product, customer, integration, hiring, or process signals that suggest concrete workflows? |
| Automation leverage | 20 | Is there plausible repeated work where automation could reduce meaningful friction? |
| Personal/career relevance | 10 | Would solving this demonstrate product, design, or AI automation ability relevant to the user's goals? |
| Access plausibility | 5 | Could a prototype or conversation realistically validate the hypothesis without privileged enterprise access? |

### Dimension scale

Each dimension is scored on a fixed 0 to 4 ordinal rubric and normalized to its weight.

- 0: no support or actively negative.
- 1: weak.
- 2: plausible/mixed.
- 3: strong.
- 4: unusually strong.

Each non-zero dimension requires a short explanation and evidence or a clearly labeled inference.

## Opportunity Hard Gates

An AutomationOpportunity cannot be shortlisted if:

- it has no company-specific supporting evidence;
- it requires a private fact to be true but presents that fact as known;
- it contains fabricated labor or financial numbers;
- it is a Generic Suggestion;
- it has no measurable outcome;
- it depends on access the user clearly cannot obtain even for a prototype;
- it primarily solves a problem the company's existing product already solves internally or externally, unless the distinction is explicit;
- it violates a platform's access restrictions.

## Opportunity Score

Total: 100 points.

| Dimension | Weight | Question |
| --- | ---: | --- |
| Evidence strength | 20 | How well does company-specific evidence support the workflow hypothesis? |
| Pain plausibility | 15 | Is there a credible reason this workflow creates repeated friction, delay, review, or errors? |
| Automation leverage | 20 | Can a small system materially reduce that friction? |
| Measurability | 15 | Can success be measured with an observable before/after metric? |
| Buildability | 15 | Can one builder create a useful prototype with realistic access and scope? |
| Differentiation | 5 | Is this more specific than a generic automation suggestion? |
| Portfolio/career signal | 10 | Would the project demonstrate useful product, design, automation, or AI engineering ability? |

## Genericness Check

Before scoring, ask:

> If the company name and evidence were removed, could this exact proposal be sent to 50 unrelated startups with almost no change?

If yes, reject or force another research pass.

Common Generic Suggestions:

- generic customer-support chatbot;
- generic lead-generation agent;
- generic meeting summarizer;
- generic CRM enrichment;
- generic social-post generator;
- generic internal knowledge bot.

These can still become valid opportunities if the evidence identifies a specific workflow, integration, failure mode, or measurable company-specific outcome.

## Ranking Rules

1. Apply hard gates.
2. Score each surviving dimension using the versioned rubric.
3. Record evidence and rationale per dimension.
4. Penalize low-confidence opportunities by ranking confidence separately, not by hiding uncertainty inside the score.
5. Present total score plus confidence, not total score alone.
6. Prefer a lower-scoring high-confidence opportunity over a slightly higher-scoring low-confidence one when the difference is within a configurable uncertainty band.
7. Never present the score as an objective probability of success.

## Rubric Versioning

Every score stores `rubric_version`. When the rubric changes, historical scores remain reproducible. Re-scoring can occur explicitly, but the previous version is retained.

Initial version: `v0.1-prebuild`.
