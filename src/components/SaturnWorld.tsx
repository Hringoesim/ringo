// SaturnWorld — the landing globe. The rendered Earth (lazy-loaded, code-split)
// carries the flight simulation itself (arcs connecting real countries, rotating
// with the globe). No halo — just the globe filling the box.
// With `satellite` a small satellite circles it: its orbit is drawn under the planet and over
// it, so the far side of the orbit passes behind the globe.
import { lazy, Suspense } from 'react';
import { Orbit } from './Satellite';

const RingoGlobe = lazy(() => import('./Globe').then((m) => ({ default: m.RingoGlobe })));

export function SaturnWorld({ size = 300, satellite = false }: { size?: number; satellite?: boolean }) {
  const planet = size; // globe fills the box — NO ring/halo/shadow around it
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {satellite && <Orbit size={size} side="back" />}
      <div style={{ position: 'absolute', inset: 0, width: planet, height: planet }}>
        {/* The fallback is a still blue planet in the same palette, so the real
            globe fades in over it instead of popping in over a pink flash. */}
        <Suspense
          fallback={
            <div
              style={{
                width: planet, height: planet, borderRadius: '50%',
                background:
                  'radial-gradient(circle at 31% 29%, #5FC4F5 0%, #2E93D6 52%, #124F92 100%)',
                boxShadow: 'inset -12px -16px 40px rgba(3,12,30,0.5), inset 8px 10px 30px rgba(255,255,255,0.35)',
              }}
            />
          }
        >
          <RingoGlobe size={planet} />
        </Suspense>
      </div>
      {satellite && <Orbit size={size} side="front" />}
    </div>
  );
}
