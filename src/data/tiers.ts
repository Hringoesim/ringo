import type { Tier } from './types';

// Membership ladder — everyone starts Amber. Score = countries connected this year.
// (Named for warm colours, not carriers — "Orange" is a trademarked network.)
export const TIERS: Tier[] = [
  { id: 'amber',   name: 'Amber',   min: 0,  c1: '#FFB53E', c2: '#FF5D2E', glow: 'rgba(255,109,46,0.45)', perk: 'Unlimited data · 180+ countries' },
  { id: 'coral',   name: 'Coral',   min: 6,  c1: '#FF7E5F', c2: '#FF4778', glow: 'rgba(255,71,120,0.45)', perk: '+1 free local number · faster cap' },
  { id: 'crimson', name: 'Crimson', min: 15, c1: '#FF4778', c2: '#D6247E', glow: 'rgba(214,36,126,0.45)', perk: 'Airport lounge passes · priority support' },
  { id: 'aurora',  name: 'Aurora',  min: 30, c1: '#8652E0', c2: '#FF42A1', glow: 'rgba(134,82,224,0.45)', perk: 'Free partner upgrades · 24/7 concierge' },
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
