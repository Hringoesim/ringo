// The data quiz's arithmetic (owner 2026-10-27, "how much data do I need").
// Rough daily use per activity, in GB, the way travel eSIM guides size it:
// maps and messages are light, social and photos moderate, calls and
// streaming heavy, a hotspot heaviest. The answer is a plan type, never a
// promise about the network.

export type Use = 'maps' | 'social' | 'calls' | 'streaming' | 'hotspot';
export type PlanTab = 'data' | 'unl' | 'power';

/** Kept for older screens; the quiz now uses a slider. */
export const LENGTHS = [
  { label: 'A few days', days: 3 },
  { label: 'About a week', days: 7 },
  { label: 'Two weeks', days: 14 },
  { label: 'A month or more', days: 30 },
];

export const USES: { id: Use; label: string; sub: string; gbDay: number }[] = [
  { id: 'maps', label: 'Maps and messages', sub: 'Directions, WhatsApp, email', gbDay: 0.3 },
  { id: 'social', label: 'Social and photos', sub: 'Instagram, TikTok, sharing pictures', gbDay: 0.8 },
  { id: 'calls', label: 'Video calls', sub: 'FaceTime, Zoom, Teams', gbDay: 1 },
  { id: 'streaming', label: 'Streaming', sub: 'Netflix, YouTube, Spotify', gbDay: 2 },
  { id: 'hotspot', label: 'Hotspot', sub: 'Laptop, friends, a van', gbDay: 3 },
];

const DATA_SIZES = [1, 3, 5, 10, 20, 50];

/** GB a day for the picked uses, plus one for working online. */
export function perDayOf(uses: Use[], work: boolean): number {
  return uses.reduce((n, u) => n + (USES.find((x) => x.id === u)?.gbDay || 0), 0) + (work ? 1 : 0);
}

export function recommend({ days, uses, work }: { days: number; uses: Use[]; work: boolean }): { tab: PlanTab; title: string; line: string; gb?: number } {
  const perDay = perDayOf(uses, work);
  if (uses.includes('hotspot') || perDay >= 4) {
    return { tab: 'power', title: 'A Power plan', line: 'Plenty of data every day for a hotspot, a van or a laptop, on a mobile connection that is safer than public Wi-Fi.' };
  }
  if (perDay >= 1.5 || (perDay >= 1 && days > 7)) {
    return { tab: 'unl', title: 'Unlimited', line: 'Use it as much as you like for the whole trip, never cut off.' };
  }
  const need = Math.max(1, perDay * days * 1.2);
  const size = DATA_SIZES.find((g) => g >= need) ?? 50;
  return { tab: 'data', gb: size, title: `About ${size} GB`, line: `A ${size} GB data plan should cover ${days === 1 ? 'a day' : `${days} days`} of ${uses.length ? 'what you picked' : 'light use'}, with some to spare. You can add more any time.` };
}

// The quiz's answer, read once by the next plan screen (then cleared, so it
// never steers later destinations): the tab, and for a data plan the size.
const KEY = 'ringo_quiz_pick';
export interface QuizPick { tab: PlanTab; gb?: number }
export function setQuizPick(tab: PlanTab, gb?: number): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ tab, ...(gb ? { gb } : {}) })); } catch { /* ignore */ }
}
export function takeQuizPick(): QuizPick | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && (v.tab === 'data' || v.tab === 'unl' || v.tab === 'power') ? { tab: v.tab, gb: Number(v.gb) > 0 ? Number(v.gb) : undefined } : null;
  } catch { return null; }
}
