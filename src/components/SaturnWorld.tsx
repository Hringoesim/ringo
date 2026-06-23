// SaturnWorld — a globe with country flags orbiting in a Saturn-style ring.
// The flags revolve along an ellipse; those at the front pass over the planet,
// those at the back duck behind it, selling the 3D ring.
import { useEffect, useRef, useState } from 'react';
import { RC } from '../theme';
import { RingoGlobe } from './Globe';

const FLAGS = ['🇬🇧', '🇮🇪', '🇪🇸', '🇩🇪', '🇳🇱', '🇺🇸', '🇯🇵', '🇸🇬', '🇦🇪', '🇵🇹', '🇲🇽', '🇹🇭'];

export function SaturnWorld({ size = 280 }: { size?: number }) {
  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setT((prev) => prev + dt * 0.32); // slow orbit
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const rx = size * 0.48; // ring width
  const ry = size * 0.15; // ring height (tilt)
  const planet = size * 0.46;
  const tilt = -16; // degrees

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* soft glow */}
      <div
        style={{
          position: 'absolute', left: cx - planet * 0.8, top: cy - planet * 0.8,
          width: planet * 1.6, height: planet * 1.6, borderRadius: '50%',
          background: RC.gradSoft, filter: 'blur(26px)', opacity: 0.9,
        }}
      />

      {/* ring line (behind everything) */}
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, transform: `rotate(${tilt}deg)`, transformOrigin: 'center' }}
      >
        <defs>
          <linearGradient id="saturnRing" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF5E1E" />
            <stop offset="50%" stopColor="#F5337E" />
            <stop offset="100%" stopColor="#E6249A" />
          </linearGradient>
        </defs>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="url(#saturnRing)" strokeWidth="1.5" strokeOpacity="0.45" />
        <ellipse cx={cx} cy={cy} rx={rx * 0.84} ry={ry * 0.84} fill="none" stroke="url(#saturnRing)" strokeWidth="1" strokeOpacity="0.25" />
      </svg>

      {/* planet — meridians sweep with `spin` so it reads as a turning 3D globe */}
      <div
        style={{
          position: 'absolute', left: cx - planet / 2, top: cy - planet / 2,
          width: planet, height: planet, borderRadius: '50%', zIndex: 3,
          boxShadow: `0 26px 60px -20px ${RC.pink}66`,
        }}
      >
        <RingoGlobe size={planet} spin={t * 1.1} />
      </div>

      {/* orbiting flags */}
      {FLAGS.map((f, i) => {
        const a = t + (i / FLAGS.length) * Math.PI * 2;
        // position on the (tilted) ellipse
        const rad = (tilt * Math.PI) / 180;
        const ex = rx * Math.cos(a);
        const ey = ry * Math.sin(a);
        const x = cx + ex * Math.cos(rad) - ey * Math.sin(rad);
        const y = cy + ex * Math.sin(rad) + ey * Math.cos(rad);
        const front = Math.sin(a) > 0;
        const depth = (Math.sin(a) + 1) / 2; // 0 back … 1 front
        const scale = 0.62 + 0.5 * depth;
        const chip = 34;
        const ring = chip + 9;
        // Live ring spins continuously; alternate direction per flag for life.
        const ringSpin = (t * 150 * (i % 2 ? -1 : 1)) % 360;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: x, top: y,
              transform: `translate(-50%,-50%) scale(${scale})`,
              zIndex: front ? 6 : 1,
              opacity: 0.5 + 0.5 * depth,
            }}
          >
            {/* spinning live ring */}
            <svg
              width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`}
              style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `translate(-50%,-50%) rotate(${ringSpin}deg)`,
              }}
            >
              <circle
                cx={ring / 2} cy={ring / 2} r={ring / 2 - 1.5}
                fill="none" stroke="url(#saturnRing)" strokeWidth="2"
                strokeLinecap="round" strokeDasharray={`${ring * 0.7} ${ring * 1.2}`}
                strokeOpacity={0.5 + 0.5 * depth}
              />
            </svg>
            <div
              style={{
                position: 'relative',
                width: chip, height: chip, borderRadius: '50%',
                background: RC.paper, border: `1px solid ${RC.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: front ? '0 8px 16px -8px rgba(0,0,0,0.35)' : 'none',
              }}
            >
              <span style={{ fontSize: 18 }}>{f}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
