# Privacy, Legal, and Platform Constraints

## Scope

This document defines engineering constraints, not legal advice. Before commercial launch or large-scale data collection, current legal and platform-specific terms should be reviewed by a qualified person where needed.

## Public and Authorized Data Only

The MVP may process:

- ordinary public company information;
- public product/docs/job/repository information;
- public institutional/investor announcements;
- permitted third-party web content;
- URLs/data manually supplied by the user;
- data accessed through a valid API/license compatible with the intended use.

The MVP must not:

- bypass authentication or technical restrictions;
- access private company systems without authorization;
- collect credentials;
- exploit leaked or stolen information;
- infer sensitive personal characteristics;
- mass-collect unnecessary personal information about employees or founders.

## Product Hunt

As verified from Product Hunt's API documentation on 2026-08-29, ordinary API use is stated as non-commercial unless commercial use is arranged with Product Hunt.

Reference: https://api.producthunt.com/v2/docs

Therefore Product Hunt API integration is not part of the commercial-capable MVP dependency graph. It can be added later only after the intended use is compatible with Product Hunt's then-current terms.

## LinkedIn

Do not build automated LinkedIn scraping or messaging into the MVP. If LinkedIn information is relevant, use manually supplied information or official/authorized access paths that are compatible with the intended use.

## Implemented Prospect Dossier Boundary

The optional Prospect Dossier extension can research a small number of public
professional identities for one owner-selected opportunity. It may retain a
public role, a permitted public profile URL, and a professional email only when
the email is shown by a retained source or explicitly supplied and confirmed by
the owner. It never guesses an address from a name, scrapes authenticated
LinkedIn pages, collects unrelated personal details, or treats a title as proof
of authority or personal pain.

Professional email values are encrypted at rest and redacted from default
Hermes exports, source text, logs, diagnostics, and browser read models. The
extension creates no send, inbox, scheduling, or CRM operation. Gmail OAuth is
blocked in production until an owner-authentication boundary is implemented.

## Robots and Site Terms

Before enabling automated retrieval for a new source:

1. identify the source owner;
2. check for an official API/feed/export;
3. check current terms relevant to automated access;
4. respect technical restrictions and reasonable rate limits;
5. record the source's access method in configuration;
6. disable the connector when compatibility is uncertain.

## Data Minimization

Store company-level evidence necessary to support the research task. Avoid retaining:

- personal contact details when not required;
- user accounts from public platforms;
- unrelated comments or personal data;
- full copies of large copyrighted documents when a bounded extracted representation plus URL/provenance is sufficient.

## GDPR Considerations

The intended MVP focuses on companies rather than profiling natural persons. However, public startup research can still incidentally contain personal data, such as founder names or public employee information.

Engineering defaults:

- minimize personal data;
- avoid sensitive-category inference entirely;
- retain provenance and deletion capability for stored source-derived records;
- define a retention policy before multi-user/commercial deployment;
- do not use personal data for automated high-impact decisions;
- conduct a proper GDPR/legal review before expanding into systematic people-level prospecting.

## External Actions

The core Scout is research-only. The optional Prospect Dossier extension stops
at a human-reviewed draft or an explicitly created Gmail draft and does not
send, schedule, or read messages.

Explicit human approval is required before any future feature can:

- send email;
- send social messages;
- create CRM records in external systems;
- publish a claim;
- contact a founder or employee;
- buy access/data;
- create a public issue or comment;
- connect to a target company's private environment.

The MVP worker should not possess message-sending or mailbox tools. The Gmail
integration is an application-level create-draft adapter, not a worker send
capability. This is stronger than relying on a prompt saying "do not send".

## Copyright and Source Storage

Prefer storing:

- URL;
- title/metadata;
- content fingerprint;
- bounded extracted evidence;
- normalized facts/claims;
- retrieval timestamp.

Avoid building a permanent full-text mirror of third-party sites unless the source license clearly permits it and there is a product need.

## Security Against Untrusted Web Content

Retrieved pages are hostile input from the model's perspective.

Requirements:

- page text cannot issue tool instructions;
- outbound fetcher blocks localhost, private networks, local files, and unsupported protocols;
- redirects are validated;
- downloaded content has size/type limits;
- HTML is sanitized before rendering;
- model-generated URLs are never fetched without validation;
- secrets are never inserted into retrieved-page context.

## Commercialization Gate

Before the Scout is sold, used systematically for commercial lead generation, or offered to other users, review:

- each automated source's commercial-use terms;
- search-provider licensing;
- model-provider data terms;
- data retention/deletion policy;
- privacy notice requirements;
- outreach laws/processes if outreach is later added;
- liability language around estimated value and inferred workflows.
