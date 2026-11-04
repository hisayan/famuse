/**
 * UUID v4 that also works outside secure contexts.
 *
 * `crypto.randomUUID()` is only exposed in secure contexts (https or
 * localhost), so plain `http://` access over LAN/Tailscale would throw
 * `crypto.randomUUID is not a function`. Fall back to
 * `crypto.getRandomValues()` (available in every context), and to
 * `Math.random` only when WebCrypto itself is missing.
 */
export function randomId(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
