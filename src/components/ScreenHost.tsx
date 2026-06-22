// ScreenHost.tsx — animated navigation container.
// Renders the active screen with an iOS-style enter animation, and keeps a
// frozen snapshot of the outgoing screen alive just long enough to animate it
// out. Direction drives the motion: push (forward), pop (back), fade (tab).
import { useEffect, useRef, useState, type ReactNode } from 'react';

export type NavDir = 'push' | 'pop' | 'fade';

const DURATION = 360; // ms — slightly longer than the CSS animation, to be safe

export function ScreenHost({ navKey, dir, children }: { navKey: string; dir: NavDir; children: ReactNode }) {
  const lastKey = useRef(navKey);
  const lastNode = useRef<ReactNode>(children);
  const seq = useRef(0);
  const [leaving, setLeaving] = useState<{ node: ReactNode; dir: NavDir; id: number } | null>(null);

  const changed = navKey !== lastKey.current;
  const outgoing = lastNode.current; // captured at render-time = previous screen
  const outgoingDir = dir;

  // Start the exit animation when the screen identity changes.
  useEffect(() => {
    if (!changed) return;
    const id = ++seq.current;
    setLeaving({ node: outgoing, dir: outgoingDir, id });
    const t = window.setTimeout(() => setLeaving((l) => (l && l.id === id ? null : l)), DURATION);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navKey]);

  // After every render, remember what we just showed.
  useEffect(() => {
    lastKey.current = navKey;
    lastNode.current = children;
  });

  const enterClass = dir === 'push' ? 'enter-push' : dir === 'pop' ? 'enter-pop' : 'enter-fade';
  const leaveClass =
    leaving?.dir === 'push' ? 'leave-push' : leaving?.dir === 'pop' ? 'leave-pop' : 'leave-fade';
  // On pop the incoming (older) screen sits behind the outgoing one.
  const enterZ = dir === 'pop' ? 1 : 2;
  const leaveZ = dir === 'pop' ? 2 : 1;

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      {leaving && (
        <div className={`screen-layer ${leaveClass}`} style={{ zIndex: leaveZ }} aria-hidden>
          {leaving.node}
        </div>
      )}
      <div key={navKey} className={`screen-layer ${enterClass}`} style={{ zIndex: enterZ }}>
        {children}
      </div>
    </div>
  );
}
