// theme.ts — Ringo warm-toned design tokens (no black/grey UI).
// Mirrors the CSS variables in index.css so inline styles and CSS stay in sync.
// The sunset gradient (#F08038 → #F25F77 → #ED4D8E) is the single hero accent,
// used surgically on primary CTAs, the active-number card and ambient blobs.

export const RC = {
  bg: '#FEF8F4',
  paper: '#FFFDFB',
  ink: '#5C2A0E',
  inkStrong: '#D05000',
  inkMute: '#9A6B4A',
  line: 'rgba(208,80,0,0.10)',
  lineStrong: 'rgba(208,80,0,0.18)',
  cream: '#F8EBDD',
  cream2: '#F2DDC8',
  grad: 'linear-gradient(135deg,#F08038 0%, #F25F77 50%, #ED4D8E 100%)',
  gradSoft:
    'linear-gradient(135deg, rgba(240,128,56,0.16) 0%, rgba(237,77,142,0.16) 100%)',
  pink: '#ED4D8E',
} as const;

// Translate a hex color to an rgba() string with the given alpha.
export function hexA(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
