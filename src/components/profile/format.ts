// Small helpers the profile's pieces share.
import type { Profile } from '../../api/light';
import { t, fmtDate, plural as countOf } from '../../lib/i18n';

/** "Sep 2026" from an ISO date, in the app's language; empty when there is none. */
export function monthYear(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return fmtDate(d, { month: 'short', year: 'numeric' });
}

/** "3 countries": `one` and `many` are the English nouns, counted in the app's language. */
export function plural(n: number, one: string, many: string): string {
  return countOf(n, `{n} ${one}`, `{n} ${many}`);
}

// The colour of each Rewards level: the avatar ring, the card outline.
export const LEVEL_COLOR: Record<string, string> = {
  bronze: '#B8733A',
  silver: '#9AA4B1',
  gold: '#E2A923',
  diamond: '#3FB5DE',
  aurora: '#2FD39A',
};
export function levelColor(id: string | null | undefined): string {
  return LEVEL_COLOR[id || ''] || '#E8DDD6';
}

/** Gold for every Pioneer mark (fills and rings only, never text). */
export const PIONEER_GOLD = 'linear-gradient(135deg,#FFE79A 0%,#F4C64B 50%,#D9982A 100%)';
/** Dark brown that reads on the gold (over 7:1). */
export const PIONEER_INK = '#3A1A00';

type Pioneer = NonNullable<Profile['pioneer']>;

/** "Ringo Pioneer", or "Ringo Pioneer, Patron" for a backing rung. Never the Pioneer number. */
export function pioneerTitle(p: Pioneer): string {
  const tier = (p.tier || '').trim();
  return !tier || tier.toLowerCase() === 'pioneer' ? 'Ringo Pioneer' : `Ringo Pioneer, ${t(tier)}`;
}

/** The Pioneer's own reward, in the words the website's dashboard uses. */
export function pioneerPerk(p: Pioneer): string {
  return p.kind === 'global' ? t('{amount} off your first Ringo bill', { amount: `€${p.credit_eur || 5}` }) : t('Founding pricing locked in');
}
