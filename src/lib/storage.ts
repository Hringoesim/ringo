// storage.ts — localStorage that never throws. WKWebView's storage can be
// unavailable (private mode, a full disk, a locked-down profile) and what it
// holds can be anything an older build or a bad write left there, so every
// read comes back as a value or null and every write says whether it landed.
// Callers keep their own keys, formats and fallbacks; this is only the
// try/catch they all repeated.
export const storage = {
  /** The stored string, or null when there is none or storage cannot be read. */
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  /** Whether the value was stored. */
  set(key: string, value: string): boolean {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
  /** The stored JSON, parsed; null when there is none, it does not parse, or storage cannot be read. The caller checks its shape. */
  json(key: string): unknown {
    try { return JSON.parse(localStorage.getItem(key) || 'null') as unknown; } catch { return null; }
  },
};
