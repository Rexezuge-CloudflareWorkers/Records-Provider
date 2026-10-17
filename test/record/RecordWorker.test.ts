import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '@record-provider/record-provider';
import { encodeTextToBase64 } from '@record-provider/record-core';

/**
 * The generic message `toErrorResponse()` substitutes for a non-exposing error:
 * a 5xx message is for operators, so it never reaches the client envelope.
 */
const MASKED_SERVER_MESSAGE = 'The server encountered an internal error and was unable to complete your request.';

// Module-level so every 5xx test's logging assertion starts from a clean count
// while the output stays quiet; `clearAllMocks` clears calls, not implementations.
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

function createEnv(storedValue: string | null): Env {
  return {
    RECORD_CACHE: {
      get: vi.fn().mockResolvedValue(storedValue),
    },
  } as unknown as Env;
}

function createContext(): ExecutionContext {
  return { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;
}

function getRequest(path: string, method = 'GET'): Request {
  return new Request(`https://worker.dev${path}`, { method });
}

describe('Record worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns decoded text on a KV hit', async () => {
    const raw = 'hello world\nsecond line';
    const response = await worker.fetch(getRequest('/aaaa/bbbb'), createEnv(encodeTextToBase64(raw)), createContext());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).toBe(raw);
  });

  it('looks up the path without the leading slash', async () => {
    const env = createEnv(encodeTextToBase64('value'));
    await worker.fetch(getRequest('/aaaa/bbbb'), env, createContext());
    expect(env.RECORD_CACHE.get).toHaveBeenCalledWith('aaaa/bbbb');
  });

  it('normalizes a trailing slash before lookup', async () => {
    const env = createEnv(encodeTextToBase64('value'));
    const response = await worker.fetch(getRequest('/aaaa/bbbb/'), env, createContext());
    expect(response.status).toBe(200);
    expect(env.RECORD_CACHE.get).toHaveBeenCalledWith('aaaa/bbbb');
  });

  it('decodes percent-encoded paths', async () => {
    const env = createEnv(encodeTextToBase64('value'));
    await worker.fetch(getRequest('/aaaa%20bbbb'), env, createContext());
    expect(env.RECORD_CACHE.get).toHaveBeenCalledWith('aaaa bbbb');
  });

  it('returns 404 with the family envelope on a KV miss', async () => {
    const response = await worker.fetch(getRequest('/missing'), createEnv(null), createContext());
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      Exception: { Type: 'NotFound', Message: 'No record is stored under this path.' },
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 400 for the root path', async () => {
    const env = createEnv(null);
    const response = await worker.fetch(getRequest('/'), env, createContext());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      Exception: { Type: 'BadRequest', Message: 'A record path is required.' },
    });
    expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid path encoding', async () => {
    const env = createEnv(null);
    const response = await worker.fetch(getRequest('/%E0%A4%A'), env, createContext());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      Exception: { Type: 'BadRequest', Message: 'The record path contains invalid percent-encoding.' },
    });
    expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
  });

  it('returns 400 for a record path over 512 bytes', async () => {
    const env = createEnv(null);
    const response = await worker.fetch(getRequest(`/${'a'.repeat(513)}`), env, createContext());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      Exception: { Type: 'BadRequest', Message: 'A record key must be at most 512 bytes.' },
    });
    expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
  });

  it('returns a masked 500 for corrupt stored base64', async () => {
    const response = await worker.fetch(getRequest('/aaaa'), createEnv('!!!not-base64!!!'), createContext());
    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      Exception: { Type: 'InternalServerError', Message: MASKED_SERVER_MESSAGE },
    });
    // A 5xx is the operator's signal: the raw cause is logged, not returned.
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('returns a masked 500 when the KV read rejects', async () => {
    const env = {
      RECORD_CACHE: { get: vi.fn().mockRejectedValue(new Error('KV is unreachable')) },
    } as unknown as Env;
    const response = await worker.fetch(getRequest('/aaaa'), env, createContext());
    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      Exception: { Type: 'InternalError', Message: MASKED_SERVER_MESSAGE },
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('returns 405 for non-GET methods with an Allow header', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
      const env = createEnv(null);
      const response = await worker.fetch(getRequest('/aaaa/bbbb', method), env, createContext());
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toEqual({
        Exception: { Type: 'MethodNotAllowed', Message: 'Record paths are read-only; only GET is supported.' },
      });
      expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
    }
  });

  it('resolves the scheduled path without work or retries', async () => {
    // No cron triggers are configured, so the platform never dispatches here —
    // but the base class still exposes `scheduled()`, and a no-op that resolves
    // is what keeps a future trigger from being treated as a retryable failure.
    const controller = { cron: '0 * * * *', scheduledTime: 0, noRetry: vi.fn() };
    await expect(worker.scheduled(controller, createEnv(null), createContext())).resolves.toBeUndefined();
    expect(controller.noRetry).not.toHaveBeenCalled();
  });
});
