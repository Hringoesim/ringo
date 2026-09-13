// destinations.ts — the Ringo Light catalogue as the app lists it. The
// website's api/_light-catalog.js is the single source of what is sold and
// for how much; this file only mirrors the destination LIST (id, label, kind)
// so the store renders instantly with its bundled pictures, before the live
// prices arrive from /api/esim-plans?summary=1. Adding a destination on the
// site means adding a line here (and its picture) for the app to show it.
export type DestinationKind = 'region' | 'country';

export interface Destination {
  id: string;
  label: string;
  kind: DestinationKind;
  /** number of countries the plan works in */
  countries: number;
  /** ISO flag emoji for country tiles (regions use a picture only) */
  flag?: string;
}

export const REGIONS: Destination[] = [
  { id: 'europe', label: 'Europe', kind: 'region', countries: 37 },
  { id: 'usa', label: 'United States', kind: 'region', countries: 1, flag: '🇺🇸' },
  { id: 'asia', label: 'Asia', kind: 'region', countries: 19 },
  { id: 'latam', label: 'Latin America', kind: 'region', countries: 18 },
  { id: 'middle-east', label: 'Middle East', kind: 'region', countries: 12 },
  { id: 'global', label: 'Global', kind: 'region', countries: 133 },
];

export const COUNTRIES: Destination[] = [
  { id: 'australia', label: 'Australia', kind: 'country', countries: 1, flag: '🇦🇺' },
  { id: 'brazil', label: 'Brazil', kind: 'country', countries: 1, flag: '🇧🇷' },
  { id: 'canada', label: 'Canada', kind: 'country', countries: 1, flag: '🇨🇦' },
  { id: 'china', label: 'China', kind: 'country', countries: 1, flag: '🇨🇳' },
  { id: 'colombia', label: 'Colombia', kind: 'country', countries: 1, flag: '🇨🇴' },
  { id: 'egypt', label: 'Egypt', kind: 'country', countries: 1, flag: '🇪🇬' },
  { id: 'france', label: 'France', kind: 'country', countries: 1, flag: '🇫🇷' },
  { id: 'germany', label: 'Germany', kind: 'country', countries: 1, flag: '🇩🇪' },
  { id: 'greece', label: 'Greece', kind: 'country', countries: 1, flag: '🇬🇷' },
  { id: 'iceland', label: 'Iceland', kind: 'country', countries: 1, flag: '🇮🇸' },
  { id: 'india', label: 'India', kind: 'country', countries: 1, flag: '🇮🇳' },
  { id: 'indonesia', label: 'Indonesia', kind: 'country', countries: 1, flag: '🇮🇩' },
  { id: 'italy', label: 'Italy', kind: 'country', countries: 1, flag: '🇮🇹' },
  { id: 'japan', label: 'Japan', kind: 'country', countries: 1, flag: '🇯🇵' },
  { id: 'malaysia', label: 'Malaysia', kind: 'country', countries: 1, flag: '🇲🇾' },
  { id: 'mexico', label: 'Mexico', kind: 'country', countries: 1, flag: '🇲🇽' },
  { id: 'morocco', label: 'Morocco', kind: 'country', countries: 1, flag: '🇲🇦' },
  { id: 'new-zealand', label: 'New Zealand', kind: 'country', countries: 1, flag: '🇳🇿' },
  { id: 'portugal', label: 'Portugal', kind: 'country', countries: 1, flag: '🇵🇹' },
  { id: 'singapore', label: 'Singapore', kind: 'country', countries: 1, flag: '🇸🇬' },
  { id: 'south-africa', label: 'South Africa', kind: 'country', countries: 1, flag: '🇿🇦' },
  { id: 'south-korea', label: 'South Korea', kind: 'country', countries: 1, flag: '🇰🇷' },
  { id: 'spain', label: 'Spain', kind: 'country', countries: 1, flag: '🇪🇸' },
  { id: 'switzerland', label: 'Switzerland', kind: 'country', countries: 1, flag: '🇨🇭' },
  { id: 'thailand', label: 'Thailand', kind: 'country', countries: 1, flag: '🇹🇭' },
  { id: 'turkey', label: 'Turkey', kind: 'country', countries: 1, flag: '🇹🇷' },
  { id: 'uae', label: 'UAE', kind: 'country', countries: 1, flag: '🇦🇪' },
  { id: 'united-kingdom', label: 'United Kingdom', kind: 'country', countries: 1, flag: '🇬🇧' },
  { id: 'vietnam', label: 'Vietnam', kind: 'country', countries: 1, flag: '🇻🇳' },
];

export const DESTINATIONS: Destination[] = [...REGIONS, ...COUNTRIES];

export function destinationById(id: string | null | undefined): Destination | null {
  if (!id) return null;
  return DESTINATIONS.find((d) => d.id === id) || null;
}

/** Bundled picture (800x450) for a destination card. */
export function pictureFor(id: string): string {
  return `${import.meta.env.BASE_URL}img/destinations/${id}.jpg`;
}
