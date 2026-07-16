// ScreenHost.tsx — animated navigation container.
// Renders the active screen with an iOS-style enter animation while the
// outgoing screen animates out. The outgoing subtree is MOVED (keyed array
// reconciliation) into the leaving layer — never unmounted/remounted — so
// transition start pays no double mount and running state (canvas, timers,
// scroll) survives the exit animation.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type NavDir = 'push' | 'pop' | 'fade';

// Slightly longer than the matching CSS animation, to be safe. Fades are quick
// (0.2s), slides are 0.34s — clearing the leaving layer on time (not 160ms late)
// keeps tab switches crisp.
const DURATION: Record<NavDir, number> = { push: 380, pop: 380, fade: 300 };

export function ScreenHost({ navKey, dir, children, onSwipeBack }: { navKey: string; dir: NavDir; children: ReactNode; onSwipeBack?: () => void }) {
  const lastKey = useRef(navKey);
  const lastNode = useRef<ReactNode>(children);
  const [leaving, setLeaving] = useState<{ key: string; node: ReactNode; dir: NavDir } | null>(null);

  // Adjust-state-during-render: the moment the screen identity changes, move
  // the previous screen into the leaving layer synchronously (same render).
  if (navKey !== lastKey.current) {
    setLeaving({ key: lastKey.current, node: lastNode.current, dir });
    lastKey.current = navKey;
  }
  lastNode.current = children;

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
  // subtree moves (className change only) instead of unmount+remount.
  const layers: ReactNode[] = [];
  if (leaving && leaving.key !== navKey) {
    layers.push(
      <div key={leaving.key} className={`screen-layer ${leaveClass}`} style={{ zIndex: leaveZ }} aria-hidden>
        {leaving.node}
      </div>,
    );
  }
  layers.push(
    <div key={navKey} className={`screen-layer ${enterClass}`} style={{ zIndex: enterZ }}>
      {children}
    </div>,
  );

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
