import { BadRequestError, InternalServerError, MethodNotAllowedError, NotFoundError, ServiceError } from '@rexezuge/errors';
import { AbstractEntrypointWorker, BASE_WORKER_MESSAGES } from '@rexezuge/runtime';
import { decodeBase64ToText, extractRecordKey, MAX_KV_KEY_BYTES } from '@record-provider/record-core';
import type { RecordKeyFailureReason } from '@record-provider/record-core';

const ALLOWED_METHOD = 'GET';
const NO_STORE = 'no-store';
const PLAIN_TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';

/**
 * What a client is told when a path does not yield a key.
 *
 * The reason codes are `record-core`'s; the sentences are this API's, because a
 * message is a response concern and the parser is a pure function.
 */
const RECORD_KEY_FAILURE_MESSAGES = {
  missing: 'A record path is required.',
  'invalid-encoding': 'The record path contains invalid percent-encoding.',
  'key-too-long': `A record key must be at most ${MAX_KV_KEY_BYTES} bytes.`,
} as const satisfies Record<RecordKeyFailureReason, string>;

/**
 * `GET /<record-path>` — read one base64-encoded record.
 *
 * The boundary is here rather than per-check: every refusal below is thrown and
 * mapped to the family's `Exception` envelope in one place, and `Cache-Control:
 * no-store` lands on every response — including the one an unexpected throw
 * produces, which is the gap the previous shape of this worker left open.
 */
class RecordProviderWorker extends AbstractEntrypointWorker {
  protected async onRequest(request: Request, env: Env): Promise<Response> {
    try {
      return await this.getRecord(request, env);
    } catch (error: unknown) {
      const serviceError = ServiceError.from(error);
      if (serviceError.status >= 500) {
        // Logged rather than returned: a 5xx message is for operators, and
        // `toErrorResponse` substitutes the generic one for the client.
        this.reportUnhandled(BASE_WORKER_MESSAGES.fetch, error);
      }
      return errorResponse(serviceError);
    }
  }

  protected onScheduled(): Promise<void> {
    // This worker declares no cron triggers; the platform never dispatches here.
    return Promise.resolve();
  }

  private async getRecord(request: Request, env: Env): Promise<Response> {
    if (request.method !== ALLOWED_METHOD) {
      throw new MethodNotAllowedError(`Record paths are read-only; only ${ALLOWED_METHOD} is supported.`);
    }

    const key = extractRecordKey(new URL(request.url).pathname);
    if (!key.ok) {
      throw new BadRequestError(RECORD_KEY_FAILURE_MESSAGES[key.error]);
    }

    const storedValue = await env.RECORD_CACHE.get(key.value);
    if (storedValue === null) {
      throw new NotFoundError('No record is stored under this path.');
    }

    return new Response(decodeStoredRecord(storedValue), {
      status: 200,
      headers: {
        'Content-Type': PLAIN_TEXT_CONTENT_TYPE,
        'Cache-Control': NO_STORE,
      },
    });
  }
}

/**
 * Decode one stored value, naming a corrupt record as a server fault: the
 * client asked for a record that exists, and what was stored under it is not
 * something this API can serve.
 */
function decodeStoredRecord(storedValue: string): string {
  try {
    return decodeBase64ToText(storedValue);
  } catch (cause: unknown) {
    throw new InternalServerError('The stored record is not valid base64-encoded UTF-8 text.', { cause });
  }
}

/**
 * The family envelope, plus the two headers that apply to every response: the
 * cache directive, and the `Allow` header a 405 owes its caller.
 */
function errorResponse(serviceError: ServiceError): Response {
  const { status, body } = serviceError.toErrorResponse();
  const headers = new Headers({ 'Cache-Control': NO_STORE });
  if (status === 405) {
    headers.set('Allow', ALLOWED_METHOD);
  }
  return Response.json(body, { status, headers });
}

export { RecordProviderWorker };
