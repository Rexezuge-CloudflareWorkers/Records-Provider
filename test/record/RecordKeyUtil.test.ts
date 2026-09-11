import { describe, expect, it } from 'vitest';
import { extractRecordKey, isRecordKeySuccess } from '@record-provider/record-core';

describe('RecordKeyUtil', () => {
  it('strips the leading slash', () => {
    const result = extractRecordKey('/aaaa/bbbb');
    expect(isRecordKeySuccess(result)).toBe(true);
    if (isRecordKeySuccess(result)) {
      expect(result.key).toBe('aaaa/bbbb');
    }
  });

  it('normalizes a single trailing slash', () => {
    const result = extractRecordKey('/aaaa/bbbb/');
    expect(isRecordKeySuccess(result)).toBe(true);
    if (isRecordKeySuccess(result)) {
      expect(result.key).toBe('aaaa/bbbb');
    }
  });

  it('normalizes multiple trailing slashes', () => {
    const result = extractRecordKey('/aaaa/bbbb///');
    expect(isRecordKeySuccess(result)).toBe(true);
    if (isRecordKeySuccess(result)) {
      expect(result.key).toBe('aaaa/bbbb');
    }
  });

  it('rejects the root path as missing', () => {
    expect(extractRecordKey('/')).toEqual({ error: 'missing', status: 400 });
  });

  it('rejects a path that is only slashes as missing', () => {
    expect(extractRecordKey('///')).toEqual({ error: 'missing', status: 400 });
  });

  it('decodes percent-encoded segments', () => {
    const result = extractRecordKey('/aaaa%20bbbb/cc');
    expect(isRecordKeySuccess(result)).toBe(true);
    if (isRecordKeySuccess(result)) {
      expect(result.key).toBe('aaaa bbbb/cc');
    }
  });

  it('rejects invalid percent-encoding', () => {
    expect(extractRecordKey('/%E0%A4%A')).toEqual({ error: 'invalid-encoding', status: 400 });
  });

  it('rejects keys over 512 bytes', () => {
    const longKey = `/${'a'.repeat(513)}`;
    expect(extractRecordKey(longKey)).toEqual({ error: 'key-too-long', status: 400 });
  });

  it('accepts a 512-byte key', () => {
    const result = extractRecordKey(`/${'a'.repeat(512)}`);
    expect(isRecordKeySuccess(result)).toBe(true);
  });

  it('accepts a key without a leading slash', () => {
    const result = extractRecordKey('aaaa/bbbb');
    expect(isRecordKeySuccess(result)).toBe(true);
    if (isRecordKeySuccess(result)) {
      expect(result.key).toBe('aaaa/bbbb');
    }
  });

  it('preserves inner slashes and nesting', () => {
    const result = extractRecordKey('/a/b/c/d');
    expect(isRecordKeySuccess(result)).toBe(true);
    if (isRecordKeySuccess(result)) {
      expect(result.key).toBe('a/b/c/d');
    }
  });
});
