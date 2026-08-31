# Security Policy

## Reporting a vulnerability

Please report security issues **privately** through GitHub's private
advisory workflow:

1. Open the repository in GitHub
2. **Security** tab → **Report a vulnerability** → **Report a vulnerability**
3. Fill in the form and submit

Do **not** open a public issue for security problems — that discloses the
issue to everyone before it's fixed.

## What is in scope

- Source exfiltration via injected text (source documents are untrusted data)
- Contact/email handling: everything is source-backed or owner-supplied, never guessed
- Secret handling: `.env` values are never committed; encryption keys are dev-only
- Retrieval safety: safe-HTTP provider rejects loopback/private/unsafe hosts
- Budget abuse: runaway provider calls that exceed configured limits

## What is out of scope

- The live model/search provider credentials themselves (owner-managed)
- Postgres instances not deployed with the default dev configuration

## Handling process

1. Acknowledgment within 3 business days
2. Triage: severity + affected stage
3. Fix + regression test before disclosure
4. Credit the reporter in the release notes
