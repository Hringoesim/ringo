// layout.ts: width-driven layout for every screen.
//
// Layout comes from the live width of the app root only: never the user
// agent, never the device idiom. On the iPhone Duo the WebView resizes live
// when the phone opens (inner display, about 744pt) or closes (cover display,
// about 360pt), so the width is read continuously, not once at mount.
//
// Source of truth: Host measures the app root with a ResizeObserver and calls
// setLayoutWidth() (this also covers the desktop mockup, where the "phone" is
// narrower than the browser window). Until then, and as a fallback, the
// window width is used, refreshed on resize and on matchMedia changes.
import { useSyncExternalStore, type CSSProperties } from 'react';
import { COLUMN_MAX, READ_MAX } from '../theme';

export type LayoutSize = 'cover' | 'phone' | 'wide';

/** Under this width: the Duo cover display / iPhone SE class. */
export const COVER_MAX = 374;
/** At or over this width: the Duo inner display and anything wider. */
export const WIDE_MIN = 600;

export interface Layout {
  /** Live width of the app root in CSS px (pt). */
  width: number;
  size: LayoutSize;
  isCover: boolean;
  isWide: boolean;
  /** Side gutter: 16 cover, 20 phone, 28 wide. */
  gutter: number;
  /** Gap between sections: 32 phone, 40 wide. */
  sectionGap: number;
  /** Gap between cards in a list or grid: 12 phone, 16 wide. */
  cardGap: number;
  /** Inner padding of a card: 16 phone, 22 wide. */
  cardPad: number;
}

export function sizeFor(width: number): LayoutSize {
  if (width < COVER_MAX + 1) return 'cover';
  if (width >= WIDE_MIN) return 'wide';
  return 'phone';
}

export function layoutFor(width: number): Layout {
  const size = sizeFor(width);
  const wide = size === 'wide';
  return {
    width,
    size,
    isCover: size === 'cover',
    isWide: wide,
    gutter: size === 'cover' ? 16 : wide ? 28 : 20,
    sectionGap: wide ? 40 : 32,
    cardGap: wide ? 16 : 12,
    cardPad: wide ? 22 : 16,
  };
}

// ── Tiny external store ─────────────────────────────────────────────────────
let measured: number | null = null;
let current: Layout = layoutFor(typeof window === 'undefined' ? 390 : window.innerWidth || 390);
const listeners = new Set<() => void>();

function emit(width: number) {
  const w = Math.round(width);
  if (w <= 0 || w === current.width) return;
  current = layoutFor(w);
  listeners.forEach((l) => l());
}

/** Host calls this with the measured app-root width (ResizeObserver). */
export function setLayoutWidth(width: number | null): void {
  measured = width;
  emit(width ?? (typeof window === 'undefined' ? 390 : window.innerWidth));
}

let windowWired = false;
function wireWindow() {
  if (windowWired || typeof window === 'undefined') return;
  windowWired = true;
  const fromWindow = () => {
    if (measured == null) emit(window.innerWidth);
  };
  window.addEventListener('resize', fromWindow);
  window.addEventListener('orientationchange', fromWindow);
  // matchMedia fires on the breakpoint crossings even if a resize event is
  // coalesced away during a fold / unfold.
  if (window.matchMedia) {
    for (const q of [`(max-width: ${COVER_MAX}px)`, `(min-width: ${WIDE_MIN}px)`]) {
      const mq = window.matchMedia(q);
      mq.addEventListener?.('change', fromWindow);
    }
  }
}

function subscribe(cb: () => void) {
  wireWindow();
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getSnapshot = () => current;

/** Live layout of the app. Re-renders when the width changes (fold / unfold). */
export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Current layout outside React (event handlers, measurements). */
export function getLayout(): Layout {
  return current;
}

// ── Style helpers ───────────────────────────────────────────────────────────

/** A centred content column: full width on a phone, max COLUMN_MAX (880) wide. */
export function contentColumn(l: Layout, max: number = COLUMN_MAX): CSSProperties {
  return { width: '100%', maxWidth: max, marginLeft: 'auto', marginRight: 'auto', paddingLeft: l.gutter, paddingRight: l.gutter, boxSizing: 'border-box' };
}

/** A centred readable text column (help articles, login, report): max 560. */
export function readColumn(l: Layout, max: number = READ_MAX): CSSProperties {
  return contentColumn(l, max);
}

/**
 * A grid of cards. One column on a phone; on wide, as many `min`-wide columns
 * as fit (cap with `maxCols`). `phoneMin` gives tiles 2-up on a phone too.
 */
export function cardGrid(l: Layout, opts: { min?: number; phoneMin?: number; maxCols?: number } = {}): CSSProperties {
  const { min = 320, phoneMin, maxCols } = opts;
  const colMin = l.isWide ? min : phoneMin;
  if (!colMin) return { display: 'grid', gridTemplateColumns: '1fr', gap: l.cardGap };
  const track = maxCols
    ? `repeat(auto-fit, minmax(max(min(100%, ${colMin}px), calc((100% - ${(maxCols - 1) * l.cardGap}px) / ${maxCols})), 1fr))`
    : `repeat(auto-fit, minmax(min(100%, ${colMin}px), 1fr))`;
  return { display: 'grid', gridTemplateColumns: track, gap: l.cardGap };
}

/** Country / small tiles: 2-up on phones (min 150), 3 to 4 up on wide (min 170). */
export function tileGrid(l: Layout): CSSProperties {
  return { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${l.isWide ? 170 : 150}px), 1fr))`, gap: l.cardGap };
}

/**
 * Two columns on wide (left `leftFr`, right `rightFr`), stacked on a phone.
 * Use for checkout / plan (photo + ticks left, price + CTA right) and My eSIM.
 */
export function twoColumn(l: Layout, leftFr = 1, rightFr = 1): CSSProperties {
  return l.isWide
    ? { display: 'grid', gridTemplateColumns: `minmax(0, ${leftFr}fr) minmax(0, ${rightFr}fr)`, gap: 24, alignItems: 'start' }
    : { display: 'flex', flexDirection: 'column', gap: l.cardGap };
}

/** A primary action: full width on a phone, max 420 and centred on wide. */
export function actionWidth(l: Layout): CSSProperties {
  return l.isWide ? { width: '100%', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' } : { width: '100%' };
}

/** Bottom padding for a scroller under the floating tab bar. */
export const TABBAR_CLEARANCE = 'calc(96px + env(safe-area-inset-bottom, 0px))';
