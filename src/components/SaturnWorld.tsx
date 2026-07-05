// SaturnWorld — the landing globe. The rendered Earth (lazy-loaded, code-split)
// carries the flight simulation itself (arcs connecting real countries, rotating
// with the globe). No halo — just the globe filling the box.
import { lazy, Suspense } from 'react';
import { RC } from '../theme';

const RingoGlobe = lazy(() => import('./Globe').then((m) => ({ default: m.RingoGlobe })));

export function SaturnWorld({ size = 300 }: { size?: number }) {
  const planet = size; // globe fills the box (bigger, no halo)
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div
        style={{
          position: 'absolute', inset: 0, width: planet, height: planet,
          borderRadius: '50%', boxShadow: '0 18px 44px -18px rgba(60,20,10,0.45)',
        }}
      >
        <Suspense fallback={<div style={{ width: planet, height: planet, borderRadius: '50%', background: RC.grad, opacity: 0.25 }} />}>
          <RingoGlobe size={planet} />
        </Suspense>
      </div>
    </div>
  );
}
