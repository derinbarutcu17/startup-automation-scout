# Data Model

## Design Goal

The data model must preserve provenance and uncertainty while supporting repeated research over time. Company research is not stored as one generated blob. It is decomposed into sources, evidence, claims, hypotheses, opportunities, scores, and human decisions.

## Core Entities

### Company

Canonical startup identity.

Key fields:

- id;
- canonical name;
- canonical domain;
- normalized headquarters/location when verified;
- status;
- first discovered timestamp;
- last researched timestamp.

Company must not directly store guessed stage, employee count, or funding as unquestioned truth. Time-sensitive properties should be backed by Claims.

### CompanyAlias

Alternative names, domains, Product Hunt names, former names, and source-specific identifiers used for duplicate resolution.

### DiscoveryRecord

Records where and when a Startup Candidate was discovered.

Key fields:

- source type;
- source URL or external identifier;
- discovered timestamp;
- raw name/domain;
- discovery metadata;
- Scout Run id.

### SourceDocument

One fetched research source.

Key fields:

- id;
- Company id when resolved;
- canonical URL;
- source tier;
- title;
- publisher/owner;
- published timestamp when known;
- fetched timestamp;
- content fingerprint;
- retrieval status;
- permitted-access metadata;
- extracted text or bounded normalized representation.

### EvidenceItem

A bounded excerpt, structured observation, or deterministic fact extracted from a SourceDocument.

Key fields:

- id;
- SourceDocument id;
- evidence type;
- normalized content;
- source locator;
- extraction method;
- extracted timestamp.

### Claim

Normalized statement supported, contradicted, or motivated by EvidenceItems.

Key fields:

- id;
- Company id;
- subject;
- claim text;
- claim type: verified, inferred, estimated, unknown;
- confidence: high, medium, low;
- temporal scope;
- contradiction status;
- reasoning summary for non-verified claims;
- created timestamp.

### ClaimEvidence

Join between Claim and EvidenceItem.

Key fields:

- Claim id;
- EvidenceItem id;
- relation: supports, contradicts, motivates;
- weight or strength when needed.

### RecentSignal

A normalized time-sensitive event used for prioritization.

Examples:

- funding;
- launch;
- hiring expansion;
- product release;
- market expansion;
- major integration;
- public customer announcement.

Every RecentSignal references Claims or EvidenceItems.

### ResearchDossier

Versioned research snapshot for a Company during a specific Scout Run.

Key fields:

- Company id;
- Scout Run id;
- source coverage summary;
- claim ids;
- recent signal ids;
- known unknowns;
- research completeness;
- research cost;
- generated timestamp.

### WorkflowHypothesis

One possible operational workflow inferred from a ResearchDossier.

Key fields:

- Company id;
- ResearchDossier id;
- description;
- actors;
- trigger;
- likely steps;
- pain hypothesis;
- evidence links;
- assumptions;
- confirmation questions;
- confidence.

### AutomationOpportunity

Potential automation mapped to one WorkflowHypothesis.

Key fields:

- WorkflowHypothesis id;
- proposed system;
- deterministic steps;
- AI-required steps;
- required integrations;
- required private access;
- measurable outcome;
- buildability;
- evidence strength;
- genericness status;
- risks;
- next validation step.

### Scorecard

Deterministic scored dimensions for either a Company or AutomationOpportunity.

Key fields:

- target entity;
- rubric version;
- dimension values;
- evidence references;
- total score;
- gating failures;
- scored timestamp.

### ScoutRun

One bounded execution.

Key fields:

- run id;
- started/finished timestamps;
- geographic scope;
- source configuration;
- target counts;
- monetary/token/search budget;
- actual cost;
- model/provider configuration;
- run status;
- degradation warnings;
- aggregate metrics.

### ReviewDecision

Human decision on a Company, Claim, WorkflowHypothesis, or AutomationOpportunity.

Key fields:

- target entity;
- decision;
- reason labels;
- free-text note;
- timestamp.

## Relationships

```text
ScoutRun
  ├── DiscoveryRecord ──> Company
  └── ResearchDossier ──> Company
                           ├── SourceDocument ──> EvidenceItem
                           │                       └── ClaimEvidence ──> Claim
                           ├── RecentSignal
                           ├── WorkflowHypothesis
                           │      └── AutomationOpportunity
                           │               └── Scorecard
                           └── ReviewDecision
```

## Important Invariants

1. An EvidenceItem cannot exist without a SourceDocument.
2. A Verified Claim shown to the user must have supporting EvidenceItems.
3. An Inferred Claim must retain its reasoning and evidence motivation.
4. An AutomationOpportunity cannot be shortlisted without a WorkflowHypothesis.
5. A WorkflowHypothesis cannot be considered high confidence without company-specific evidence.
6. A Scorecard records its rubric version so ranking remains reproducible after the rubric changes.
7. Source content is never silently overwritten. A changed page creates a new fetch/version with a new fingerprint.
8. Human ReviewDecisions append history rather than rewriting evidence.

## Initial Database Choice

Use PostgreSQL. The domain is strongly relational, provenance relationships matter, filtering and ranking are structured, and versioned research history benefits from durable transactions. JSON fields can hold provider-specific metadata, but the canonical domain entities should remain relational.

Vector search is not required for the first release. Add embeddings only if evaluation proves that semantic duplicate resolution or evidence retrieval cannot be solved adequately with deterministic normalization and normal text search.
