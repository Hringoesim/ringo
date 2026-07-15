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

// Elevation — depth comes from soft warm shadows, not color. Cards float on the
// warm canvas; the hero gets a deeper, dusk-tinted lift. Buttons get a tighter,
// slightly stronger lift; a "raised" token is used for selected/active surfaces.
export const SHADOW_CARD = '0 1px 2px rgba(34,26,20,0.05), 0 12px 28px -20px rgba(34,26,20,0.18)';
export const SHADOW_BUTTON = '0 1px 2px rgba(34,26,20,0.06), 0 8px 18px -8px rgba(34,26,20,0.26)';
export const SHADOW_RAISED = '0 2px 6px rgba(34,26,20,0.08), 0 16px 34px -18px rgba(34,26,20,0.24)';
export const SHADOW_HERO = '0 18px 40px -20px rgba(126,58,115,0.55)';

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
  ink: '#221A14', // deep warm espresso (kills the muddy brown)
  inkStrong: '#CE4A1E', // burnt-sunset ember for links / small accents
  inkMute: '#82715F', // warm taupe-gray secondary text
  line: 'rgba(34,26,20,0.08)', // NEUTRAL warm hairline (no pink tint)
  lineStrong: 'rgba(34,26,20,0.14)',
  cream: '#F4ECE2', // muted warm sand for soft chips/tiles
  cream2: '#EADFD1',
  // The refined sunset — orange → coral → plum, dropping the neon magenta.
  grad: 'linear-gradient(135deg, #FF8A3D 0%, #F0566B 48%, #C74B8E 100%)',
  gradSoft: 'linear-gradient(135deg, rgba(255,138,61,0.12) 0%, rgba(199,75,142,0.10) 100%)',
  gradDeep:
    'radial-gradient(130% 150% at 12% 8%, #FFB262 0%, rgba(255,178,98,0) 46%),' +
    'linear-gradient(135deg, #E45E37 0%, #C4497F 52%, #7E3A73 100%)',
  pink: '#C74B8E', // deep orchid (was neon magenta)
  glass: 'rgb(247,242,236)',
  glassBar: 'rgb(244,239,233)',
  // One soft warm glow up top, a plum whisper in the corner, neutral warm base.
  pageBg:
    'radial-gradient(1100px 720px at 50% -12%, rgba(255,138,61,0.04), transparent 55%),' +
    'radial-gradient(760px 560px at 88% 108%, rgba(199,75,142,0.03), transparent 60%), #FFFFFF',
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
