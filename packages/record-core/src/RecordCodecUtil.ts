import { base64ToBytes, bytesToBase64 } from '@rexezuge/shared';

/**
 * Text-level policy on top of the kit's byte codec.
 *
 * Two decisions the byte codec cannot make for us, because they are about how
 * this service stores records rather than about base64:
 *
 * - **Stored values may carry surrounding whitespace.** The documented write
 *   path is `printf '…' | base64 -w 0` piped through a shell, and a `base64`
 *   invocation without `-w 0` wraps at column 76. Trimming is what lets both
 *   shapes read back.
 * - **Bytes that are not valid UTF-8 are a corrupt record**, not text to decode
 *   with replacement characters: replacement would serve mojibake as though it
 *   were the stored value.
 */
function decodeBase64ToText(storedValue: string): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(storedValue.trim()));
}

function encodeTextToBase64(rawValue: string): string {
  return bytesToBase64(new TextEncoder().encode(rawValue));
}

export { decodeBase64ToText, encodeTextToBase64 };
