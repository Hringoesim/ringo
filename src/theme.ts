// theme.ts — Ringo theme system (real-app ready).
//
// Two palettes share one mutable token object `RC` (imported across the app).
// `applyTheme()` swaps the tokens + CSS variables + page background; the Host
// re-renders the tree so every inline style picks up the new values.
//
// DARK is the default — it matches ringoesim.com (near-black #0A0810 with the
// orange→magenta gradient). LIGHT is the warm vibrant alternative.

export type Scheme = 'dark' | 'light';

export interface Palette {
  scheme: Scheme;
  bg: string;
  paper: string;
  ink: string;
  inkStrong: string;
  inkMute: string;
  line: string;
  lineStrong: string;
  cream: string;
  cream2: string;
  grad: string;
  gradSoft: string;
  pink: string;
  /** translucent surface for sticky footers / sheets */
  glass: string;
  /** translucent surface for the tab bar */
  glassBar: string;
  /** ambient page background (around the device) */
  pageBg: string;
}

const DARK: Palette = {
  scheme: 'dark',
  bg: '#0A0810',
  paper: '#17121F',
  ink: '#FBEDE6',
  inkStrong: '#FF8A4C',
  inkMute: '#9C93A8',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.20)',
  cream: 'rgba(255,255,255,0.07)',
  cream2: 'rgba(255,255,255,0.15)',
  grad: 'linear-gradient(135deg,#FF7A2F 0%, #FB3E84 50%, #E92BA0 100%)',
  gradSoft: 'linear-gradient(135deg, rgba(255,122,47,0.20) 0%, rgba(233,43,160,0.20) 100%)',
  pink: '#FB3E84',
  glass: 'rgb(18,14,26)',
  glassBar: 'rgb(15,11,21)',
  pageBg:
    'radial-gradient(900px 600px at 18% 8%, rgba(255,122,47,0.12), transparent 60%),' +
    'radial-gradient(760px 520px at 86% 92%, rgba(233,43,160,0.14), transparent 60%), #07060C',
};

const LIGHT: Palette = {
  scheme: 'light',
  bg: '#FFF6EF',
  paper: '#FFFFFF',
  ink: '#3A1605',
  inkStrong: '#E5431A',
  inkMute: '#B25A2A',
  line: 'rgba(230,60,40,0.14)',
  lineStrong: 'rgba(230,60,40,0.24)',
  cream: '#FFE7D6',
  cream2: '#FCD4BE',
  grad: 'linear-gradient(135deg,#FF5E1E 0%, #F5337E 50%, #E6249A 100%)',
  gradSoft: 'linear-gradient(135deg, rgba(255,94,30,0.20) 0%, rgba(230,36,154,0.20) 100%)',
  pink: '#E6249A',
  glass: 'rgb(255,246,239)',
  glassBar: 'rgb(253,243,235)',
  pageBg:
    'radial-gradient(900px 600px at 18% 12%, rgba(255,94,30,0.16), transparent 60%),' +
    'radial-gradient(700px 500px at 88% 90%, rgba(230,36,154,0.16), transparent 60%), #FFF6EF',
};

export const THEMES: Record<Scheme, Palette> = { dark: DARK, light: LIGHT };

// The single mutable token object every component imports.
export const RC: Palette = { ...LIGHT };

export function applyTheme(name: Scheme): void {
  const p = THEMES[name];
  Object.assign(RC, p);
  if (typeof document !== 'undefined') {
    const root = document.documentElement.style;
    root.setProperty('--bg', p.bg);
    root.setProperty('--paper', p.paper);
    root.setProperty('--ink', p.ink);
    root.setProperty('--ink-strong', p.inkStrong);
    root.setProperty('--ink-mute', p.inkMute);
    document.body.style.background = p.pageBg;
    document.body.style.color = p.ink;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.bg);
  }
}

// Translate a hex color to an rgba() string with the given alpha.
export function hexA(hex: string, a: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Set the initial theme at module load so the first paint is correct.
applyTheme('light');
