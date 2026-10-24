// theme.ts — Ringo theme system (real-app ready).
//
// Two palettes share one mutable token object `RC` (imported across the app).
// `applyTheme()` swaps the tokens + CSS variables + page background; the Host
// re-renders the tree so every inline style picks up the new values.
//
// LIGHT is the default and the brand: ringoesim.com is light only (warm cream
// #FFFAF7, plum ink #1A0F2E, orange/pink/purple accents). DARK is an optional
// user setting with contrast-checked values; the site itself has no dark mode.
//
// Contrast rules (WCAG 2.x): body text 7:1 or more, secondary text 4.5:1 or
// more, icons and other marks 3:1 or more. Orange #FF5724 (inkStrong) is a FILL
// colour (3.05:1 on cream): use RC.orangeInk for any orange TEXT.

import type { CSSProperties } from 'react';

export type Scheme = 'dark' | 'light';

// ── Liquid Glass (iOS 26) material ───────────────────────────────────────────
// Translucent, blurred, with a bright specular top edge and a soft float shadow.
// Spread onto floating controls (tab bar, toolbars, pills) so content refracts
// through them the way iOS 26 surfaces do.
export const GLASS: CSSProperties = {
  background: 'rgba(255,250,247,0.86)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(26,15,46,0.10)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 12px 34px -12px rgba(26,15,46,0.24)',
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
  /** Brand orange as a FILL / icon / selected border. Not for text (3.05:1). */
  inkStrong: string;
  /** Captions and meta text (6.1:1 on cream). */
  inkMute: string;
  /** Secondary text: one-line subs, field labels (9.3:1 on cream). */
  ink2: string;
  /** Decorative mauve: dividers, disabled marks, icons only. Never text. */
  inkDeco: string;
  /** Orange for TEXT: links, TextLink, active tab label (5.5:1 on cream). */
  orangeInk: string;
  /** Purple for text, Pioneer badge text. */
  purpleInk: string;
  /** Green tick mark (icon). */
  tick: string;
  /** Primary button fill: deeper sunset so white labels hold 4.5:1. */
  gradCta: string;
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
  /** error text, and the soft fill behind an error message */
  error: string;
  errorSoft: string;
  /** success text and icons, and the soft fill behind a success message */
  success: string;
  successSoft: string;
}

// Elevation — depth comes from soft plum-tinted shadows, not color (a cool
// tint keeps whites crisp; brown-tinted shadows made the whole app look tan).
// Buttons get a tighter, slightly stronger lift; "raised" is for selected
// surfaces; the hero gets a deeper violet lift.
export const SHADOW_CARD = '0 1px 2px rgba(26,15,46,0.04), 0 12px 28px -18px rgba(26,15,46,0.16)';
export const SHADOW_BUTTON = '0 6px 24px rgba(242,97,34,0.30)';
export const SHADOW_RAISED = '0 2px 6px rgba(26,15,46,0.07), 0 16px 34px -18px rgba(26,15,46,0.22)';
/** The dark premium (Pioneer / Global commit) button lift. */
export const SHADOW_PREMIUM = '0 6px 24px rgba(26,15,46,0.32)';
export const SHADOW_HERO = '0 18px 40px -20px rgba(134,82,224,0.5)';

// Widest the content column grows (grids, two-column layouts on the iPhone
// Duo inner display at about 744pt). Phones (360 to 440pt) never reach it.
export const COLUMN_MAX = 880;
/** Widest a text-only reading column grows (help articles, login, report). */
export const READ_MAX = 560;
/** The tab bar's widest width on a wide screen, centred. */
export const TABBAR_MAX = 480;
/** Widest a primary button grows on a wide screen. */
export const BUTTON_MAX = 420;

// One corner-radius scale — every surface picks from these, not ad-hoc values.
export const RADIUS = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999, card: 24, control: 14 } as const;

// The shape rule, one line each:
//   cards    RADIUS.card (24), a 1.5px RC.line hairline and SHADOW_CARD (site)
//   controls RADIUS.control (14): buttons, inputs, segmented toggles, choice rows
//   tap targets are never under 44pt (TAP) in either direction
// cardSurface() reads RC at call time so it follows the live theme.
export const TAP = 44;
export function cardSurface(): CSSProperties {
  return { background: RC.paper, borderRadius: RADIUS.card, border: `1.5px solid ${RC.line}`, boxShadow: SHADOW_CARD };
}

// ── Type scale (matches the site's iOS scale: body 17, secondary 15, caption 13).
// Nothing in the app may go under 13px; body copy is 15px or more.
// Headings use var(--font-display), everything else var(--font). Never change
// the families themselves.
type TypeStyle = Pick<CSSProperties, 'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'>;
const D = 'var(--font-display)';
const F = 'var(--font)';
export const TYPE = {
  /** Screen title (large, top of tab screens). 26 on the cover display, 36 wide: use typeFor(). */
  display: { fontFamily: D, fontSize: 30, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.03em' },
  /** Hero title on a photo (white + text shadow). */
  hero: { fontFamily: D, fontSize: 30, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.031em' },
  /** Section heading. */
  h1: { fontFamily: D, fontSize: 22, lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.02em' },
  /** Card / sheet title. */
  h2: { fontFamily: D, fontSize: 19, lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.02em' },
  /** Row title, small card title. */
  h3: { fontFamily: F, fontSize: 17, lineHeight: 1.3, fontWeight: 700, letterSpacing: '-0.01em' },
  /** Body copy and the one line under a heading (colour ink2 for the sub). */
  body: { fontFamily: F, fontSize: 17, lineHeight: 1.5, fontWeight: 400, letterSpacing: '-0.01em' },
  bodyStrong: { fontFamily: F, fontSize: 17, lineHeight: 1.4, fontWeight: 700, letterSpacing: '-0.01em' },
  /** Secondary text (colour ink2). */
  small: { fontFamily: F, fontSize: 15, lineHeight: 1.45, fontWeight: 400, letterSpacing: 0 },
  /** Captions and meta (colour inkMute). The floor: nothing smaller. */
  caption: { fontFamily: F, fontSize: 13, lineHeight: 1.4, fontWeight: 500, letterSpacing: 0 },
  /** Price on a light surface. */
  price: { fontFamily: D, fontSize: 28, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' },
  /** Big price on a dark plan card. 44 cover, 52 phone, 56 wide: use typeFor(). */
  priceHero: { fontFamily: D, fontSize: 52, lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' },
  button: { fontFamily: F, fontSize: 17, lineHeight: 1, fontWeight: 700, letterSpacing: '-0.01em' },
  /** Sentence-case field label (colour ink2). */
  label: { fontFamily: F, fontSize: 15, lineHeight: 1.3, fontWeight: 600, letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;
export type TypeRole = keyof typeof TYPE;
export const MIN_FONT = 13;

/** Width-aware sizes for the roles that change with the screen. */
export function typeFor(role: TypeRole, size: 'cover' | 'phone' | 'wide'): CSSProperties {
  const base = { ...TYPE[role] } as CSSProperties;
  const bump: Partial<Record<TypeRole, [number, number]>> = {
    display: [26, 36], hero: [26, 40], h1: [22, 24], priceHero: [44, 56],
  };
  const b = bump[role];
  if (b && size === 'cover') base.fontSize = b[0];
  if (b && size === 'wide') base.fontSize = b[1];
  return base;
}

// ── Website surfaces ─────────────────────────────────────────────────────────
/** The ringoesim.com logo gradient, clipped to the "Ringo" wordmark. */
export const LOGO_GRAD = 'linear-gradient(100deg,#ff8a45 0%,#ffa043 38%,#ff80a0 62%,#f552b5 100%)';
/** The site GRAD: for fills WITHOUT text (progress bars, decoration). */
export const SITE_GRAD = 'linear-gradient(135deg, #F93C1F 0%, #FF7733 52%, #FFB83D 100%)';
/** Primary button fill: white label holds 4.57:1 or better at every stop. */
export const GRAD_CTA = 'linear-gradient(135deg, #DF280C 0%, #D64000 55%, #D14600 100%)';
/** Premium plum (Pioneer / Global commit button, Pioneer badge). */
export const GRAD_PREMIUM = 'linear-gradient(135deg,#1a0f2e 0%,#3a1a3e 55%,#6a1a4a 100%)';
/** Gold for Pioneer marks (fills only). */
export const GRAD_GOLD = 'linear-gradient(135deg,#FFCC33 0%,#FFA733 55%,#FF7A1F 100%)';
/** Dark overlay on photos so white text holds 5:1 even over a white photo. */
export const PHOTO_OVERLAY = 'linear-gradient(180deg, rgba(26,15,46,0) 40%, rgba(26,15,46,0.78) 100%)';
export const PHOTO_TEXT_SHADOW = '0 2px 12px rgba(0,0,0,0.35)';
/** Sunset skies for a photo card without a photo (site SKIES), picked by id hash. */
export const SKIES = [
  'linear-gradient(160deg,#ff9a5a 0%,#ff5f6d 45%,#8652e0 100%)',
  'linear-gradient(160deg,#ffcc33 0%,#ff7733 50%,#d63c6b 100%)',
  'linear-gradient(160deg,#ffb3c7 0%,#ff42a1 45%,#5f2fb1 100%)',
  'linear-gradient(160deg,#ffd27a 0%,#f26122 55%,#7a2a6b 100%)',
] as const;
export function skyFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SKIES[h % SKIES.length];
}
/** Dark plan-card skins (site SKINS). Text on them: white, or white at .86 / .72 (never lower). */
export const SKINS = {
  month: 'linear-gradient(155deg,#1e1132,#31173d)',
  annual: 'linear-gradient(155deg,#221338,#3a1a46)',
  unlimited: 'linear-gradient(155deg,#2b1140 0%,#5f1b50 55%,#93214f 100%)',
} as const;
export const ON_DARK = {
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.86)',
  caption: 'rgba(255,255,255,0.72)',
  tick: '#63E392',
  line: 'rgba(255,255,255,0.10)',
  track: 'rgba(255,255,255,0.08)',
  trackLine: 'rgba(255,255,255,0.14)',
} as const;
/** Tick colours: icon on light (3.4:1), soft circle behind it, success text. */
export const TICK = { icon: '#279B51', soft: 'hsl(142,60%,95%)', text: '#1F7A40', onDark: '#63E392' } as const;

// The signature spring + the standard iOS ease-out, named once so motion is
// consistent everywhere (chips, tiles, sheets, progress bars).
export const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

// The site's brand swatches (its --or, --pk, --pu, --ink and the amber end of
// --grad), named once for illustrations that sit outside the live theme: the
// welcome sky, the satellite, the plane and the signal pulses on the globe.
export const BRAND = {
  orange: '#FF5724',
  amber: '#FFB83D',
  pink: '#FF42A1',
  violet: '#8652E0',
  lilac: '#C9B3F5',
  plum: '#1A0F2E',
  starlight: '#FFF6EC',
} as const;

const DARK: Palette = {
  scheme: 'dark',
  bg: '#0E0A16',
  paper: '#1A1424',
  ink: '#FBF6F2',
  inkStrong: '#FF8A4C',
  inkMute: '#B0A6C2',
  ink2: '#D6CDE3',
  inkDeco: '#7D7390',
  orangeInk: '#FF9A62',
  purpleInk: '#C9B3F5',
  tick: '#5FD49A',
  gradCta: 'linear-gradient(135deg, #DF280C 0%, #D64000 55%, #D14600 100%)',
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.22)',
  cream: '#221A2E',
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
  // Lifted so they read on near-black.
  error: '#FF7A7A',
  errorSoft: 'rgba(255,122,122,0.12)',
  success: '#5FD49A',
  successSoft: 'rgba(76,201,138,0.12)',
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
  inkStrong: '#FF5724', // brand orange: fills, icons, selected borders only
  inkMute: '#655A7E', // captions (6.1:1); the site's #8B7FA8 failed as text
  ink2: '#4A3F60', // secondary text (the site's --ink2, 9.3:1)
  inkDeco: '#8B7FA8', // the site's --ink3: dividers and icons only
  orangeInk: '#B93A0B', // orange text (5.5:1)
  purpleInk: '#5F2FB1', // purple text, Pioneer badge (8:1)
  tick: '#279B51',
  gradCta: 'linear-gradient(135deg, #DF280C 0%, #D64000 55%, #D14600 100%)',
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
  // The values the screens already hard-code (#A12C2C, #1F7A4E), named once.
  error: '#A12C2C',
  errorSoft: 'rgba(225,29,72,0.08)',
  success: '#1F7A40',
  successSoft: 'hsl(142,60%,95%)',
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
    root.setProperty('--ink2', p.ink2);
    root.setProperty('--orange-ink', p.orangeInk);
    root.setProperty('--grad-cta', p.gradCta);
    root.setProperty('--cream', p.cream);
    root.setProperty('color-scheme', p.scheme);
    root.setProperty('--line', p.line);
    root.setProperty('--line-strong', p.lineStrong);
    root.setProperty('--grad', p.grad);
    root.setProperty('--error', p.error);
    root.setProperty('--success', p.success);
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
