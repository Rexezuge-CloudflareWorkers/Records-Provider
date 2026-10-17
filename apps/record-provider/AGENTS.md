# Record-Provider — Worker

Scope: `apps/record-provider/**`. Parent index: `../../AGENTS.md`.

- `src/RecordWorker.ts` — `RecordProviderWorker extends AbstractEntrypointWorker`. `GET /<record-path>` → `RECORD_CACHE.get(key)` → base64-decode → `200 text/plain`. No auth, no writes. `onScheduled` is a no-op (no cron triggers).
- `src/index.ts` — instantiates `RecordProviderWorker` as the default export (excluded from coverage, per repo pattern).
- `src/types.d.ts` — `type Env = CloudflareEnv` global.
- Key mapping: `pathname.slice(1)` → strip trailing `/+` → `decodeURIComponent`, in `record-core`. The reasons come back as a `Result` (`missing` | `invalid-encoding` | `key-too-long`) and the worker maps them to `400` envelopes; `/` → `400`, bad `%`-encoding → `400`, key bytes `>512` → `400`.
- KV miss → `404`. Corrupt base64 / non-UTF-8 bytes → `500` (masked message). Non-`GET` → `405` + `Allow: GET`.
- Every response — success, refusal, and unexpected failure — carries `Cache-Control: no-store`; refusals carry the family envelope, and `5xx` are logged via `reportUnhandled` with the raw cause.
- `packages/record-core` holds pure logic (`RecordKeyUtil`, `RecordCodecUtil`); the worker only does I/O.
