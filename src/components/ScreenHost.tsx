// ScreenHost.tsx — animated navigation container.
// Renders the active screen with an iOS-style enter animation while the
// outgoing screen animates out. The outgoing subtree is MOVED (keyed array
// reconciliation) into the leaving layer — never unmounted/remounted — so
// transition start pays no double mount and running state (canvas, timers,
// scroll) survives the exit animation.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { COLUMN_MAX } from '../theme';

// ── Kept screens ────────────────────────────────────────────────────────────
// A tab's screen stays mounted, hidden, while another tab or a screen pushed
// over it is shown, so going back finds it as it was left: its scroll, its
// list, its photos already decoded, no fresh loading state. `active` says
// whether the screen is the one on show (a hidden one must not hold the
// status bar or run its animations); `shown` counts how many times it has
// come back on show, for a quiet refresh.
const ScreenActiveContext = createContext<{ active: boolean; shown: number }>({ active: true, shown: 0 });
/** Whether this screen is the one on show, and how many times it has come back on show. */
export function useScreenActive(): { active: boolean; shown: number } {
  return useContext(ScreenActiveContext);
}
function ActiveProvider({ active, children }: { active: boolean; children: ReactNode }) {
  const shown = useRef(0);
  const was = useRef(active);
  if (active && !was.current) shown.current += 1;
  was.current = active;
  const n = shown.current;
  const value = useMemo(() => ({ active, shown: n }), [active, n]);
  return <ScreenActiveContext.Provider value={value}>{children}</ScreenActiveContext.Provider>;
}

/** A screen kept mounted under the one on show (see above). */
export interface KeptScreen { key: string; node: ReactNode; fullBleed?: boolean }

// ── Swipe-back guard ────────────────────────────────────────────────────────
// A screen in the middle of something that must not be abandoned (Checkout
// while buying / recording / issuing) blocks the edge-swipe back. Each block
// is counted, so two screens can hold one at the same time.
let swipeBlocks = 0;
/** Blocks the edge-swipe back until the returned release function is called. */
export function blockSwipeBack(): () => void {
  swipeBlocks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    swipeBlocks = Math.max(0, swipeBlocks - 1);
  };
}
/** True while any screen blocks the edge-swipe back. */
export function isSwipeBackBlocked(): boolean {
  return swipeBlocks > 0;
}
/** Hook form: blocks the edge-swipe back while `active` is true. */
export function useBlockSwipeBack(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return blockSwipeBack();
  }, [active]);
}

export type NavDir = 'push' | 'pop' | 'fade';

// Slightly longer than the matching CSS animation, to be safe. Fades are quick
// (0.2s), slides are 0.34s — clearing the leaving layer on time (not 160ms late)
// keeps tab switches crisp.
// Slightly longer than the CSS animations so the leaving layer unmounts only
// after the motion fully settles (matches index.css: push/pop 0.44s, fade 0.36s).
const DURATION: Record<NavDir, number> = { push: 460, pop: 460, fade: 380 };

// The layer itself spans the screen (its background fills the wide display);
// the screen inside it is held to a centred column no wider than COLUMN_MAX
// (880). On a phone the column is the full width. The layer is a CSS size
// container named "screen", so `@container screen (...)` rules and the
// --gutter variable (index.css) follow the live width when an iPhone Duo
// opens or closes. A `fullBleed` screen keeps the whole width and centres
// its own content.
const column = (fullBleed: boolean): CSSProperties => ({
  flex: 1, minHeight: 0, width: '100%', maxWidth: fullBleed ? undefined : COLUMN_MAX,
  margin: '0 auto', display: 'flex', flexDirection: 'column', position: 'relative',
});

export function ScreenHost({ navKey, dir, children, onSwipeBack, fullBleed = false, kept = [] }: { navKey: string; dir: NavDir; children: ReactNode; onSwipeBack?: () => void; fullBleed?: boolean; kept?: KeptScreen[] }) {
  const lastKey = useRef(navKey);
  const lastNode = useRef<ReactNode>(children);
  const lastFull = useRef(fullBleed);
  const [leaving, setLeaving] = useState<{ key: string; node: ReactNode; dir: NavDir; full: boolean } | null>(null);

  // Adjust-state-during-render: the moment the screen identity changes, move
  // the previous screen into the leaving layer synchronously (same render).
  if (navKey !== lastKey.current) {
    setLeaving({ key: lastKey.current, node: lastNode.current, dir, full: lastFull.current });
    lastKey.current = navKey;
  }
  lastNode.current = children;
  lastFull.current = fullBleed;

  // Clear the leaving layer when its exit animation completes.
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setLeaving(null), DURATION[leaving.dir]);
    return () => window.clearTimeout(t);
  }, [leaving]);

  const enterClass = dir === 'push' ? 'enter-push' : dir === 'pop' ? 'enter-pop' : 'enter-fade';
  const leaveClass =
    leaving?.dir === 'push' ? 'leave-push' : leaving?.dir === 'pop' ? 'leave-pop' : 'leave-fade';
  // On pop the incoming (older) screen sits behind the outgoing one.
  const enterZ = dir === 'pop' ? 1 : 2;
  const leaveZ = dir === 'pop' ? 2 : 1;

  // Keyed ARRAY children: React matches by key across positions, so the old
  // subtree moves (className change only) instead of unmount+remount. The
  // layers are always in key order (keys are the frames' rising ids) and
  // stack by z-index, so a kept screen's node is never moved in the DOM: a
  // moved scroller would lose its scroll position.
  const keptByKey = new Map(kept.map((k) => [k.key, k]));
  const entries: { key: string; node: ReactNode; full: boolean; cls: string; z: number; active: boolean }[] = [];
  for (const k of kept) {
    if (k.key === navKey || (leaving && k.key === leaving.key)) continue;
    entries.push({ key: k.key, node: k.node, full: Boolean(k.fullBleed), cls: 'screen-kept', z: 0, active: false });
  }
  if (leaving && leaving.key !== navKey) {
    const k = keptByKey.get(leaving.key);
    entries.push({ key: leaving.key, node: k ? k.node : leaving.node, full: k ? Boolean(k.fullBleed) : leaving.full, cls: leaveClass, z: leaveZ, active: false });
  }
  entries.push({ key: navKey, node: children, full: fullBleed, cls: enterClass, z: enterZ, active: true });
  entries.sort((a, b) => Number(a.key) - Number(b.key));
  const layers: ReactNode[] = entries.map((e) => (
    // Hidden, not display:none: the kept screen keeps its layout and scroll.
    <div key={e.key} className={`screen-layer ${e.cls}`} style={e.cls === 'screen-kept' ? { zIndex: 0, visibility: 'hidden', pointerEvents: 'none' } : { zIndex: e.z }} aria-hidden={e.active ? undefined : true} {...(e.cls === 'screen-kept' ? { inert: '' } : {})}>
      <div className="screen-col" style={column(e.full)}><ActiveProvider active={e.active}>{e.node}</ActiveProvider></div>
    </div>
  ));

  // iOS-style edge-swipe back: a drag that STARTS near the left edge and moves
  // clearly rightward pops the screen (real horizontal scrollers live inboard, so
  // the edge start avoids conflicts).
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipe.current = t && t.clientX <= 28 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!swipe.current || !onSwipeBack) return;
    if (isSwipeBackBlocked()) {
      swipe.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - swipe.current.x;
    const dy = Math.abs(t.clientY - swipe.current.y);
    swipe.current = null;
    if (dx > 64 && dy < 48) onSwipeBack();
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      {layers}
    </div>
  );
}
