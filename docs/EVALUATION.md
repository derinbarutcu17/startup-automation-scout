# Evaluation Plan

## Purpose

The Scout must earn trust against a human-reviewed benchmark before its output is treated as reliable. A convincing interface and plausible language are not sufficient evidence that the system works.

## Golden Evaluation Set

Before tuning prompts against production use, create a manually reviewed set of at least 20 real companies containing:

- Berlin companies that clearly fit the target;
- German companies outside Berlin that fit;
- companies that should be rejected by geography or stage;
- companies with rich public evidence;
- companies with sparse or contradictory evidence;
- companies where obvious generic automations should be rejected;
- companies with at least one genuinely specific automation opportunity;
- at least two cases where the correct result is "not enough evidence".

For each company, manually record:

- canonical identity/domain;
- target-profile eligibility;
- key verified facts with sources;
- known unknowns;
- plausible WorkflowHypotheses;
- one or more acceptable AutomationOpportunities when appropriate;
- clearly bad/generic opportunities;
- reviewer notes.

Do not use the entire benchmark for prompt iteration. Keep a holdout subset to detect overfitting.

## Evaluation Layers

### 1. Discovery and identity

Metrics:

- candidate duplicate rate;
- incorrect merge rate;
- missed obvious duplicates;
- geographic precision;
- source provenance completeness.

Initial pass targets:

- no incorrect merges in the golden set;
- at least 95% exact provenance retention;
- at least 90% precision on deterministic eligibility rejects where verified data exists.

### 2. Evidence and claims

Metrics:

- factual support rate;
- unsupported factual claim rate;
- inference-label accuracy;
- contradiction retention;
- citation URL validity;
- stale-source detection.

Initial release gates:

- at least 95% of displayed factual claims sampled from the golden set are supported by their cited evidence;
- unsupported factual claims below 5%;
- 100% of displayed Inferred Claims are labeled as inferred;
- zero invented precise monetary or labor-savings claims when no baseline exists;
- zero silent contradiction drops in benchmark cases designed to contain conflicting evidence.

### 3. Workflow hypotheses

Human reviewers score each hypothesis from 1 to 5 on:

- company specificity;
- evidence connection;
- operational plausibility;
- clarity of assumptions;
- usefulness of validation questions.

Initial release gate:

- median score at least 4/5 across the holdout companies with sufficient evidence.

### 4. Automation opportunities

Human reviewers score:

- specificity;
- likely value;
- buildability;
- measurability;
- evidence strength;
- genericness.

Initial release gates:

- at least 70% of final-shortlist opportunities receive 4/5 or better for overall usefulness;
- generic suggestion rate below 15%;
- at least 80% of shortlisted opportunities contain a concrete measurable outcome and a realistic next validation step.

### 5. Ranking

Compare Scout ranking with human ranking using:

- top-3 overlap;
- pairwise preference agreement;
- reasons for disagreement.

The objective is not perfect rank correlation. The release gate is that the system consistently surfaces the human-recognized strongest opportunities near the top and explains disagreements in an inspectable way.

Initial target:

- at least 2 of the human top 3 appear in the Scout top 5 on the holdout set.

### 6. Cost and latency

Record:

- cost per discovered candidate;
- cost per screened candidate;
- cost per ResearchDossier;
- cost per shortlisted opportunity;
- total ScoutRun cost;
- median and p95 run time.

The initial development ceiling is €20 equivalent per full benchmark run unless explicitly overridden. This is a safety ceiling, not a target operating cost.

Before launch, establish a lower real weekly operating budget from measured provider costs.

## Negative Tests

The evaluation suite must deliberately include cases where the correct behavior is rejection:

- no evidence;
- company outside geography;
- old article presented as if recent;
- contradictory funding amounts;
- generic chatbot idea;
- inaccessible private workflow;
- source text containing prompt-injection instructions;
- unsupported employee count;
- duplicate company with different spelling;
- company that is already closed.

## Prompt/Model Change Regression Gate

Every material change to prompts, model provider, retrieval policy, scoring rubric, or source ranking runs against the golden set before release.

Compare:

- factual support;
- unsupported-claim rate;
- generic suggestion rate;
- human preference samples;
- cost;
- latency.

A cheaper configuration does not ship if trust metrics regress beyond configured tolerances.

## Human Review Log

Real usage creates ReviewDecisions. Periodically sample them to answer:

- Which opportunities were repeatedly rejected as generic?
- Which source types caused bad inferences?
- Which companies were consistently over-ranked?
- Which opportunities led to prototypes or useful conversations?

This feedback should inform later rubric and prompt changes, but evaluation definitions must not be rewritten merely to make current performance look better.
