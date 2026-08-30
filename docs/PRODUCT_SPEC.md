# Product Specification

## Problem Statement

Promising early-stage startups are easy to discover in bulk but difficult to evaluate deeply. Public information is fragmented across company sites, funding announcements, product launches, documentation, job listings, portfolios, changelogs, repositories, and industry coverage. Manually turning those signals into a credible hypothesis about an expensive or repetitive company workflow takes substantial research time.

Generic AI lead-generation systems solve the wrong problem. They optimize for contact volume and message generation rather than for whether a real, buildable, high-value automation opportunity exists.

The user needs a repeatable way to reduce a large startup universe to a very small set of companies where there is enough evidence to justify deeper investigation or a prototype.

## Solution

Startup Automation Scout performs a staged research workflow. It discovers or ingests startup candidates, applies deterministic eligibility gates, collects attributable public evidence, constructs a Research Dossier, generates Workflow Hypotheses, proposes Automation Opportunities, challenges those opportunities for genericness and unsupported assumptions, scores the surviving opportunities using a fixed rubric, and presents the strongest results for human review.

The product never treats internal company operations as known merely because an AI model considers them plausible. It explicitly labels verified facts, inferences, estimates, and unknowns.

## Primary User

The initial primary user is a product designer and AI-assisted builder in Berlin who wants to identify real startup problems worth solving, develop portfolio-quality automation systems, and create a potential freelance or startup-conversation pipeline.

## Core User Journey

```text
Start weekly Scout Run
        ↓
Review newly discovered candidates
        ↓
Inspect eligible-company shortlist
        ↓
Open a Research Dossier
        ↓
Compare Automation Opportunities
        ↓
Inspect supporting evidence and uncertainty
        ↓
Choose: reject / investigate / prototype / archive
```

## User Stories

1. As the user, I want to discover newly active Berlin and Germany startups so that I do not manually monitor many startup websites.
2. As the user, I want to add a company URL manually so that interesting companies outside automated sources can enter the same workflow.
3. As the user, I want duplicate company records merged so that multiple articles about the same company do not create repeated work.
4. As the user, I want candidates filtered by geography, stage, recency, evidence availability, and automation fit so that deep research is spent only on plausible targets.
5. As the user, I want to see why a company passed or failed the eligibility gate so that filtering is inspectable.
6. As the user, I want research to prioritize company-owned and primary sources so that recommendations are grounded in strong evidence.
7. As the user, I want every factual statement to link back to evidence so that I can verify it quickly.
8. As the user, I want inferred operational claims clearly marked as inferred so that I do not accidentally repeat speculation as fact.
9. As the user, I want the Scout to say when something is unknown so that missing data is not hallucinated.
10. As the user, I want the Scout to identify recent signals such as funding, launching, hiring, or major product changes so that I focus on companies likely to be experiencing operational change.
11. As the user, I want the Scout to hypothesize likely workflows from company-specific evidence so that automation ideas are tied to actual context.
12. As the user, I want generic automation ideas rejected so that the shortlist is not filled with interchangeable chatbot or CRM suggestions.
13. As the user, I want each opportunity to state what must be true for the idea to be valuable so that I know what to validate before building.
14. As the user, I want each opportunity to propose a measurable business outcome so that success can eventually be tested.
15. As the user, I want buildability scored separately from business value so that a great problem with impossible access does not appear as an easy project.
16. As the user, I want to compare opportunities across companies using the same rubric so that ranking is consistent.
17. As the user, I want to inspect the evidence behind every score so that the score is not an opaque AI number.
18. As the user, I want research spending capped per run so that an agent cannot consume an unbounded budget.
19. As the user, I want cheap filtering to happen before expensive analysis so that the system spends money progressively.
20. As the user, I want failed research for one company to be isolated so that one broken source does not abort the whole weekly run.
21. As the user, I want the Scout to remember previous company research so that later runs can focus on changed information.
22. As the user, I want stale evidence timestamped so that old funding or hiring information is not presented as current.
23. As the user, I want to see what changed since a company was last analyzed so that repeated research has a reason.
24. As the user, I want to reject an opportunity and record why so that the system can be evaluated against my real judgment.
25. As the user, I want to shortlist a company for investigation without contacting it so that research and outreach remain separate actions.
26. As the user, I want outreach to require an explicit later approval so that the Scout never messages companies autonomously.
27. As the user, I want to export or copy an Opportunity Brief so that I can use it when preparing a prototype or conversation.
28. As the user, I want the Scout to prefer deterministic automation when an LLM adds no value so that proposed systems are economically sensible.
29. As the user, I want source-access restrictions respected so that the project does not depend on prohibited scraping.
30. As the user, I want the system to be evaluated on a human-reviewed company set before I trust its ranking so that a polished demo is not mistaken for quality.

## MVP Scope

The MVP includes:

- automated or manual company discovery from permitted sources;
- Berlin and Germany targeting;
- candidate normalization and duplicate resolution;
- deterministic eligibility gating;
- public-source research;
- Source Document storage with timestamps and content fingerprints;
- evidence extraction;
- verified, inferred, and unknown claim handling;
- Recent Signal extraction;
- Workflow Hypothesis generation;
- Automation Opportunity generation;
- genericness and evidence-strength checks;
- deterministic rubric-based scoring;
- cost-budget enforcement;
- company and opportunity review UI;
- weekly report generation;
- human Review Decisions;
- research history and freshness tracking.

## Out of Scope for MVP

- automated cold email, LinkedIn messaging, or any other external outreach;
- autonomous prototype generation;
- connecting to a target company's private systems;
- buying data or subscriptions without explicit approval;
- claiming precise internal labor hours or financial savings without a verified baseline;
- legal, compliance, security, or investment advice;
- automated Product Hunt commercial API usage without permission compatible with the intended use;
- mass scraping of platforms that prohibit or technically restrict it;
- CRM replacement;
- general-purpose startup intelligence unrelated to automation opportunities;
- multi-user collaboration, billing, or enterprise permissions.

## Acceptance Criteria

The MVP is acceptable only when all of the following are true:

1. A Scout Run can complete even if an individual source or company fails.
2. Every shortlisted Company has at least two usable Source Documents, with at least one strong source where available.
3. Every factual statement displayed in an Opportunity Brief can be traced to one or more Evidence Items.
4. Inferred Claims are visibly and structurally distinct from Verified Claims.
5. Unknown data is represented as unknown rather than inferred by default.
6. Duplicate Company candidates from multiple sources can be merged without losing provenance.
7. Every Automation Opportunity contains evidence, assumptions, measurable outcome, buildability assessment, confidence, and next validation step.
8. Generic Suggestions are rejected by a defined check before final ranking.
9. The ranking score can be decomposed into its rubric dimensions and evidence basis.
10. The run stops or degrades gracefully when its configured spending ceiling is reached.
11. Historical research is retained with timestamps so later runs can distinguish new information from stale information.
12. The user must explicitly choose any action beyond research and internal review.
13. The evaluation benchmark meets the thresholds defined in `EVALUATION.md` before the project is described as reliable.
