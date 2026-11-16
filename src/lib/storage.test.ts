import { afterEach, describe, expect, it, vi } from 'vitest';
import { storage } from './storage';

/** A localStorage over a plain Map; `broken` makes every call throw, as a locked-down WebView does. */
function fakeStorage(broken = false) {
  const map = new Map<string, string>();
  const guard = () => { if (broken) throw new Error('SecurityError'); };
  return {
    map,
    getItem: (k: string) => { guard(); return map.has(k) ? map.get(k)! : null; },
    setItem: (k: string, v: string) => { guard(); map.set(k, String(v)); },
    removeItem: (k: string) => { guard(); map.delete(k); },
  };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('storage, with localStorage working', () => {
  it('reads back what it stored, under the same key and as the same string', () => {
    const ls = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    expect(storage.set('ringo_k', 'v1')).toBe(true);
    expect(ls.map.get('ringo_k')).toBe('v1');
    expect(storage.get('ringo_k')).toBe('v1');
  });

  it('gives null for a key that was never stored, and after remove', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(storage.get('missing')).toBeNull();
    storage.set('k', 'v');
    storage.remove('k');
    expect(storage.get('k')).toBeNull();
  });

  it('parses stored JSON and leaves its shape to the caller', () => {
    const ls = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    ls.map.set('obj', '{"a":1}');
    ls.map.set('str', '"x"');
    expect(storage.json('obj')).toEqual({ a: 1 });
    expect(storage.json('str')).toBe('x');
  });

  it('gives null for JSON that is missing, empty or does not parse', () => {
    const ls = fakeStorage();
    vi.stubGlobal('localStorage', ls);
    ls.map.set('empty', '');
    ls.map.set('garbage', '{not json');
    expect(storage.json('missing')).toBeNull();
    expect(storage.json('empty')).toBeNull();
    expect(storage.json('garbage')).toBeNull();
  });
});

describe('storage, with localStorage throwing or absent', () => {
  it.each([
    ['throws on every call', () => vi.stubGlobal('localStorage', fakeStorage(true))],
    ['does not exist', () => vi.stubGlobal('localStorage', undefined)],
  ])('never throws when localStorage %s', (_name, arrange) => {
    arrange();
    expect(storage.get('k')).toBeNull();
    expect(storage.json('k')).toBeNull();
    expect(storage.set('k', 'v')).toBe(false);
    expect(() => storage.remove('k')).not.toThrow();
  });
});
