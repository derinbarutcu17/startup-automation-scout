# UX Specification

## Product Question

Every primary surface should help the user answer:

> Which company deserves my attention next, and why?

The interface is therefore evidence-led and decision-led rather than dashboard-heavy.

## Information Architecture

Primary navigation:

```text
Scout Runs
Companies
Opportunities
Reviews
Settings
```

## 1. Scout Runs

Purpose: start, monitor, and inspect one bounded research run.

Show:

- run scope;
- source configuration;
- budget ceiling;
- stage progress;
- discovered / eligible / researched / validated / shortlisted counts;
- actual spend;
- degraded-source warnings;
- run duration;
- final shortlist link.

Primary actions:

- start run;
- stop future work safely;
- open partial/final report.

## 2. Company Queue

Purpose: understand why companies are or are not receiving deeper research.

Each row/card shows:

- name and domain;
- verified location when known;
- strongest Recent Signal;
- eligibility status;
- company priority score and confidence;
- evidence coverage;
- last researched date;
- current pipeline state.

Filters:

- Berlin / Germany;
- eligible / rejected / deferred;
- recent-signal type;
- confidence;
- score range;
- source coverage;
- already reviewed.

## 3. Company Research Dossier

Purpose: let the user inspect the company before trusting an opportunity.

Sections:

### What is verified

Compact verified company/product facts with adjacent source links.

### Recent signals

Chronological funding, hiring, release, launch, or market signals.

### What we infer

Clearly labeled Inferred Claims with evidence, reasoning, confidence, and confirmation questions.

### What we do not know

Important Unknowns that affect opportunity quality.

### Sources

SourceDocument list with tier, date, freshness, and retrieval status.

### Opportunities

Small set of AutomationOpportunities generated from the dossier.

## 4. Opportunity Detail

This is the core product surface.

Header:

- one-sentence opportunity;
- company;
- total score;
- confidence;
- recommendation state.

Body:

### Observed evidence

Only verified company-specific context.

### Workflow hypothesis

What process may exist and why the Scout thinks so.

### Proposed automation

Plain-language before/after workflow.

### What actually needs AI

Separate deterministic steps from interpretation/reasoning steps.

### Expected value

Measurable outcome, not invented savings.

### Assumptions and unknowns

What must be validated with the company.

### Buildability

Required integrations, data, access, and prototype scope.

### Score breakdown

Evidence, pain, leverage, measurability, buildability, differentiation, career value.

### Next validation step

Usually a question, lightweight prototype, or public-data test.

Primary human actions:

- reject;
- investigate;
- prototype;
- archive;
- add note.

No contact action exists in MVP.

## 5. Weekly Report

Purpose: make the product useful even without opening every dossier.

Structure:

```text
Run summary
↓
Top 3 opportunities
↓
Why each matters now
↓
Evidence confidence
↓
Suggested next action
↓
Interesting but rejected companies
↓
Run limitations / missing sources
```

The report should be concise enough to review in under ten minutes.

## 6. Review History

Purpose: turn user judgment into evaluation evidence.

Show:

- past decisions;
- rejection reasons;
- opportunities promoted to prototype;
- companies revisited later;
- false-positive patterns.

## 7. Settings

Initial configuration:

- geography;
- stage preferences;
- source enablement;
- max companies for deep research;
- budget ceiling;
- freshness windows;
- model/search configuration;
- weekly schedule;
- shortlist size.

## Visual Trust Rules

- Verified, Inferred, Estimated, and Unknown states must have distinct labels and cannot rely on color alone.
- Source links appear near claims, not hidden in a bibliography only.
- Scores show dimension breakdown and confidence.
- Stale evidence receives a visible freshness warning.
- Contradictions are visible.
- Run budget and actual spend are visible before and after execution.
- Partial runs are clearly labeled partial.

## Responsive Priority

Desktop is the primary working surface because deep evidence comparison benefits from space. Mobile should support reading the weekly report, reviewing an Opportunity Brief, and recording a ReviewDecision, but full source investigation does not need to be optimized for phone-first use in the MVP.
