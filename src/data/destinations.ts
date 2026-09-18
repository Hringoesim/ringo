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
  /** the store section a country sits in (from the site's catalogue) */
  region?: string | null;
}

/** The tiles at the top of the store, in order: the plans that cover many countries. */
export const FEATURED = ['global', 'europe', 'usa', 'asia', 'latam', 'middle-east'];

/** The ISO 3166-1 alpha-2 code as its flag emoji. */
export function flagOf(iso: string | null | undefined): string {
  const s = String(iso || '').toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? String.fromCodePoint(...[...s].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
}

/** Only the destinations bundled with a photograph; the rest get a gradient. */
export function hasPicture(id: string): boolean {
  return [...REGIONS, ...COUNTRIES].some((d) => d.id === id);
}

// The five plans Ringo sells (owner 2026-09-13: Global or a region, nothing
// else). Every other destination is listed too and sells the plan that
// covers it, which the site resolves (a French trip buys the Europe plan,
// a Canadian one the Global plan).
export const REGIONS: Destination[] = [
  { id: 'global', label: 'Global', kind: 'region', countries: 133 },
  { id: 'europe', label: 'Europe', kind: 'region', countries: 37 },
  { id: 'asia', label: 'Asia', kind: 'region', countries: 19 },
  { id: 'latam', label: 'Latin America', kind: 'region', countries: 18 },
  { id: 'middle-east', label: 'Middle East', kind: 'region', countries: 12 },
];

export const COUNTRIES: Destination[] = [
  { id: 'usa', label: 'United States', kind: 'country', countries: 1, flag: '🇺🇸' },
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

/**
 * The destination's photograph: the website's own file, so the app and the
 * site show the same picture for the same place (owner 2026-09-18: "use the
 * same UI as on the website to gain trust"). The 35 bundled pictures stay
 * as the offline stand-in.
 */
export const SITE_PICTURES = 'https://ringoesim.com/img/data-esims';
export function pictureFor(id: string): string {
  return `${SITE_PICTURES}/${id}.jpg`;
}
export function bundledPictureFor(id: string): string | null {
  return hasPicture(id) ? `${import.meta.env.BASE_URL}img/destinations/${id}.jpg` : null;
}

// The website's sunset skies behind a picture while it loads (and where a
// photograph is missing), picked by name so a hundred countries do not read
// as one orange wall.
const SKIES = [
  'linear-gradient(135deg,hsl(8,95%,55%),hsl(20,100%,60%),hsl(38,100%,62%))',
  'linear-gradient(135deg,hsl(20,100%,58%),hsl(38,100%,60%),hsl(46,100%,64%))',
  'linear-gradient(135deg,hsl(330,90%,58%),hsl(14,100%,57%),hsl(28,100%,62%))',
  'linear-gradient(135deg,hsl(262,70%,58%),hsl(300,70%,58%),hsl(330,100%,63%))',
];
export function skyFor(id: string): string {
  return SKIES[[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % SKIES.length];
}
