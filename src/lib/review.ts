// App Store rating ask (owner 2026-10-27, rule tightened 2026-10-31 for
// 1.08): My eSIM is the only caller, and it asks only once the buyer's eSIM
// shows as installed on this iPhone and has carried data, so the ask lands
// when Ringo has visibly worked. Never on Rewards, never after a problem,
// and at most once every 120 days per phone, the date kept in the app's
// preferences (localStorage, like the push and language choices). Apple
// decides whether the dialog actually shows.
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Usage } from '../api/light';

const Native = registerPlugin<{ request(): Promise<{ asked: boolean }> }>('Review');
/** When the ask last fired, as Date.now(). */
const ASKED_AT_KEY = 'ringo.review.asked_at';
/** 1.05 to 1.07 wrote '1' here once asked; read once, then carried over. */
const LEGACY_ASKED_KEY = 'ringo.review.asked';
const EVERY_MS = 120 * 86400000;

/** Where to leave a written review; the Help row opens it in the App Store. */
export const WRITE_REVIEW_URL = 'https://apps.apple.com/app/id6787133742?action=write-review';

export function reviewAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('Review');
}

function lastAskedAt(): number | null {
  try {
    const at = Number(localStorage.getItem(ASKED_AT_KEY));
    if (at > 0) return at;
    // An older build asked without a date: count it as today, so nobody who
    // was already asked sees the dialog again straight after updating.
    if (localStorage.getItem(LEGACY_ASKED_KEY) === '1') {
      const now = Date.now();
      localStorage.setItem(ASKED_AT_KEY, String(now));
      localStorage.removeItem(LEGACY_ASKED_KEY);
      return now;
    }
    return null;
  } catch { return Date.now(); }
}

/**
 * Data the current plan's eSIM has carried, in MB, from the usage history
 * ringoesim.com keeps: the rows for that destination, or every row when the
 * plan has no destination id.
 */
export function usedMbFor(usage: Usage | null, destination: string | null): number {
  if (!usage) return 0;
  const rows = destination ? usage.esims.filter((e) => e.destination === destination) : usage.esims;
  return rows.reduce((n, e) => Math.max(n, e.used_mb ?? 0), 0);
}

/** Whether this read of My eSIM earns the ask on this phone. */
export function shouldAskForReview(installed: boolean, usedMb: number, now = Date.now()): boolean {
  if (!installed || !(usedMb > 0) || !reviewAvailable()) return false;
  const at = lastAskedAt();
  return at == null || now - at >= EVERY_MS;
}

export async function askForReview(): Promise<void> {
  try { localStorage.setItem(ASKED_AT_KEY, String(Date.now())); } catch { /* ignore */ }
  try { await Native.request(); } catch { /* ignore */ }
}
