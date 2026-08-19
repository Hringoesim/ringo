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
  // Same orange -> amber signature as the site, lifted for a dark ground.
  grad: 'linear-gradient(135deg,#FF6A2A 0%, #FF8A3D 52%, #FFB83D 100%)',
  gradSoft: 'linear-gradient(135deg, rgba(255,106,42,0.20) 0%, rgba(255,184,61,0.20) 100%)',
  gradDeep:
    'radial-gradient(130% 150% at 12% 8%, rgba(255,184,61,0.55) 0%, rgba(255,184,61,0) 46%),' +
    'linear-gradient(135deg, #D9511F 0%, #C4642A 52%, #7A4420 100%)',
  pink: '#FB3E84',
  glass: 'rgb(18,14,26)',
  glassBar: 'rgb(15,11,21)',
  pageBg:
    'radial-gradient(900px 600px at 18% 8%, rgba(255,106,42,0.12), transparent 60%),' +
    'radial-gradient(760px 520px at 86% 92%, rgba(255,184,61,0.12), transparent 60%), #07060C',
};

const LIGHT: Palette = {
  scheme: 'light',
  // Tokens lifted from ringoesim.com so the app and the site are one brand.
  // The site's own CSS variables: --bg #fffaf7, --bg2 #fef3ee, --ink #1a0f2e,
  // --ink2 #4a3f60, --ink3 #8b7fa8, --bdr #1a0f2e1a, --or #ff5724,
  // --pk #ff42a1, --pu #8652e0, --grad orange -> amber.
  bg: '#FFFAF7', // warm off-white, not pure white
  paper: '#FFFFFF',
  ink: '#1A0F2E', // deep plum-black
  inkStrong: '#FF5724', // brand orange
  inkMute: '#8B7FA8', // mauve secondary
  line: 'rgba(26,15,46,0.10)',
  lineStrong: 'rgba(26,15,46,0.16)',
  cream: '#FEF3EE', // warm peach tint (the site's --bg2)
  cream2: '#FDE7DC', // one step deeper, same warmth
  // The site's primary gradient is orange into amber — no pink or purple.
  grad: 'linear-gradient(135deg, #F93C1F 0%, #FF7733 52%, #FFB83D 100%)',
  gradSoft: 'linear-gradient(135deg, rgba(249,60,31,0.12) 0%, rgba(255,184,61,0.12) 100%)',
  gradDeep:
    'radial-gradient(130% 150% at 12% 8%, rgba(255,184,61,0.55) 0%, rgba(255,184,61,0) 46%),' +
    'linear-gradient(135deg, #F93C1F 0%, #FF7733 52%, #FFB83D 100%)',
  pink: '#FF42A1', // kept as an accent (the site's --pk)
  glass: 'rgb(255,250,247)',
  glassBar: 'rgb(254,247,242)',
  pageBg:
    'radial-gradient(1100px 720px at 50% -12%, rgba(255,87,36,0.06), transparent 55%),' +
    'radial-gradient(760px 560px at 88% 108%, rgba(255,184,61,0.06), transparent 60%), #FFFAF7',
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
