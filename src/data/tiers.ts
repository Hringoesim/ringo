import type { Tier } from './types';

// ── Membership ladder ────────────────────────────────────────────────────────
//
// This used to score on "countries connected this year" and reward the top
// rungs with bonus data, lounge passes and a concierge. That was backwards on
// both sides: visiting more countries is the behaviour that COSTS Ringo the
// most (more data, more networks), so paying for it with more data compounded
// the loss — and a two-person company at 41% margin cannot hand out lounge
// passes or staff a 24/7 concierge, so those were promises to paying customers
// that could not be kept.
//
// It now scores on PAID MONTHS, because that is the number the P&L is least
// sure of (renewal is assumed 40% and unproven).
//
// The rungs pay in RECOGNITION AND ACCESS — never money. No credit, no
// discount, no free data: Ringo does not buy loyalty back with its own
// margin. Everything promised here is something two people can actually
// deliver on the day a customer asks for it.
export const TIERS: Tier[] = [
  { id: 'amber',   name: 'Amber',   min: 0,  c1: '#FFB53E', c2: '#FF5D2E', glow: 'rgba(255,109,46,0.45)', perk: 'Data in 180+ countries, one allowance' },
  { id: 'coral',   name: 'Coral',   min: 6,  c1: '#FF7E5F', c2: '#FF4778', glow: 'rgba(255,71,120,0.45)', perk: 'Priority support — you go to the front of the queue' },
  { id: 'crimson', name: 'Crimson', min: 12, c1: '#FF4778', c2: '#D6247E', glow: 'rgba(214,36,126,0.45)', perk: 'Early access to new countries and features' },
  { id: 'aurora',  name: 'Aurora',  min: 24, c1: '#8652E0', c2: '#FF42A1', glow: 'rgba(134,82,224,0.45)', perk: 'A direct line to the founders — help shape what ships next' },
];

/** What each rung is measured in — used for the "N more to unlock" line. */
export const SCORE_UNIT = { one: 'paid month', many: 'paid months' };

// Pioneer — the founding membership, granted by a Pioneer code rather than
// earned. Pioneers still climb the ladder underneath.
export const PIONEER_TIER: Tier = {
  id: 'pioneer',
  name: 'Pioneer',
  min: 0,
  c1: '#F0733A',
  c2: '#7E3A73',
  glow: 'rgba(126,58,115,0.55)',
  perk: 'Founding member — your price is locked for life',
};

export function tierFor(score: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (score >= x.min) t = x;
  return t;
}

/** The membership shown to the user: Pioneers show "Pioneer" (their rank still
 *  climbs underneath); everyone else shows their current rank. */
export function membershipFor(score: number, pioneer: boolean): Tier {
  return pioneer ? PIONEER_TIER : tierFor(score);
}

export function nextTier(score: number): Tier | null {
  return TIERS.find((x) => x.min > score) ?? null;
}

/** Whole months paid since the subscription started. This IS the score. */
export function paidMonths(subscribedAt: string | null): number {
  if (!subscribedAt) return 0;
  const start = new Date(subscribedAt).getTime();
  if (!Number.isFinite(start)) return 0;
  const days = (Date.now() - start) / 86400000;
  return Math.max(0, Math.floor(days / 30));
}

// Default profile — real data only. Stats grow from genuine activity.
export const USER = {
  name: 'Hippolyte',
  score: 0,
  dataPct: 0,
  countries: 1,
  currentCountry: 'BE',
};
