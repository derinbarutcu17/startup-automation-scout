# Maintainer

Startup Automation Scout is maintained by [Derin Barutcu](https://github.com/derinbarutcu17),
a product designer and builder in Berlin. This project grew out of his own
job-search and portfolio-workflow tooling.

## Contributing

The simplest way to get a feel for the project: read `docs/PRODUCT_SPEC.md`
(short) and `docs/ARCHITECTURE.md` (system design), then pick a bug or a
feature from the issue tracker.

### Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

### Before you open a PR

1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. Relevant tests pass (`pnpm test`, and `pnpm test:integration` if you
   touched the DB layer)
4. If you changed the pipeline, run the fixture evaluation and note it in
   the PR

### Code style

- TypeScript everywhere, no implicit `any`
- Match the existing module layout (application → domain → infrastructure)
- Preserve the Verified / Inferred / Estimated / Unknown distinction in any
   claim-bearing code
- No secrets, no dev-only credentials, no hardcoded URLs that bypass the
   safe-HTTP provider

## Questions

Open a Discussion (questions, ideas, show-and-tell) or file an issue for
anything concrete.
