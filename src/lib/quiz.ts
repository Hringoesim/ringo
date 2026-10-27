// The data quiz's arithmetic (owner 2026-10-27, "how much data do I need").
// Rough daily use per activity, in GB, the way travel eSIM guides size it:
// maps and messages are light, social and photos moderate, calls and
// streaming heavy, a hotspot heaviest. The answer is one plan (owner
// 2026-10-27: "the quiz should recommend a single plan"): its type, its
// amount and its length, never a promise about the network.

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
// The lengths the Unlimited and Power plans are sold in.
const PLAN_DAYS = [1, 3, 5, 7, 10, 15, 20, 30];

/** GB a day for the picked uses, plus one for working online. */
export function perDayOf(uses: Use[], work: boolean): number {
  return uses.reduce((n, u) => n + (USES.find((x) => x.id === u)?.gbDay || 0), 0) + (work ? 1 : 0);
}

export interface QuizPlan { tab: PlanTab; days: number; gb?: number; dailyGb?: number; title: string; line: string }

export function recommend({ days, uses, work }: { days: number; uses: Use[]; work: boolean }): QuizPlan {
  const perDay = perDayOf(uses, work);
  const len = PLAN_DAYS.find((d) => d >= days) ?? 30;
  const lenText = len === 1 ? '1 day' : `${len} days`;
  if (uses.includes('hotspot') || perDay >= 4) {
    // Super User (10 GB a day) when a hotspot also carries work or streaming.
    const superUser = perDay >= 6;
    return { tab: 'power', days: len, dailyGb: superUser ? 10 : 5, title: `${superUser ? 'Super User' : 'Power'}, ${lenText}`, line: 'Unlimited data for a van, hotspot or laptop.' };
  }
  if (perDay >= 1.5 || (perDay >= 1 && days > 7)) {
    return { tab: 'unl', days: len, title: `Unlimited, ${lenText}`, line: 'Use it as much as you like for the whole trip, never cut off.' };
  }
  const need = Math.max(1, perDay * days * 1.2);
  const size = DATA_SIZES.find((g) => g >= need) ?? 50;
  return { tab: 'data', days, gb: size, title: `${size} GB of data`, line: `Covers ${days === 1 ? 'a day' : `${days} days`} of ${uses.length ? 'what you picked' : 'light use'}, with some to spare. You can add more any time.` };
}

// The quiz's plan, read once by the next plan screen (then cleared, so it
// never steers later destinations): the tab, the length, and the size (data)
// or the GB a day (Power) that pick the line.
const KEY = 'ringo_quiz_pick';
export interface QuizPick { tab: PlanTab; days?: number; gb?: number; dailyGb?: number }
export function setQuizPick(pick: QuizPick): void {
  const { tab, days, gb, dailyGb } = pick;
  try { sessionStorage.setItem(KEY, JSON.stringify({ tab, days, gb, dailyGb })); } catch { /* ignore */ }
}
export function takeQuizPick(): QuizPick | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    const num = (n: unknown) => (Number(n) > 0 ? Number(n) : undefined);
    return v && (v.tab === 'data' || v.tab === 'unl' || v.tab === 'power') ? { tab: v.tab, days: num(v.days), gb: num(v.gb), dailyGb: num(v.dailyGb) } : null;
  } catch { return null; }
}
