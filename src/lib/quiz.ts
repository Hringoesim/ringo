// The data quiz's arithmetic (owner 2026-10-27, "how much data do I need").
// Rough daily use per activity, in GB, the way travel eSIM guides size it:
// maps and messages are light, social and photos moderate, calls and
// streaming heavy, a hotspot heaviest. The answer is one plan (owner
// 2026-10-27: "the quiz should recommend a single plan"): its type, its
// amount and its length, never a promise about the network.

import { Capacitor } from '@capacitor/core';
import { account } from '../store/account';
import { SITE, type Catalog, type Plan } from '../api/light';
import { t, tk, plural } from './i18n';

export type Use = 'maps' | 'social' | 'calls' | 'streaming' | 'hotspot';
export type PlanTab = 'data' | 'unl' | 'power';
export type Trip = 'backpacker' | 'beach' | 'multi' | 'city' | 'nomad';

// The first question (owner 2026-10-27: "backpacker beacher multi country",
// then "add city trip to the mix! and add digital nomad"):
// the kind of trip sets a starting length and the usual uses, both still
// changeable; a multi country trip ends on the region plans, not a country.
export const TRIPS: { id: Trip; label: string; sub: string; days: number; uses: Use[] }[] = [
  { id: 'backpacker', label: tk('Backpacker'), sub: tk('Long trip, hostels, on the move'), days: 30, uses: ['maps', 'social'] },
  { id: 'beach', label: tk('Beach holiday'), sub: tk('Sun, photos, a week or two'), days: 7, uses: ['social'] },
  { id: 'multi', label: tk('Multi country'), sub: tk('Several countries, one eSIM'), days: 14, uses: ['maps', 'social'] },
  { id: 'city', label: tk('City trip'), sub: tk('A few days, maps and photos'), days: 4, uses: ['maps', 'social'] },
  { id: 'nomad', label: tk('Digital nomad'), sub: tk('Working online from anywhere'), days: 30, uses: ['maps', 'calls', 'social'] },
];

/** Kept for older screens; the quiz now uses a slider. */
export const LENGTHS = [
  { label: 'A few days', days: 3 },
  { label: 'About a week', days: 7 },
  { label: 'Two weeks', days: 14 },
  { label: 'A month or more', days: 30 },
];

export const USES: { id: Use; label: string; sub: string; gbDay: number }[] = [
  { id: 'maps', label: tk('Maps and messages'), sub: tk('Directions, WhatsApp, email'), gbDay: 0.3 },
  { id: 'social', label: tk('Social and photos'), sub: tk('Instagram, TikTok, sharing pictures'), gbDay: 0.8 },
  { id: 'calls', label: tk('Video calls'), sub: tk('FaceTime, Zoom, Teams'), gbDay: 1 },
  { id: 'streaming', label: tk('Streaming'), sub: tk('Netflix, YouTube, Spotify'), gbDay: 2 },
  { id: 'hotspot', label: tk('Hotspot'), sub: tk('Laptop, friends, a van'), gbDay: 3 },
];

// The lengths the Unlimited and Power plans are sold in.
const PLAN_DAYS = [1, 3, 5, 7, 10, 15, 20, 30];

/** GB a day for the picked uses, plus one for working online. */
export function perDayOf(uses: Use[], work: boolean): number {
  return uses.reduce((n, u) => n + (USES.find((x) => x.id === u)?.gbDay || 0), 0) + (work ? 1 : 0);
}

/** `title` stays English (it is what /api/app-quiz-answer records); `shown` is the title in the app's language. */
export interface QuizPlan { tab: PlanTab; days: number; gb?: number; dailyGb?: number; /** The trip's length as answered, and the GB it needs with a fifth to spare. */ tripDays: number; needGb: number; title: string; shown: string; line: string }

// The rules (owner 2026-11-10, after the quiz offered "30 days, 3 GB" for a
// week away: "never would you suggest this, have actual rules", then "show
// the plan that works for them but also gives us good margins"). The answers
// say what the trip needs (recommend); the place's catalogue says which line
// that is (lineFor):
// 1. A plan works when it lasts the whole trip and holds enough for what was
//    picked. Never a longer or bigger line than the smallest that works.
// 2. A hotspot, or 4 GB a day and up, is Power; 6 GB a day and up, Super User.
// 3. Otherwise Unlimited for the trip's length, when it keeps Ringo a good
//    margin (the site's good_margin: half of what the card pays).
// 4. Where it does not, or none is sold, the data plan that works, when that
//    one keeps a good margin.
// 5. Where neither does, Unlimited anyway, else the data plan that works.
export function recommend({ days, uses, work }: { days: number; uses: Use[]; work: boolean }): QuizPlan {
  const perDay = perDayOf(uses, work);
  const len = PLAN_DAYS.find((d) => d >= days) ?? 30;
  const lenText = len === 1 ? '1 day' : `${len} days`;
  const lenShown = plural(len, '{n} day', '{n} days');
  const trip = { tripDays: Math.min(days, 30), needGb: Math.max(1, perDay * Math.min(days, 30) * 1.2) };
  if (uses.includes('hotspot') || perDay >= 4) {
    // Super User (10 GB a day) when a hotspot also carries work or streaming.
    const superUser = perDay >= 6;
    return { ...trip, tab: 'power', days: len, dailyGb: superUser ? 10 : 5, title: `${superUser ? 'Super User' : 'Power'}, ${lenText}`, shown: t('{a}, {b}', { a: t(superUser ? 'Super User' : 'Power'), b: lenShown }), line: t('Unlimited data for a van, hotspot or laptop.') };
  }
  return { ...trip, tab: 'unl', days: len, title: `Unlimited, ${lenText}`, shown: t('{a}, {b}', { a: t('Unlimited'), b: lenShown }), line: t('Use it as much as you like for the whole trip, never cut off.') };
}

// The quiz's plan, read by the next plan screen: the tab, the length, and
// the size (data) or the GB a day (Power) that pick the line. The first
// place that reads it claims it (`for`): that place can read it again (a
// screen mounts twice in the slide, and StrictMode runs an initialiser twice;
// owner 2026-11-06: "the quiz does not connect with a plan", the second read
// found nothing and the page opened on Data), while the next place opened
// finds nothing, so it never steers later destinations.
const KEY = 'ringo_quiz_pick';
export interface QuizPick { tab: PlanTab; days?: number; gb?: number; dailyGb?: number; quizId?: string }
export function setQuizPick(pick: QuizPick): void {
  const { tab, days, gb, dailyGb, quizId } = pick;
  try { sessionStorage.setItem(KEY, JSON.stringify({ tab, days, gb, dailyGb, quizId })); } catch { /* ignore */ }
}
export function takeQuizPick(forId: string): QuizPick | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (!v || !(v.tab === 'data' || v.tab === 'unl' || v.tab === 'power')) { sessionStorage.removeItem(KEY); return null; }
    if (typeof v.for === 'string' && v.for !== forId) { sessionStorage.removeItem(KEY); return null; }
    if (v.for !== forId) sessionStorage.setItem(KEY, JSON.stringify({ ...v, for: forId }));
    const num = (n: unknown) => (Number(n) > 0 ? Number(n) : undefined);
    return { tab: v.tab, days: num(v.days), gb: num(v.gb), dailyGb: num(v.dailyGb), quizId: typeof v.quizId === 'string' ? v.quizId : undefined };
  } catch { return null; }
}
/** The quiz's plan is spent: a later place opens on its own default. */
export function clearQuizPick(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

// The line for a quiz result at a place, by the rules above, so the quiz
// shows it with its price before the place is opened (owner 2026-11-10: "it
// should list a plan immediately"). The families are DestinationScreen's.
const daily = (p: Plan) => p.daily_gb ?? 0;
const isPower = (p: Plan) => (Boolean(p.app_only) || p.tier === 'unlimited') && daily(p) >= 5;
export function lineFor(cat: Catalog, rec: QuizPlan): Plan | null {
  const all = [...cat.plans, ...(cat.app_plans ?? [])].filter((p) => p.mode === 'payment');
  const byDays = (a: Plan, b: Plan) => a.days - b.days;
  const shortest = (list: Plan[], days: number) => { const s = [...list].sort(byDays); return s.find((p) => p.days >= days) ?? s[s.length - 1] ?? null; };
  const power = all.filter(isPower);
  if (rec.tab === 'power' && power.length) {
    const tiers = [...new Set(power.map(daily))].sort((a, b) => a - b);
    const gb = rec.dailyGb != null && tiers.includes(rec.dailyGb) ? rec.dailyGb : tiers[0];
    return shortest(power.filter((p) => daily(p) === gb), rec.days);
  }
  const passes = all.filter((p) => p.app_only && !isPower(p));
  const unlAll = passes.length ? passes : all.filter((p) => !p.app_only && p.tier === 'unlimited' && !isPower(p));
  const base = Math.min(...unlAll.map(daily));
  const unl = shortest(unlAll.filter((p) => daily(p) === base), rec.days);
  const data = all.filter((p) => !p.app_only && p.tier === 'data');
  const byPrice = (a: Plan, b: Plan) => a.billed_upfront_amount - b.billed_upfront_amount || a.days - b.days;
  const works = data.filter((p) => p.days >= rec.tripDays && (p.data_gb ?? 0) >= rec.needGb).sort(byPrice)[0] ?? null;
  if (unl?.good_margin) return unl;
  if (works?.good_margin) return works;
  // No data plan holds enough: the biggest that lasts the trip, else the cheapest sold.
  const closest = data.filter((p) => p.days >= rec.tripDays).sort((a, b) => (b.data_gb ?? 0) - (a.data_gb ?? 0) || byPrice(a, b))[0] ?? [...data].sort(byPrice)[0] ?? null;
  return unl ?? works ?? closest;
}
/** The pick that opens the plan screen on that very line. */
export function pickFor(line: Plan): QuizPick {
  if (isPower(line)) return { tab: 'power', days: line.days, dailyGb: line.daily_gb };
  if (line.app_only || line.tier === 'unlimited') return { tab: 'unl', days: line.days };
  return { tab: 'data', days: line.days, gb: line.data_gb ?? undefined };
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
