// SaturnWorld — a globe with country flags orbiting in a Saturn-style ring.
// Performance: the orbit is fully imperative — one rAF loop writes
// compositor-friendly transform/opacity to static DOM nodes, so React renders
// ZERO times per frame and the browser does no layout. The spinning chip rings
// run as pure CSS animations. The globe itself is lazy-loaded (code-split).
import { lazy, Suspense, useEffect, useRef } from 'react';
import { RC } from '../theme';

const RingoGlobe = lazy(() => import('./Globe').then((m) => ({ default: m.RingoGlobe })));

const FLAGS = ['🇬🇧', '🇮🇪', '🇪🇸', '🇩🇪', '🇳🇱', '🇺🇸', '🇯🇵', '🇸🇬', '🇦🇪', '🇵🇹', '🇲🇽', '🇹🇭'];

export function SaturnWorld({ size = 280 }: { size?: number }) {
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);

  const cx = size / 2;
  const cy = size / 2;
  const rx = size * 0.48; // ring width
  const ry = size * 0.15; // ring height (tilt)
  const planet = size * 0.46;
  const tilt = -16; // degrees
  const rad = (tilt * Math.PI) / 180;

  // Position of flag i at orbit time t — used both for the static first paint /
  // reduced-motion layout and inside the rAF loop, so flags always sit on the
  // ring (never stacked at centre).
  const place = (i: number, t: number) => {
    const a = t + (i / FLAGS.length) * Math.PI * 2;
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    const x = cx + ex * Math.cos(rad) - ey * Math.sin(rad);
    const y = cy + ex * Math.sin(rad) + ey * Math.cos(rad);
    const depth = (Math.sin(a) + 1) / 2; // 0 back … 1 front
    return {
      transform: `translate3d(${x}px, ${y}px, 0) translate(-50%,-50%) scale(${0.62 + 0.5 * depth})`,
      opacity: 0.5 + 0.5 * depth,
      z: Math.sin(a) > 0 ? 6 : 1,
    };
  };

  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Lay the ring out once, statically, so it reads as a ring (not a stack).
      for (let i = 0; i < FLAGS.length; i++) {
        const el = wrapRefs.current[i];
        if (!el) continue;
        const p = place(i, 0);
        el.style.transform = p.transform;
        el.style.opacity = String(p.opacity);
        el.style.zIndex = String(p.z);
      }
      return;
    }
    const front: (boolean | null)[] = FLAGS.map(() => null);
    let t = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt * 0.32; // slow orbit
      for (let i = 0; i < FLAGS.length; i++) {
        const el = wrapRefs.current[i];
        if (!el) continue;
        const p = place(i, t);
        el.style.transform = p.transform;
        el.style.opacity = String(p.opacity);
        if (p.z !== (front[i] ? 6 : 1)) {
          front[i] = p.z === 6;
          el.style.zIndex = String(p.z);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const chip = 34;
  const ring = chip + 9;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* vivid halo — softness baked into the gradient (no blur filter) */}
      <div
        style={{
          position: 'absolute', left: cx - planet * 0.85, top: cy - planet * 0.85,
          width: planet * 1.7, height: planet * 1.7, borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,94,30,0.44) 0%, rgba(250,70,100,0.34) 34%, rgba(245,51,126,0.22) 52%, rgba(230,36,154,0.10) 66%, rgba(230,36,154,0.03) 74%, transparent 80%)',
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
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="url(#saturnRing)" strokeWidth="2" strokeOpacity="0.75" />
        <ellipse cx={cx} cy={cy} rx={rx * 0.84} ry={ry * 0.84} fill="none" stroke="url(#saturnRing)" strokeWidth="1.2" strokeOpacity="0.4" />
      </svg>

      {/* planet — lazy-loaded canvas globe (code-split with its map data) */}
      <div
        style={{
          position: 'absolute', left: cx - planet / 2, top: cy - planet / 2,
          width: planet, height: planet, borderRadius: '50%', zIndex: 3,
          boxShadow: `0 16px 36px -14px ${RC.pink}80`,
        }}
      >
        <Suspense fallback={<div style={{ width: planet, height: planet, borderRadius: '50%', background: RC.grad, opacity: 0.25 }} />}>
          <RingoGlobe size={planet} />
        </Suspense>
      </div>

      {/* orbiting flags — static nodes; the rAF loop moves them on the compositor.
          Initial transform is the real t=0 ring position (no centre-stack flash). */}
      {FLAGS.map((f, i) => {
        const init = place(i, 0);
        return (
        <div
          key={i}
          ref={(el) => { wrapRefs.current[i] = el; }}
          style={{
            position: 'absolute', left: 0, top: 0, zIndex: init.z,
            transform: init.transform,
            opacity: init.opacity,
            willChange: 'transform, opacity',
          }}
        >
          {/* spinning live ring — pure CSS animation */}
          <svg
            width={ring} height={ring} viewBox={`0 0 ${ring} ${ring}`}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              margin: `${-ring / 2}px 0 0 ${-ring / 2}px`,
              animation: `flagspin 2.6s linear infinite${i % 2 ? ' reverse' : ''}`,
            }}
          >
            <circle
              cx={ring / 2} cy={ring / 2} r={ring / 2 - 1.5}
              fill="none" stroke="url(#saturnRing)" strokeWidth="2"
              strokeLinecap="round" strokeDasharray={`${ring * 0.7} ${ring * 1.2}`}
              strokeOpacity={0.8}
            />
          </svg>
          <div
            style={{
              position: 'relative',
              width: chip, height: chip, borderRadius: '50%',
              background: RC.paper, border: `1px solid ${RC.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
