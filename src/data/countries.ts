import type { Country } from './types';

// UK is the launch number-market; Spain/Germany/Ireland/Netherlands are the EU
// MNP markets in scope (Workstream A, p9–13, via the 1GLOBAL Connect API).
// The remaining entries are global *data* destinations (the eSIM roams globally;
// numbers are UK/EU only).
export const COUNTRIES: Country[] = [
  {
    code: 'GB', name: 'United Kingdom', capital: 'London', flag: '🇬🇧', region: 'Europe',
    tier: 'A', popular: true, dial: 44, numberMarket: true,
    mnp: { regulator: 'Ofcom', flow: 'donor-led', needsPac: true, sla: 'Within 1 business day (PAC submitted before 4pm)' },
  },
  {
    code: 'IE', name: 'Ireland', capital: 'Dublin', flag: '🇮🇪', region: 'Europe',
    tier: 'A', popular: true, dial: 353, numberMarket: true,
    mnp: { regulator: 'ComReg', flow: 'recipient-led', needsPac: false, sla: 'Completes within ~2 hours' },
  },
  {
    code: 'ES', name: 'Spain', capital: 'Madrid', flag: '🇪🇸', region: 'Europe',
    tier: 'A', popular: true, dial: 34, numberMarket: true,
    mnp: { regulator: 'AOPM', flow: 'recipient-led', needsPac: false, sla: 'Within 1 business day (before 2pm)' },
  },
  {
    code: 'DE', name: 'Germany', capital: 'Berlin', flag: '🇩🇪', region: 'Europe',
    tier: 'A', popular: true, dial: 49, numberMarket: true,
    mnp: { regulator: 'Bundesnetzagentur', flow: 'recipient-led', needsPac: false, sla: 'Up to 6 business days' },
  },
  {
    code: 'NL', name: 'Netherlands', capital: 'Amsterdam', flag: '🇳🇱', region: 'Europe',
    tier: 'A', popular: true, dial: 31, numberMarket: true,
    mnp: { regulator: 'ACM', flow: 'recipient-led', needsPac: false, sla: 'Completes almost immediately' },
  },
  // Global data destinations (roaming) — no local number market.
  { code: 'US', name: 'United States', capital: 'Washington', flag: '🇺🇸', region: 'Americas', tier: 'A', popular: true, dial: 1 },
  { code: 'JP', name: 'Japan',     capital: 'Tokyo',       flag: '🇯🇵', region: 'Asia',        tier: 'A', popular: true, dial: 81 },
  { code: 'PT', name: 'Portugal',  capital: 'Lisbon',      flag: '🇵🇹', region: 'Europe',      tier: 'A', dial: 351 },
  { code: 'AE', name: 'UAE',       capital: 'Abu Dhabi',   flag: '🇦🇪', region: 'Middle East', tier: 'A', dial: 971 },
  { code: 'SG', name: 'Singapore', capital: 'Singapore',   flag: '🇸🇬', region: 'Asia',        tier: 'A', dial: 65 },
];

export const CO_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

/** Markets where Ringo can allocate or port a local number. */
export const NUMBER_MARKETS: Country[] = COUNTRIES.filter((c) => c.numberMarket);

// Dial code for a country code (falls back to +44, the launch market).
export function dial(code: string): number {
  return CO_BY_CODE[code]?.dial ?? 44;
}
