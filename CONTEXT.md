# Domain Context

This file is a glossary only. Implementation decisions belong in the specification, architecture document, or ADRs.

## Startup Candidate

A company discovered or manually supplied to the Scout that has not yet passed the target-profile eligibility gate.

## Company

A normalized startup identity after duplicate resolution. A Company may be associated with many Source Documents, Claims, Workflow Hypotheses, and Automation Opportunities.

## Source Document

A retrievable public or explicitly authorized document used during research, such as a company website page, documentation page, funding announcement, job listing, public repository, changelog, or permitted third-party article.

## Evidence Item

A specific piece of information extracted from a Source Document that can support or contradict a Claim. An Evidence Item always retains provenance to its Source Document.

## Claim

A normalized statement about a Company, product, customer, event, or workflow. Every Claim has a claim type and an evidence relationship.

## Verified Claim

A Claim directly supported by sufficient evidence under the evidence policy.

## Inferred Claim

A Claim derived from evidence through reasoning, but not directly stated by a source. It must never be presented as a verified fact.

## Unknown

Information the Scout cannot establish from available evidence. Unknown is an acceptable research result and must not be filled by invention.

## Recent Signal

A time-bounded event suggesting that a Company may currently be changing or growing, such as funding, a launch, hiring activity, a major product release, a new market entry, or a significant public customer announcement.

## Workflow Hypothesis

A reasoned description of a repetitive or operational process that may exist inside or around a Company. It is a hypothesis until directly confirmed.

## Automation Opportunity

A proposed system that could improve a Workflow Hypothesis by reducing manual work, delay, errors, review burden, or operational friction. It includes evidence, assumptions, measurable outcomes, buildability, and confidence.

## Opportunity Brief

The human-facing artifact that explains one Automation Opportunity, its evidence, assumptions, expected value, implementation outline, uncertainty, and suggested next validation step.

## Scout Run

One bounded execution of the discovery, research, analysis, ranking, and reporting workflow with a configured geographic scope, time window, source set, and cost budget.

## Research Dossier

The structured research result for one Company. It contains Source Documents, Claims, confidence, Recent Signals, known unknowns, and enough context to evaluate Workflow Hypotheses.

## Person Profile

A public or explicitly authorized professional identity associated with a Company, including role context, public profile links, and provenance. A Person Profile is not a general personal profile and must not include sensitive-category inferences.

## Contact Point

A public or explicitly authorized professional contact channel associated with a Company or Person Profile. A Contact Point always records its source, freshness, confidence, and eligibility status. The Scout must never guess an email address from a naming pattern.

## Prospect Dossier

An optional company-level artifact that combines a Research Dossier and selected Automation Opportunities with researched Person Profiles, Contact Points, Outreach Angles, reviewed message drafts, open questions, and a source ledger. It is a preparation artifact, not proof that a person has consented to contact or that an outreach claim is true.

## Outreach Angle

An evidence-backed message thesis connecting a specific Automation Opportunity to a relevant Company or Person Profile. It is a relevance hypothesis and must not be presented as proof that the target person experiences the proposed pain.

## Outreach Sequence

A bounded set of draft-only email steps built from one Outreach Angle. Each step has a purpose, a single low-friction call to action, evidence references, and a human review state. An Outreach Sequence does not send messages or schedule contact.

## Hermes Handoff Bundle

A versioned Markdown and JSON export of a Prospect Dossier, including its source ledger, uncertainty labels, contact status, and draft state, prepared for inspection by another agent. The bundle is source material and is not authorization to send or perform external actions.

## Review Decision

A human judgment on a Company or Automation Opportunity, such as shortlist, reject, investigate, prototype, or archive. Review Decisions become feedback for evaluation but do not silently alter historical evidence.

## Generic Suggestion

An Automation Opportunity that could plausibly be proposed to almost any company without meaningful company-specific evidence. Generic Suggestions are considered product failures and should be rejected.
