// The data quiz's arithmetic (owner 2026-10-27, "how much data do I need").
// Rough daily use per activity, in GB, the way travel eSIM guides size it:
// maps and messages are light, social and photos moderate, calls and
// streaming heavy, a hotspot heaviest. The answer is one plan (owner
// 2026-10-27: "the quiz should recommend a single plan"): its type, its
// amount and its length, never a promise about the network.

import { Capacitor } from '@capacitor/core';
import { account } from '../store/account';
import { SITE } from '../api/light';

export type Use = 'maps' | 'social' | 'calls' | 'streaming' | 'hotspot';
export type PlanTab = 'data' | 'unl' | 'power';
export type Trip = 'backpacker' | 'beach' | 'multi';

// The first question (owner 2026-10-27: "backpacker beacher multi country"):
// the kind of trip sets a starting length and the usual uses, both still
// changeable; a multi country trip ends on the region plans, not a country.
export const TRIPS: { id: Trip; label: string; sub: string; days: number; uses: Use[] }[] = [
  { id: 'backpacker', label: 'Backpacker', sub: 'Long trip, hostels, on the move', days: 30, uses: ['maps', 'social'] },
  { id: 'beach', label: 'Beach holiday', sub: 'Sun, photos, a week or two', days: 7, uses: ['social'] },
  { id: 'multi', label: 'Multi country', sub: 'Several countries, one eSIM', days: 14, uses: ['maps', 'social'] },
];

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
export interface QuizPick { tab: PlanTab; days?: number; gb?: number; dailyGb?: number; quizId?: string }
export function setQuizPick(pick: QuizPick): void {
  const { tab, days, gb, dailyGb, quizId } = pick;
  try { sessionStorage.setItem(KEY, JSON.stringify({ tab, days, gb, dailyGb, quizId })); } catch { /* ignore */ }
}
export function takeQuizPick(): QuizPick | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    const num = (n: unknown) => (Number(n) > 0 ? Number(n) : undefined);
    return v && (v.tab === 'data' || v.tab === 'unl' || v.tab === 'power') ? { tab: v.tab, days: num(v.days), gb: num(v.gb), dailyGb: num(v.dailyGb), quizId: typeof v.quizId === 'string' ? v.quizId : undefined } : null;
  } catch { return null; }
}

// Every answer is kept (owner 2026-10-27: "keep it and store and learn and
// have it to see who our buyers are"): /api/app-quiz-answer upserts one row
// per quiz taken, keyed by its id, and the place picked after it lands on the
// same row. Never blocks the quiz; a failed send is dropped.
export interface QuizAnswer { id: string; trip: string | null; days: number; uses: Use[]; work: boolean; gbDay: number; rec: QuizPlan }
const sent = new Map<string, QuizAnswer>();
export function newQuizId(): string {
  try { return crypto.randomUUID(); } catch { return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)); }
}
function post(a: QuizAnswer, picked?: string): void {
  const acct = account.get();
  const { tab, days, gb, dailyGb, title } = a.rec;
  void fetch(`${SITE}/api/app-quiz-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: a.id, ...(acct ? { user: acct.userId, t: acct.t } : {}),
      trip: a.trip, days: a.days, uses: a.uses, work: a.work, gb_day: Math.round(a.gbDay * 10) / 10,
      rec: { tab, days, gb, dailyGb, title }, client: Capacitor.getPlatform(), ...(picked ? { picked } : {}),
    }),
  }).catch(() => {});
}
export function sendQuizAnswer(a: QuizAnswer): void { sent.set(a.id, a); post(a); }
/** The place opened after the quiz (a region on the result, or the store's pick). */
export function sendQuizPicked(id: string | undefined, destination: string): void {
  const a = id ? sent.get(id) : undefined;
  if (a) post(a, destination);
}
