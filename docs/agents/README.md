# Agent Working Notes

Future coding agents working in this project should read, in order:

1. `/Users/derin/Desktop/CODING/AGENTS.md`
2. `CONTEXT.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. relevant files in `docs/adr/`
6. `IMPLEMENTATION_PLAN.md`

Project-specific rules:

- preserve the distinction between Verified, Inferred, Estimated, and Unknown data;
- do not introduce a source connector without documenting access constraints in `SOURCE_STRATEGY.md`;
- do not add automatic outreach without a new explicit product decision and user authorization;
- keep provider-specific concepts out of canonical domain vocabulary;
- test through the highest useful module interface rather than implementation internals;
- prefer deterministic logic for gates, state, scoring, budgets, and validation;
- any model/prompt change that affects research quality must be tested against the golden evaluation set once that fixture exists;
- update an ADR only when a hard-to-reverse architecture decision genuinely changes.
