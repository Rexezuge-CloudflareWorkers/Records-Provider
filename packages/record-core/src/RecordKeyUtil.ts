import { err, ok } from '@rexezuge/shared';
import type { Result } from '@rexezuge/shared';

/**
 * The KV key ceiling, in bytes rather than characters.
 *
 * A path of 512 ASCII characters fits; one of 256 multi-byte characters may not.
 * The check is on the encoded bytes because that is what KV measures.
 */
const MAX_KV_KEY_BYTES = 512;

/**
 * Why a path did not yield a key.
 *
 * A value rather than an HTTP status: the wire mapping belongs to the worker's
 * boundary, and this module stays a pure parser.
 */
type RecordKeyFailureReason = 'missing' | 'invalid-encoding' | 'key-too-long';

/**
 * The key `RECORD_CACHE` is read under, or the reason the path has none.
 */
type RecordKeyResult = Result<string, RecordKeyFailureReason>;

/**
 * Resolve a request path to a record key.
 *
 * Leading and trailing slashes are structural — `/aaaa/bbbb/` and `/aaaa/bbbb`
 * name the same record — while inner slashes are part of the key.
 */
function extractRecordKey(pathname: string): RecordKeyResult {
  let withoutTrailingSlashes = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  while (withoutTrailingSlashes.endsWith('/')) {
    withoutTrailingSlashes = withoutTrailingSlashes.slice(0, -1);
  }
  if (withoutTrailingSlashes.length === 0) {
    return err('missing');
  }

  let key: string;
  try {
    key = decodeURIComponent(withoutTrailingSlashes);
  } catch {
    return err('invalid-encoding');
  }

  if (new TextEncoder().encode(key).length > MAX_KV_KEY_BYTES) {
    return err('key-too-long');
  }

  return ok(key);
}

export { extractRecordKey, MAX_KV_KEY_BYTES };
export type { RecordKeyFailureReason, RecordKeyResult };
