function decodeBase64ToText(storedValue: string): string {
  const normalized = storedValue.trim();
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function encodeTextToBase64(rawValue: string): string {
  const bytes = new TextEncoder().encode(rawValue);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}

export { decodeBase64ToText, encodeTextToBase64 };
