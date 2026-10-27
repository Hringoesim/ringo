// App Store rating ask (owner 2026-10-27): once per phone, only after a
// delivered eSIM shows real data in use, so the ask lands when Ringo has
// visibly worked. Never after a problem: My eSIM is the only caller and it
// only asks once usage has loaded. Apple decides whether the dialog shows.
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Usage } from '../api/light';

const Native = registerPlugin<{ request(): Promise<{ asked: boolean }> }>('Review');
const ASKED_KEY = 'ringo.review.asked';
/** Enough to mean the eSIM is carrying traffic, not just a carrier test ping. */
const MIN_USED_MB = 50;

export function reviewAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('Review');
}

/** Whether this usage read earns the ask on this phone. */
export function shouldAskForReview(usage: Usage | null): boolean {
  if (!usage || !reviewAvailable()) return false;
  try { if (localStorage.getItem(ASKED_KEY) === '1') return false; } catch { return false; }
  return usage.esims.some((e) => (e.used_mb ?? 0) >= MIN_USED_MB);
}

export async function askForReview(): Promise<void> {
  try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* ignore */ }
  try { await Native.request(); } catch { /* ignore */ }
}
