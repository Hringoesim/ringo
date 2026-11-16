// appUpdate.ts — is a newer Ringo on the App Store than the one installed?
// (owner 2026-11-12: "toggle people to ... update the app".) Apple's public
// lookup answers with the version on sale; the phone compares it with its own
// (VITE_APP_VERSION, read from the Xcode project at build time). Asked at
// launch and when the app comes back to the front, at most every 6 hours, the
// answer kept in the app's preferences. No answer, or an answer that is not
// newer, shows nothing.
import { Capacitor } from '@capacitor/core';
import { useSyncExternalStore } from 'react';
import { storage } from './storage';

const APP_ID = '6787133742';
const LOOKUP_URL = `https://itunes.apple.com/lookup?id=${APP_ID}`;
/** The app's page in the App Store, where Update is. */
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_ID}`;
const LATEST_KEY = 'ringo_app_latest_v1';
const EVERY_MS = 6 * 3600000;

/** "1.11 (100)" -> "1.11" */
export const installedVersion = (): string => String(import.meta.env.VITE_APP_VERSION || '').trim().split(/\s/)[0];

/** Whether version a is newer than b, number by number ("1.10" is newer than "1.9"). */
export function isNewer(a: string, b: string): boolean {
  if (!/^\d+(\.\d+)*$/.test(a) || !/^\d+(\.\d+)*$/.test(b)) return false;
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

function readSaved(): { version: string; at: number } | null {
  const v = storage.json(LATEST_KEY) as { version?: unknown; at?: unknown } | null;
  return v && typeof v.version === 'string' && typeof v.at === 'number' ? { version: v.version, at: v.at } : null;
}

let latest: string | null = readSaved()?.version ?? null;
const listeners = new Set<() => void>();
/** The App Store's version when it is newer than this build, else null. */
const available = (): string | null => (latest && isNewer(latest, installedVersion()) ? latest : null);

async function check(): Promise<void> {
  if (Date.now() - (readSaved()?.at ?? 0) < EVERY_MS) return;
  try {
    const r = await fetch(LOOKUP_URL);
    if (!r.ok) return;
    const version = String((await r.json())?.results?.[0]?.version || '');
    if (!version) return;
    storage.set(LATEST_KEY, JSON.stringify({ version, at: Date.now() }));
    latest = version;
    listeners.forEach((l) => l());
  } catch { /* offline: ask again next time */ }
}

/** At launch: ask now and each time the app comes back to the front. */
export function startUpdateCheck(): () => void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return () => {};
  const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
  document.addEventListener('visibilitychange', onVisible);
  void check();
  return () => document.removeEventListener('visibilitychange', onVisible);
}

export function useUpdateAvailable(): string | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, available, available);
}
