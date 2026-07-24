// theme.ts — Ringo theme system (real-app ready).
//
// Two palettes share one mutable token object `RC` (imported across the app).
// `applyTheme()` swaps the tokens + CSS variables + page background; the Host
// re-renders the tree so every inline style picks up the new values.
//
// DARK is the default — it matches ringoesim.com (near-black #0A0810 with the
// orange→magenta gradient). LIGHT is the warm vibrant alternative.

import type { CSSProperties } from 'react';

export type Scheme = 'dark' | 'light';

// ── Liquid Glass (iOS 26) material ───────────────────────────────────────────
// Translucent, blurred, with a bright specular top edge and a soft float shadow.
// Spread onto floating controls (tab bar, toolbars, pills) so content refracts
// through them the way iOS 26 surfaces do.
export const GLASS: CSSProperties = {
  background: 'rgba(255,250,253,0.62)',
  backdropFilter: 'blur(24px) saturate(185%)',
  WebkitBackdropFilter: 'blur(24px) saturate(185%)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 12px 34px -12px rgba(52,28,84,0.24)',
};
// A lighter glass for inline chips / smaller controls.
export const GLASS_THIN: CSSProperties = {
  background: 'rgba(255,250,253,0.55)',
  backdropFilter: 'blur(16px) saturate(170%)',
  WebkitBackdropFilter: 'blur(16px) saturate(170%)',
  border: '1px solid rgba(255,255,255,0.5)',
};

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
  /** deeper sunset-into-dusk — reserved for the single hero surface */
  gradDeep: string;
  pink: string;
  /** translucent surface for sticky footers / sheets */
  glass: string;
  /** translucent surface for the tab bar */
  glassBar: string;
  /** ambient page background (around the device) */
  pageBg: string;
}

// Elevation — depth comes from soft plum-tinted shadows, not color (a cool
// tint keeps whites crisp; brown-tinted shadows made the whole app look tan).
// Buttons get a tighter, slightly stronger lift; "raised" is for selected
// surfaces; the hero gets a deeper violet lift.
export const SHADOW_CARD = '0 1px 2px rgba(52,28,84,0.04), 0 12px 28px -20px rgba(52,28,84,0.16)';
export const SHADOW_BUTTON = '0 1px 2px rgba(52,28,84,0.05), 0 8px 18px -8px rgba(52,28,84,0.24)';
export const SHADOW_RAISED = '0 2px 6px rgba(52,28,84,0.07), 0 16px 34px -18px rgba(52,28,84,0.22)';
export const SHADOW_HERO = '0 18px 40px -20px rgba(134,82,224,0.5)';

// One corner-radius scale — every surface picks from these, not ad-hoc values.
export const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;

// The signature spring + the standard iOS ease-out, named once so motion is
// consistent everywhere (chips, tiles, sheets, progress bars).
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

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
  gradDeep:
    'radial-gradient(130% 150% at 12% 8%, rgba(255,178,98,0.55) 0%, rgba(255,178,98,0) 46%),' +
    'linear-gradient(135deg, #E45E37 0%, #C4497F 52%, #7E3A73 100%)',
  pink: '#FB3E84',
  glass: 'rgb(18,14,26)',
  glassBar: 'rgb(15,11,21)',
  pageBg:
    'radial-gradient(900px 600px at 18% 8%, rgba(255,122,47,0.12), transparent 60%),' +
    'radial-gradient(760px 520px at 86% 92%, rgba(233,43,160,0.14), transparent 60%), #07060C',
};

const LIGHT: Palette = {
  scheme: 'light',
  bg: '#FFFFFF', // white
  paper: '#FFFFFF', // cards (separated from bg by hairline + shadow)
  ink: '#211A2E', // near-black with a plum cast — crisp, no espresso brown
  inkStrong: '#F26122', // vivid brand orange for links / small accents
  inkMute: '#8D8499', // mauve-gray secondary text (no taupe)
  line: 'rgba(33,26,46,0.08)', // cool neutral hairline
  lineStrong: 'rgba(33,26,46,0.14)',
  cream: '#FBF1F7', // blush pink for soft chips/tiles (was sand)
  cream2: '#F3E7F6', // lavender blush
  // The full vivid sunset — brand orange → hot pink → purple.
  grad: 'linear-gradient(135deg, #F26122 0%, #FF42A1 52%, #8652E0 100%)',
  gradSoft: 'linear-gradient(135deg, rgba(242,97,34,0.12) 0%, rgba(134,82,224,0.10) 100%)',
  gradDeep:
    'radial-gradient(130% 150% at 12% 8%, #FFB262 0%, rgba(255,178,98,0) 46%),' +
    'linear-gradient(135deg, #F26122 0%, #E23A8E 52%, #8652E0 100%)',
  pink: '#FF42A1', // brand hot pink
  glass: 'rgb(253,248,252)',
  glassBar: 'rgb(252,247,251)',
  // Pink glow up top, a violet whisper in the corner, clean white base.
  pageBg:
    'radial-gradient(1100px 720px at 50% -12%, rgba(255,66,161,0.05), transparent 55%),' +
    'radial-gradient(760px 560px at 88% 108%, rgba(134,82,224,0.04), transparent 60%), #FFFFFF',
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
    root.setProperty('--line', p.line);
    root.setProperty('--line-strong', p.lineStrong);
    root.setProperty('--grad', p.grad);
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
