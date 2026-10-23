// Small helpers the profile's pieces share.
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
