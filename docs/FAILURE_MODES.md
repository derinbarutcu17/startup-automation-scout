# Failure Modes and Expected Handling

## Research and Identity Failures

### Same company appears under multiple names

Risk: duplicate research and duplicate shortlist entries.

Handling:

- normalize canonical domain;
- retain aliases;
- use deterministic domain matches first;
- require review for ambiguous mergers;
- never merge solely because names look similar.

### Company location is unclear

Risk: German/foreign company misclassification.

Handling:

- preserve location as unknown if not verified;
- prefer official company/investor information;
- do not infer headquarters from a founder's location;
- allow configurable "unknown geography" deferral.

### Company is inactive or closed

Risk: wasted research and embarrassing outreach preparation.

Handling:

- look for recent official activity;
- treat long silence as a signal, not proof of closure;
- only mark closed with strong evidence;
- otherwise lower freshness confidence.

## Source Failures

### Retrieval blocked or prohibited

Handling:

- do not bypass controls;
- mark SourceDocument unavailable;
- use permitted alternative sources;
- reduce coverage/confidence;
- continue the run when enough evidence remains.

### Search snippet conflicts with original page

Handling:

- original page wins when current and attributable;
- search snippet is not treated as final evidence.

### Source changed since previous run

Handling:

- store a new content fingerprint/version;
- preserve old evidence history;
- identify affected Claims for re-evaluation.

### Source contains prompt injection

Handling:

- treat all retrieved text as untrusted data;
- source content cannot change tools, system policy, budgets, or workflow;
- extraction prompts explicitly separate source text from instructions;
- suspicious content is logged for inspection.

## Claim Failures

### AI invents team size or funding amount

Handling:

- schema requires evidence links for Verified Claims;
- quality gate rejects unsupported factual numbers;
- unknown remains unknown.

### Old funding round appears as current

Handling:

- extract event date separately from fetch date;
- freshness scoring uses event date;
- missing dates lower confidence.

### Two sources disagree

Handling:

- retain both;
- mark disputed;
- do not silently choose the more convenient number.

## Opportunity Failures

### Generic AI suggestion

Example: "Build a customer-support chatbot" with no company-specific reason.

Handling:

- genericness check;
- require evidence-linked workflow specifics;
- reject if the idea still applies unchanged to most startups.

### Assumes private workflow as fact

Handling:

- convert to WorkflowHypothesis;
- list required confirmation question;
- reduce confidence;
- never state the internal process as verified.

### Automation duplicates an existing company feature

Handling:

- research product/docs/changelog before shortlist;
- reject or explicitly narrow the distinction.

### Impossible integration access

Handling:

- required private systems are explicit fields;
- buildability score falls;
- suggest a prototype using synthetic/public data when useful;
- do not imply production feasibility without access.

### Fabricated savings

Handling:

- no numeric savings without baseline inputs;
- use measurable outcome and validation plan instead.

## Operational Failures

### One company research task crashes

Handling:

- isolate company work item;
- bounded retry for transient provider errors;
- mark terminal failure after retry policy;
- continue the ScoutRun.

### Provider rate limit

Handling:

- backoff within run deadline;
- stop expensive/deep stages first when budget/time pressure rises;
- report degraded coverage;
- never spin in unlimited retries.

### Cost budget reached

Handling:

- stop launching new expensive work;
- finish or safely cancel bounded in-flight work;
- compile partial report with budget warning;
- preserve completed evidence.

### AI/provider output fails schema validation

Handling:

- one bounded repair/retry when safe;
- otherwise mark the stage failed;
- do not persist malformed output as canonical domain data.

## Product Failures

### User cannot tell fact from inference

This is a severity-one product failure even if the underlying model output is correct.

Handling:

- persistent visual labeling;
- evidence drawer;
- test fact/inference distinctions in end-to-end tests.

### Score looks authoritative without explanation

Handling:

- show dimension breakdown and confidence;
- never show an unexplained decimal "AI score".

### Too many recommendations

Handling:

- hard cap final weekly shortlist;
- optimize for rejection quality;
- archive lower-ranked valid opportunities for later inspection.
