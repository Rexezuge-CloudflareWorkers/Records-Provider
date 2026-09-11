import { decodeBase64ToText, extractRecordKey, isRecordKeySuccess } from '@record-provider/record-core';

const ALLOW_HEADER = 'GET';
const PLAIN_TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';

function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: ALLOW_HEADER,
      'Cache-Control': 'no-store',
    },
  });
}

function badRequest(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function notFound(): Response {
  return new Response('not found', {
    status: 404,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function invalidStoredEncoding(): Response {
  return new Response('invalid stored encoding', { status: 500 });
}

async function handleGetRecord(request: Request, env: Env): Promise<Response> {
  const pathname: string = new URL(request.url).pathname;
  const keyResult = extractRecordKey(pathname);
  if (!isRecordKeySuccess(keyResult)) {
    if (keyResult.error === 'missing') {
      return badRequest('missing record path');
    }
    if (keyResult.error === 'key-too-long') {
      return badRequest('record path too long');
    }
    return badRequest('invalid path encoding');
  }

  const storedValue: string | null = await env.RECORD_CACHE.get(keyResult.key);
  if (storedValue === null) {
    return notFound();
  }

  let decoded: string;
  try {
    decoded = decodeBase64ToText(storedValue);
  } catch {
    return invalidStoredEncoding();
  }

  return new Response(decoded, {
    status: 200,
    headers: {
      'Content-Type': PLAIN_TEXT_CONTENT_TYPE,
      'Cache-Control': 'no-store',
    },
  });
}

const RecordWorker = {
  fetch(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
    if (request.method !== 'GET') {
      return Promise.resolve(methodNotAllowed());
    }
    return handleGetRecord(request, env);
  },
};

export default RecordWorker;
