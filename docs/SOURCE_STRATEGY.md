# Source Strategy

## Objective

The Scout needs enough fresh, attributable information to discover promising startups and reason about plausible operating workflows without depending on prohibited scraping or unsupported internal claims.

The source strategy separates **discovery** from **evidence**. A discovery source can tell the Scout that a company may be worth researching. A claim shown to the user should, whenever possible, be supported by the original or strongest available source.

## Source Classes

### Class A: Primary company sources

Preferred evidence:

- official company website;
- product documentation;
- official changelog;
- official blog or newsroom;
- careers page;
- public GitHub organization or repository controlled by the company;
- official app-store listing;
- official founder or company announcement when identity is clear.

Use these to establish product behavior, integrations, hiring signals, positioning, public customers, and company-authored events.

### Class B: Institutional and investor sources

Strong discovery and corroboration sources:

- Berlin Senate startup resources;
- IBB Ventures;
- HTGF;
- accelerator cohort pages;
- VC portfolio pages;
- official public funding announcements by investors.

These are particularly useful for company identity, geography, stage, and recent funding signals.

### Class C: Reputable secondary coverage

Useful for discovery and corroboration:

- established startup publications;
- reputable business publications;
- industry publications with named reporting.

Secondary coverage should not override contradictory primary evidence.

### Class D: Weak or conversational signals

Potentially useful for hypotheses, never sufficient alone for important factual claims:

- Product Hunt comments;
- Reddit discussions;
- community forum posts;
- unsourced social posts;
- app reviews.

These sources are useful for identifying possible pain, vocabulary, and user complaints, but require cautious handling.

## Discovery Inputs for the MVP

The first build should support three ingestion modes:

1. **Permitted web search discovery** using a commercial search provider configured by the user.
2. **Curated source feeds** from public institutional, investor, and funding pages that permit the chosen retrieval method.
3. **Manual URL or CSV seed input** for any company the user wants analyzed.

This combination makes the system useful even if an individual startup platform changes access policy.

## Product Hunt Decision

Product Hunt remains a useful launch-discovery surface, but it must not be a hard dependency.

As checked on 2026-08-29, Product Hunt's API documentation states that the API is GraphQL, requires an access token, and "must not be used for commercial purposes" unless Product Hunt is contacted about commercial use. Reference: https://api.producthunt.com/v2/docs

Because this Scout may support freelance or client acquisition, the MVP must not assume that ordinary Product Hunt API access is compatible with commercial use.

Allowed initial paths:

- manually add a Product Hunt company/product URL;
- use Product Hunt only when access terms for the intended use have been verified;
- request commercial permission later if Product Hunt becomes strategically important.

The core discovery workflow must still function without Product Hunt.

## Dealroom and Berlin Startup Map Decision

Berlin Senate startup resources and Dealroom are valuable discovery references, but automated use must depend on the access rights actually available at implementation time. The project must not assume a licensed Dealroom API or export exists.

If licensed or explicitly permitted access is available, add it as a discovery source. Otherwise use the public Berlin ecosystem pages for manual research and rely on permitted web search, investor portfolios, funding sources, and user-supplied seeds for automation.

References checked as reachable on 2026-08-29:

- https://www.berlin.de/sen/wirtschaft/startups/
- https://dealroom.co/regions/berlin/

## Other Initial Public Sources

References checked as reachable on 2026-08-29:

- HTGF portfolio: https://www.htgf.de/en/portfolio/
- IBB Ventures portfolio: https://www.ibbventures.de/portfolio/

Reachability alone does not grant permission for any retrieval method. Before implementing automated retrieval from a specific source, verify its current terms, robots policy where relevant, and any published API or feed.

## Search Provider Role

A web-search provider is a locator, not the final evidence store. Search-result snippets must not be treated as authoritative evidence when the original page can be fetched.

The research flow should be:

```text
search query
    ↓
candidate URLs
    ↓
fetch original permitted pages
    ↓
store Source Documents
    ↓
extract Evidence Items and Claims
```

## Source Reliability Tiers

Each Source Document receives a reliability tier:

| Tier | Meaning | Typical examples |
| --- | --- | --- |
| 1 | primary or authoritative | company docs, company newsroom, investor announcement, official registry data |
| 2 | reputable secondary | established startup or business publication |
| 3 | weak/contextual | comments, reviews, community discussions, social posts |

The tier is metadata, not an automatic truth score. A company marketing page can still be incomplete or self-serving.

## Freshness Policy

Every Source Document stores `published_at` when known, `fetched_at`, and a content fingerprint.

Initial refresh targets:

| Information | Refresh target |
| --- | --- |
| funding and major company events | 30 days |
| careers and hiring | 7 days |
| changelog and release pages | each Scout Run for shortlisted companies |
| company overview and pricing | 30 days |
| documentation and integrations | 30 days |
| weak conversational sources | only when actively investigating a hypothesis |

The application should show stale evidence instead of silently pretending it is current.

## Retrieval Rules

- Never bypass authentication, anti-bot controls, paywalls, or technical access restrictions.
- Prefer official APIs, feeds, exports, or normal public page retrieval where terms permit.
- Store the original URL and retrieval timestamp for every Source Document.
- Keep only the content necessary for research and provenance.
- Do not ingest personal information that is unnecessary for company-level analysis.
- Treat terms of service and data licenses as implementation requirements, not afterthoughts.

## Fallback Strategy

No single discovery source is allowed to be a single point of failure.

If one source becomes unavailable:

1. continue the Scout Run with remaining sources;
2. record degraded source coverage;
3. avoid reducing confidence silently;
4. allow the user to add companies manually;
5. surface the missing source in run diagnostics.
