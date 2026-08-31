# Agent Working Notes

Future coding agents working in this project should read, in order:

1. `CONTEXT.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. relevant files in `docs/adr/`
5. `IMPLEMENTATION_PLAN.md`

For the approved prospecting extension, also read:

6. `docs/OUTREACH_DOSSIER_IMPLEMENTATION_PLAN.md`

Project-specific rules:

- preserve the distinction between Verified, Inferred, Estimated, and Unknown data;
- do not introduce a source connector without documenting access constraints in `SOURCE_STRATEGY.md`;
- keep the implemented outreach extension draft-only, source-backed, and
  human-approval-gated; do not add a send path.
