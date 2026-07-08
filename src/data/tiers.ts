import type { Tier } from './types';

// Membership ladder — everyone starts Amber. Score = countries connected this year.
// (Named for warm colours, not carriers — "Orange" is a trademarked network.)
export const TIERS: Tier[] = [
  { id: 'amber',   name: 'Amber',   min: 0,  c1: '#F4A93B', c2: '#F0792E', glow: 'rgba(240,128,56,0.5)',  perk: 'Unlimited data · 180+ countries' },
  { id: 'coral',   name: 'Coral',   min: 6,  c1: '#FF8A6B', c2: '#F8506B', glow: 'rgba(248,80,96,0.5)',   perk: '+1 free local number · faster cap' },
  { id: 'crimson', name: 'Crimson', min: 15, c1: '#F8506B', c2: '#C42B6B', glow: 'rgba(196,43,107,0.5)',  perk: 'Airport lounge passes · priority support' },
  { id: 'aurora',  name: 'Aurora',  min: 30, c1: '#B36BFF', c2: '#F8506B', glow: 'rgba(179,107,255,0.5)', perk: 'Free partner upgrades · 24/7 concierge' },
];

// Pioneer — a special founding membership, granted by a Pioneer code (not by
// score). It's the top, exclusive status; Pioneers STILL climb the rank ladder
// above (Orange → Coral → …), so it layers over `tierFor`.
export const PIONEER_TIER: Tier = {
  id: 'pioneer',
  name: 'Pioneer',
  min: 0,
  c1: '#F0733A',
  c2: '#7E3A73',
  glow: 'rgba(126,58,115,0.55)',
  perk: 'Founding member — locked-in pricing & every perk',
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

// Default user profile — real data only: Hippolyte, home market Belgium,
// 1 country connected so far. Stats grow only from genuine activity.
export const USER = {
  name: 'Hippolyte',
  score: 1,
  dataPct: 0,
  countries: 1,
  currentCountry: 'BE',
};
