// location.ts — the country this phone is in, for pushes about where the
// member travels (owner 2026-10-24). While Using only; the phone turns the
// fix into an ISO code itself (LocationPlugin.swift) and only that code goes
// to ringoesim.com, with the push token (push.ts syncPush).
//
// Asked once, right after a yes to notifications (push.ts askPermission):
// someone who said no to pushes is never asked. Afterwards it is read again
// when the app comes to the front, at most every 30 minutes.
import { Capacitor, registerPlugin } from '@capacitor/core';

type Permission = 'granted' | 'denied' | 'prompt';
interface LocationPlugin {
  status(): Promise<{ permission: Permission }>;
  country(opts: { ask?: boolean }): Promise<{ permission: Permission; country?: string }>;
}

const Native = registerPlugin<LocationPlugin>('Location');
const KEY = 'ringo_country_v1';
const EVERY_MS = 30 * 60 * 1000;
const available = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

function saved(): { country: string; at: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && typeof v.country === 'string' ? v : null;
  } catch { return null; }
}

/** The last country read on this phone, or null. */
export function lastCountry(): string | null {
  return saved()?.country ?? null;
}

/** Read the country now; `ask` raises the iOS dialog when it has not been asked. Returns the code or null. */
export async function readCountry(ask = false): Promise<string | null> {
  if (!available()) return null;
  const last = saved();
  if (!ask && last && Date.now() - last.at < EVERY_MS) return last.country;
  try {
    const r = await Native.country({ ask });
    if (r.country && /^[A-Z]{2}$/i.test(r.country)) {
      const country = r.country.toUpperCase();
      try { localStorage.setItem(KEY, JSON.stringify({ country, at: Date.now() })); } catch { /* ignore */ }
      return country;
    }
  } catch { /* plugin missing on an old build */ }
  return last?.country ?? null;
}
