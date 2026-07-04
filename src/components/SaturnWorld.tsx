// SaturnWorld — the landing globe. The rendered Earth (lazy-loaded, code-split)
// now carries the flight simulation itself (arcs on real countries, rotating
// with the globe), so this is just a warm halo + the globe filling the box.
import { lazy, Suspense } from 'react';
import { RC } from '../theme';

const RingoGlobe = lazy(() => import('./Globe').then((m) => ({ default: m.RingoGlobe })));

export function SaturnWorld({ size = 300 }: { size?: number }) {
  const planet = size * 0.94;
  const off = (size - planet) / 2;
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* warm halo behind the globe */}
      <div
        style={{
          position: 'absolute', left: size / 2 - planet * 0.62, top: size / 2 - planet * 0.62,
          width: planet * 1.24, height: planet * 1.24, borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(255,190,120,0.26) 34%, rgba(255,120,90,0.14) 54%, transparent 72%)',
        }}
      />
      <div
        style={{
          position: 'absolute', left: off, top: off, width: planet, height: planet,
          borderRadius: '50%', boxShadow: '0 18px 44px -16px rgba(60,20,10,0.5)',
        }}
      >
        <Suspense fallback={<div style={{ width: planet, height: planet, borderRadius: '50%', background: RC.grad, opacity: 0.25 }} />}>
          <RingoGlobe size={planet} />
        </Suspense>
      </div>
    </div>
  );
}
