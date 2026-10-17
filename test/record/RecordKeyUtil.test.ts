import { describe, expect, it } from 'vitest';
import { extractRecordKey } from '@record-provider/record-core';

describe('RecordKeyUtil', () => {
  it('strips the leading slash', () => {
    expect(extractRecordKey('/aaaa/bbbb')).toEqual({ ok: true, value: 'aaaa/bbbb' });
  });

  it('normalizes a single trailing slash', () => {
    expect(extractRecordKey('/aaaa/bbbb/')).toEqual({ ok: true, value: 'aaaa/bbbb' });
  });

  it('normalizes multiple trailing slashes', () => {
    expect(extractRecordKey('/aaaa/bbbb///')).toEqual({ ok: true, value: 'aaaa/bbbb' });
  });

  it('rejects the root path as missing', () => {
    expect(extractRecordKey('/')).toEqual({ ok: false, error: 'missing' });
  });

  it('rejects a path that is only slashes as missing', () => {
    expect(extractRecordKey('///')).toEqual({ ok: false, error: 'missing' });
  });

  it('decodes percent-encoded segments', () => {
    expect(extractRecordKey('/aaaa%20bbbb/cc')).toEqual({ ok: true, value: 'aaaa bbbb/cc' });
  });

  it('rejects invalid percent-encoding', () => {
    expect(extractRecordKey('/%E0%A4%A')).toEqual({ ok: false, error: 'invalid-encoding' });
  });

  it('rejects keys over 512 bytes', () => {
    expect(extractRecordKey(`/${'a'.repeat(513)}`)).toEqual({ ok: false, error: 'key-too-long' });
  });

  it('accepts a 512-byte key', () => {
    expect(extractRecordKey(`/${'a'.repeat(512)}`).ok).toBe(true);
  });

  it('measures the byte length, not the character count', () => {
    // 'é' is two UTF-8 bytes: 256 of them are exactly at the ceiling, and the
    // 257th character is where a character-count check would still pass.
    expect(extractRecordKey(`/${'é'.repeat(256)}`).ok).toBe(true);
    expect(extractRecordKey(`/${'é'.repeat(257)}`)).toEqual({ ok: false, error: 'key-too-long' });
  });

  it('accepts a key without a leading slash', () => {
    expect(extractRecordKey('aaaa/bbbb')).toEqual({ ok: true, value: 'aaaa/bbbb' });
  });

  it('preserves inner slashes and nesting', () => {
    expect(extractRecordKey('/a/b/c/d')).toEqual({ ok: true, value: 'a/b/c/d' });
  });
});
