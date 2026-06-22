import type { Country } from './types';

// Sample destinations: nomad hubs (Lisbon, Bangkok, Mexico City), business
// corridors (Dubai, Singapore) and the founder's home (Belgium) for authenticity.
export const COUNTRIES: Country[] = [
  { code: 'JP', name: 'Japan',     capital: 'Tokyo',       flag: '🇯🇵', region: 'Asia',        tier: 'A', popular: true, dial: 81 },
  { code: 'PT', name: 'Portugal',  capital: 'Lisbon',      flag: '🇵🇹', region: 'Europe',      tier: 'A', popular: true, dial: 351 },
  { code: 'AE', name: 'UAE',       capital: 'Abu Dhabi',   flag: '🇦🇪', region: 'Middle East', tier: 'A', popular: true, dial: 971 },
  { code: 'MX', name: 'Mexico',    capital: 'Mexico City', flag: '🇲🇽', region: 'Americas',    tier: 'B', popular: true, dial: 52 },
  { code: 'TH', name: 'Thailand',  capital: 'Bangkok',     flag: '🇹🇭', region: 'Asia',        tier: 'B', popular: true, dial: 66 },
  { code: 'BE', name: 'Belgium',   capital: 'Brussels',    flag: '🇧🇪', region: 'Europe',      tier: 'A', dial: 32 },
  { code: 'US', name: 'USA',       capital: 'Washington',  flag: '🇺🇸', region: 'Americas',    tier: 'A', popular: true, dial: 1 },
  { code: 'SG', name: 'Singapore', capital: 'Singapore',   flag: '🇸🇬', region: 'Asia',        tier: 'A', dial: 65 },
];

export const CO_BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

// Dial code for a country code (falls back to +1).
export function dial(code: string): number {
  return CO_BY_CODE[code]?.dial ?? 1;
}
