// theme.ts — Ringo warm-toned design tokens (vibrant light).
// De-faded: crisp warm-white base, deep high-contrast text, a punchier
// electric sunset gradient (matching ringoesim.com's energy), and stronger
// borders/tints so accents read clearly. No black/grey UI.

export const RC = {
  bg: '#FFF6EF',          // crisp warm white
  paper: '#FFFFFF',       // pure-white cards for crisp contrast
  ink: '#3A1605',         // deep, high-contrast body text
  inkStrong: '#E5431A',   // punchy deep-orange accent / emphasis
  inkMute: '#B25A2A',     // richer muted (no longer faded)
  line: 'rgba(230,60,40,0.14)',
  lineStrong: 'rgba(230,60,40,0.24)',
  cream: '#FFE7D6',       // richer warm chip/tile background
  cream2: '#FCD4BE',
  grad: 'linear-gradient(135deg,#FF5E1E 0%, #F5337E 50%, #E6249A 100%)',
  gradSoft:
    'linear-gradient(135deg, rgba(255,94,30,0.20) 0%, rgba(230,36,154,0.20) 100%)',
  pink: '#E6249A',
} as const;

// Translate a hex color to an rgba() string with the given alpha.
export function hexA(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
