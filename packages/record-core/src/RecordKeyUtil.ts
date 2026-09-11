const MAX_KV_KEY_BYTES = 512;

interface RecordKeySuccess {
  key: string;
}

interface RecordKeyFailure {
  error: 'missing' | 'invalid-encoding' | 'key-too-long';
  status: 400;
}

type RecordKeyResult = RecordKeySuccess | RecordKeyFailure;

function isRecordKeySuccess(result: RecordKeyResult): result is RecordKeySuccess {
  return 'key' in result;
}

function extractRecordKey(pathname: string): RecordKeyResult {
  let withoutTrailingSlashes = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  while (withoutTrailingSlashes.endsWith('/')) {
    withoutTrailingSlashes = withoutTrailingSlashes.slice(0, -1);
  }
  if (withoutTrailingSlashes.length === 0) {
    return { error: 'missing', status: 400 };
  }

  let key: string;
  try {
    key = decodeURIComponent(withoutTrailingSlashes);
  } catch {
    return { error: 'invalid-encoding', status: 400 };
  }

  if (new TextEncoder().encode(key).length > MAX_KV_KEY_BYTES) {
    return { error: 'key-too-long', status: 400 };
  }

  return { key };
}

export { extractRecordKey, isRecordKeySuccess, MAX_KV_KEY_BYTES };
export type { RecordKeyFailure, RecordKeyResult, RecordKeySuccess };
