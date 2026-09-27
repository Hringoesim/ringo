// useReducedMotion: true while the person asks for reduced motion
// (Settings > Accessibility > Motion), following changes live. Shared by the
// welcome screen's satellite, stars, plane and pulses.
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)';
  const [reduce, setReduce] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(q);
    const on = () => setReduce(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return reduce;
}
