import { describe, expect, it } from 'vitest';
import { decodeBase64ToText, encodeTextToBase64 } from '@record-provider/record-core';

describe('RecordCodecUtil', () => {
  it('round-trips values with spaces and newlines', () => {
    const raw = 'hello world\nsecond line  with  spaces\n';
    expect(decodeBase64ToText(encodeTextToBase64(raw))).toBe(raw);
  });

  it('round-trips unicode values', () => {
    const raw = 'héllo wörld 🌍\nnewline';
    expect(decodeBase64ToText(encodeTextToBase64(raw))).toBe(raw);
  });

  it('round-trips the empty string', () => {
    expect(decodeBase64ToText(encodeTextToBase64(''))).toBe('');
  });

  it('trims surrounding whitespace around the stored value', () => {
    const stored = `  ${encodeTextToBase64('padded')}\n`;
    expect(decodeBase64ToText(stored)).toBe('padded');
  });

  it('decodes base64 produced by external tooling', () => {
    // Generated with: printf '...' | base64 -w 0  (the documented write path)
    const stored = 'aGVsbG8gd29ybGQKc2Vjb25kIGxpbmUgIHdpdGggIHNwYWNlcwp1bmljb2RlIGjDqWxsbyDwn4yNCg==';
    expect(decodeBase64ToText(stored)).toBe('hello world\nsecond line  with  spaces\nunicode héllo 🌍\n');
  });

  it('throws on corrupt base64', () => {
    expect(() => decodeBase64ToText('!!!not-base64!!!')).toThrow();
  });

  it('throws on non-UTF-8 bytes', () => {
    expect(() => decodeBase64ToText('/w==')).toThrow();
  });
});
