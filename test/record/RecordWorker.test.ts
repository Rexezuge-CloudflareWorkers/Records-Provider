import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '@record-provider/record-provider';
import { encodeTextToBase64 } from '@record-provider/record-core';

function createEnv(storedValue: string | null): Env {
  return {
    RECORD_CACHE: {
      get: vi.fn().mockResolvedValue(storedValue),
    },
  } as unknown as Env;
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
    const response = await worker.fetch(getRequest('/aaaa/bbbb'), createEnv(encodeTextToBase64(raw)));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe(raw);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('looks up the path without the leading slash', async () => {
    const env = createEnv(encodeTextToBase64('value'));
    await worker.fetch(getRequest('/aaaa/bbbb'), env);
    expect(env.RECORD_CACHE.get).toHaveBeenCalledWith('aaaa/bbbb');
  });

  it('normalizes a trailing slash before lookup', async () => {
    const env = createEnv(encodeTextToBase64('value'));
    const response = await worker.fetch(getRequest('/aaaa/bbbb/'), env);
    expect(response.status).toBe(200);
    expect(env.RECORD_CACHE.get).toHaveBeenCalledWith('aaaa/bbbb');
  });

  it('decodes percent-encoded paths', async () => {
    const env = createEnv(encodeTextToBase64('value'));
    await worker.fetch(getRequest('/aaaa%20bbbb'), env);
    expect(env.RECORD_CACHE.get).toHaveBeenCalledWith('aaaa bbbb');
  });

  it('returns 404 on a KV miss', async () => {
    const response = await worker.fetch(getRequest('/missing'), createEnv(null));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('not found');
  });

  it('returns 400 for the root path', async () => {
    const env = createEnv(null);
    const response = await worker.fetch(getRequest('/'), env);
    expect(response.status).toBe(400);
    expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid path encoding', async () => {
    const env = createEnv(null);
    const response = await worker.fetch(getRequest('/%E0%A4%A'), env);
    expect(response.status).toBe(400);
    expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
  });

  it('returns 400 for a record path over 512 bytes', async () => {
    const env = createEnv(null);
    const response = await worker.fetch(getRequest(`/${'a'.repeat(513)}`), env);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('record path too long');
    expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
  });

  it('returns 500 for corrupt stored base64', async () => {
    const response = await worker.fetch(getRequest('/aaaa'), createEnv('!!!not-base64!!!'));
    expect(response.status).toBe(500);
  });

  it('returns 405 for non-GET methods with an Allow header', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
      const env = createEnv(null);
      const response = await worker.fetch(getRequest('/aaaa/bbbb', method), env);
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET');
      expect(env.RECORD_CACHE.get).not.toHaveBeenCalled();
    }
  });
});
