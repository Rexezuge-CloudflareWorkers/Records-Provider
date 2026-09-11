# AGENTS.md

Guidance for agents working in Record-Provider.

## Overview

Record-Provider is a Cloudflare Worker + pnpm workspace (`@record-provider/monorepo`, `packageManager: pnpm@11.2.2`).

- **Core**: public `GET /<record-path>` reads KV `RECORD_CACHE`, base64-decodes the stored value, returns `200 text/plain`. See `apps/record-provider/AGENTS.md`.
- **Packages**: `packages/record-core` holds pure key/codec logic with zero `@record-provider/*` deps.

## Cloudflare Documentation

**STOP.** APIs, limits, and behavior change frequently. Before any Workers or KV task, retrieve current official docs.

- Workers: https://developers.cloudflare.com/workers/
- KV read pairs: https://developers.cloudflare.com/kv/api/read-key-value-pairs/
- KV limits: https://developers.cloudflare.com/kv/platform/limits/
- Worker errors: https://developers.cloudflare.com/workers/observability/errors/

## Commands

Plain `pnpm` is canonical (CI uses `pnpm/action-setup@v4` + `setup-node node 24`).

```bash
pnpm install
pnpm -r typecheck && pnpm run lint && pnpm run test:coverage
pnpm run typegen   # after changing wrangler bindings
pnpm run prepare-config  # template → wrangler.jsonc + provision RECORD_CACHE
pnpm exec wrangler dev
pnpm exec wrangler deploy
```

## Import Direction

```
Layer 0: packages/record-core   — zero @record-provider/* deps
Layer 5: apps/record-provider   → record-core only
```

Enforced by ESLint `no-restricted-imports` in `eslint.config.mjs`.

## Index

| Area | Guide |
|---|---|
| Record worker, key mapping, responses | `apps/record-provider/AGENTS.md` |
| Bindings, wrangler, deploy | `README.md` |

## Commit Policy

Always commit changes after completing work unless explicitly told not to.

## Git Commit Messages

Format: `<TYPE>[optional scope]: <description>`

- Type in UPPERCASE: `FIX`, `FEAT`, `DOCS`, `STYLE`, `REFACTOR`, `TEST`, `BUILD`, `CHORE`, `CI`, `PERF`.
- Scope in lowercase: `FEAT(runtime): Add Scheduled Job State`.
- Description: Title Case words — `DOCS: Latest Agents Context Reflection`.
- When committing from `main`, first create a branch: `type/description` or `type/scope/description` in kebab-case (e.g. `feat/bootstrap/bootstrap-jqanywhere-v0.1-framework`).
- Always include a Markdown body separated from the subject by a blank line.
- Breaking changes: `!` after type/scope, or `BREAKING CHANGE: <description>` footer.

```text
<TYPE>[optional scope]: <description>

[Markdown body]

[optional footers]
```
