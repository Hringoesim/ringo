// The data quiz's arithmetic (owner 2026-10-27, "how much data do I need").
// Rough daily use per activity, in GB, the way travel eSIM guides size it:
// maps and messages are light, social and photos moderate, calls and
// streaming heavy, a hotspot heaviest. The answer is a plan type, never a
// promise about the network.

export type Use = 'maps' | 'social' | 'calls' | 'streaming' | 'hotspot';
export type PlanTab = 'data' | 'unl' | 'power';

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

export function recommend({ days, uses, work }: { days: number; uses: Use[]; work: boolean }): { tab: PlanTab; title: string; line: string } {
  const perDay = uses.reduce((n, u) => n + (USES.find((x) => x.id === u)?.gbDay || 0), 0) + (work ? 1 : 0);
  if (uses.includes('hotspot') || perDay >= 4) {
    return { tab: 'power', title: 'A Power plan', line: 'Plenty of data every day for a hotspot, a van or a laptop, on a mobile connection that is safer than public Wi-Fi.' };
  }
  if (perDay >= 1.5 || (perDay >= 1 && days > 7)) {
    return { tab: 'unl', title: 'Unlimited', line: 'Use it as much as you like for the whole trip, never cut off.' };
  }
  const need = Math.max(1, perDay * days * 1.2);
  const size = DATA_SIZES.find((g) => g >= need) ?? 50;
  return { tab: 'data', title: `About ${size} GB`, line: `A ${size} GB data plan should cover ${days <= 3 ? 'a few days' : days <= 7 ? 'a week' : days <= 14 ? 'two weeks' : 'a month'} of ${uses.length ? 'what you picked' : 'light use'}, with some to spare. You can add more any time.` };
}

// The quiz's answer, read once by the plan screen to open on that tab.
const KEY = 'ringo_quiz_pick';
export function setQuizPick(tab: PlanTab): void {
  try { sessionStorage.setItem(KEY, tab); } catch { /* ignore */ }
}
export function takeQuizPick(): PlanTab | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'data' || v === 'unl' || v === 'power' ? v : null;
  } catch { return null; }
}
