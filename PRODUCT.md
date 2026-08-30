# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, and a separate Node.js worker, as established by the repository implementation plan.

## Users

The primary user is Derin, a Berlin-based visual and product designer who uses the Scout during weekly opportunity research for portfolio work, product conversations, freelance work, and hands-on AI automation projects.

## Product Purpose

Startup Automation Scout researches early-stage startup opportunities from public or explicitly authorized evidence. It narrows a broad candidate set to a small, human-reviewable shortlist that explains which workflow may be worth automating, why the hypothesis is plausible, what remains unknown, and how to validate it next.

Success is a credible opportunity brief or an explicit “not enough evidence” result. Generic lead generation and autonomous outreach are not success states.

## Positioning

The Scout keeps facts, inferences, estimates, and unknowns separate while connecting every user-facing factual claim to source evidence. It turns bounded public research into falsifiable workflow hypotheses and measurable automation experiments, rather than generating generic sales leads or sending outreach.

## Operating Context

The owner runs bounded Scout Runs over a geographic scope, source configuration, freshness policy, and cost budget. A run can start from a manually entered company URL, persist research in PostgreSQL, process company stages through a durable worker queue, and end in a Weekly Report or partial/degraded result for human review.

## Capabilities and Constraints

- The MVP supports company identity resolution, eligibility screening, safe public-source retrieval, evidence and claim persistence, research dossiers, workflow hypotheses, automation opportunities, quality gates, deterministic scorecards, review decisions, run diagnostics, and settings inspection.
- Verified, Inferred, Estimated, and Unknown information remains structurally distinct.
- Source text is untrusted data and cannot change application behavior or request secrets/tools.
- Budgets, retries, source access, scoring, state transitions, and validation are deterministic concerns.
- Human approval is required before any external action. The MVP has no outreach, CRM mutation, purchase, or target-company private-system access.
- The normal local and CI path uses explicit fixture providers. Live Brave search and OpenAI-compatible model adapters are configuration-selected and never silently fall back to fixtures.
- Scheduling is opt-in and remains disabled until launch-readiness evidence supports enabling it.

## Brand Commitments

The product name is Startup Automation Scout. The interface should feel like a calm research instrument: direct, evidence-led, and specific. It should avoid sales-dashboard conventions, inflated claims, and UI that hides uncertainty.

## Evidence on Hand

The repository contains canonical product, architecture, data-model, evidence-policy, UX, operations, privacy, failure-mode, and ADR documents. Deterministic fixture providers include BerlinFlow, QuietStack, Generic Labs, ContradictPay, and RetryWorks cases. No real customer testimonials, production benchmark, or verified commercial success claim is available and must not be fabricated.

## Product Principles

1. Evidence before inference.
2. Unknown is an acceptable result.
3. Deterministic software owns gates, state, budgets, and arithmetic.
4. Human review stays in control of external action.
5. A few deeply researched opportunities beat a large shallow lead list.

## Accessibility & Inclusion

The web interface must support keyboard review, visible focus, semantic labels, text-based epistemic states that do not rely on color alone, readable evidence at desktop and mobile widths, reduced-motion preferences, and clear partial/error states.
