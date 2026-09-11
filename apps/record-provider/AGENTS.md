# Record-Provider — Worker

Scope: `apps/record-provider/**`. Parent index: `../../AGENTS.md`.

- `src/RecordWorker.ts` — default `fetch` only. `GET /<record-path>` → `RECORD_CACHE.get(key)` → base64-decode → `200 text/plain`. No auth, no writes.
- `src/index.ts` — trivial re-export of `RecordWorker` (excluded from coverage, per repo pattern).
- `src/types.d.ts` — `type Env = CloudflareEnv` global.
- Key mapping: `pathname.slice(1)` → strip trailing `/+` → `decodeURIComponent`. `/` → `400`, bad `%`-encoding → `400`, key bytes `>512` → `400`.
- KV miss → `404`. Corrupt base64 / non-UTF-8 bytes → `500`. Non-`GET` → `405` + `Allow: GET`.
- `packages/record-core` holds pure logic (`RecordKeyUtil`, `RecordCodecUtil`); the worker only does I/O.
