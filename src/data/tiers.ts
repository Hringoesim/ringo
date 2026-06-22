import type { Tier } from './types';

// Membership ladder — everyone starts Orange. Score = countries connected this year.
export const TIERS: Tier[] = [
  { id: 'orange',  name: 'Orange',  min: 0,  c1: '#F4A93B', c2: '#F0792E', glow: 'rgba(240,128,56,0.5)',  perk: 'Unlimited data · 180+ countries' },
  { id: 'coral',   name: 'Coral',   min: 6,  c1: '#FF8A6B', c2: '#F8506B', glow: 'rgba(248,80,96,0.5)',   perk: '+1 free local number · faster cap' },
  { id: 'crimson', name: 'Crimson', min: 15, c1: '#F8506B', c2: '#C42B6B', glow: 'rgba(196,43,107,0.5)',  perk: 'Airport lounge passes · priority support' },
  { id: 'aurora',  name: 'Aurora',  min: 30, c1: '#B36BFF', c2: '#F8506B', glow: 'rgba(179,107,255,0.5)', perk: 'Free partner upgrades · 24/7 concierge' },
];

export function tierFor(score: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (score >= x.min) t = x;
  return t;
}

export function nextTier(score: number): Tier | null {
  return TIERS.find((x) => x.min > score) ?? null;
}

// Default user profile — Marie, a recurring crosser at 4 countries this year.
// Anchored in the UK launch market.
export const USER = {
  name: 'Marie',
  score: 4,
  dataPct: 0.34,
  countries: 4,
  currentCountry: 'GB',
};
