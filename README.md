# Record-Provider

Record-Provider is a minimal Cloudflare Worker that serves records from a single KV namespace.

`GET /<record-path>` looks up `<record-path>` in the `RECORD_CACHE` KV namespace. KV holds a base64 string; the worker decodes it and returns the raw value as `text/plain; charset=utf-8`. Values may contain spaces, newlines, and Unicode.

## Behavior

- `GET /aaaa/bbbb` → KV key `aaaa/bbbb` → `200` with decoded body.
- Trailing slashes are normalized (`/aaaa/bbbb/` → `aaaa/bbbb`). Query strings are ignored.
- `/` or empty path → `400`. Bad `%`-encoding or key bytes `>512` → `400`.
- KV miss → `404`. Corrupt base64 / non-UTF-8 bytes → `500`.
- Non-`GET` → `405` + `Allow: GET`.
- Responses set `Cache-Control: no-store`.

## Cloudflare Bindings

- KV namespace binding: `RECORD_CACHE`

Copy `apps/record-provider/wrangler.template.jsonc` to `wrangler.jsonc` (or let CI generate it via `scripts/prepare-wrangler-config.ts`) and fill in the KV namespace id.

Create the namespace before deploy:

```bash
npx wrangler kv namespace create record-provider-record-cache
```

Populate records externally (worker is `GET`-only). KV stores base64:

```bash
printf 'hello world\nsecond line' | base64 -w 0 > /tmp/val.b64
npx wrangler kv key put --namespace-id=<id> "aaaa/bbbb" --path /tmp/val.b64
curl https://<worker-dev>/aaaa/bbbb
```

## Commands

```bash
pnpm install
pnpm -r typecheck
pnpm run lint
pnpm run test
pnpm run test:coverage
pnpm run typegen   # after changing wrangler bindings
pnpm run prepare-config  # copy template → wrangler.jsonc, provision RECORD_CACHE id
pnpm exec wrangler dev
pnpm exec wrangler deploy --dry-run && pnpm exec wrangler deploy
```
