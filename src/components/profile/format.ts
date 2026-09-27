// Small helpers the profile's pieces share.
import { BRAND } from '../../theme';

/** "Sep 2026" from an ISO date; empty when there is none. */
export function monthYear(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Each rung of the ladder wears one of the site's brand swatches, warming
// from amber to the aurora violet as the months add up.
export const TIER_TINT: Record<string, string> = {
  amber: BRAND.amber,
  coral: BRAND.orange,
  crimson: BRAND.pink,
  aurora: BRAND.violet,
};
export function tintFor(id: string | null | undefined): string {
  return TIER_TINT[id || ''] || BRAND.amber;
}
