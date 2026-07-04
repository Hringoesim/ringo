// SaturnWorld — a globe with a live flight simulation: arcs fly country-to-
// country and, on landing, the destination flag pops up. The rendered globe is
// lazy-loaded (code-split); the flights run on one imperative rAF loop writing
// compositor-friendly attributes to a fixed pool of SVG nodes, so React renders
// ZERO times per frame.
import { lazy, Suspense, useEffect, useRef } from 'react';
import { RC } from '../theme';

const RingoGlobe = lazy(() => import('./Globe').then((m) => ({ default: m.RingoGlobe })));

// City anchors on the visible disk (dx,dy as a fraction of the globe radius).
const CITIES = [
  { dx: -0.34, dy: -0.30, flag: '🇬🇧' },
  { dx: 0.02, dy: -0.46, flag: '🇸🇪' },
  { dx: 0.36, dy: -0.24, flag: '🇯🇵' },
  { dx: 0.46, dy: 0.08, flag: '🇦🇪' },
  { dx: 0.30, dy: 0.38, flag: '🇸🇬' },
  { dx: -0.02, dy: 0.46, flag: '🇿🇦' },
  { dx: -0.36, dy: 0.30, flag: '🇺🇸' },
  { dx: -0.48, dy: -0.02, flag: '🇪🇸' },
  { dx: 0.16, dy: -0.04, flag: '🇩🇪' },
  { dx: -0.12, dy: 0.14, flag: '🇧🇷' },
];

const N = 4; // concurrent flights
const DURATION = 1150; // ms in the air (fast)
const HOLD = 520; // ms the flag stays after landing

export function SaturnWorld({ size = 300 }: { size?: number }) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const planeRefs = useRef<(SVGGElement | null)[]>([]);
  const flagRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flagEmojiRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.35; // globe radius
  const planet = R * 2;

  useEffect(() => {
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pt = (i: number) => ({ x: cx + CITIES[i].dx * R, y: cy + CITIES[i].dy * R });

    type Slot = { from: number; to: number; start: number; len: number };
    const rnd = (n: number) => Math.floor(Math.random() * n);
    const route = (prev: number): Slot => {
      const from = prev < 0 ? rnd(CITIES.length) : prev;
      let to = rnd(CITIES.length);
      while (to === from) to = rnd(CITIES.length);
      return { from, to, start: 0, len: 0 };
    };

    const setPath = (i: number, s: Slot) => {
      const a = pt(s.from);
      const b = pt(s.to);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // push the control point outward from the globe centre so the arc bows up
      const nx = mx - cx;
      const ny = my - cy;
      const nl = Math.hypot(nx, ny) || 1;
      const lift = Math.hypot(b.x - a.x, b.y - a.y) * 0.28 + R * 0.22;
      const cxp = mx + (nx / nl) * lift;
      const cyp = my + (ny / nl) * lift;
      const path = pathRefs.current[i];
      if (!path) return { a, b, cxp, cyp };
      path.setAttribute('d', `M ${a.x} ${a.y} Q ${cxp} ${cyp} ${b.x} ${b.y}`);
      s.len = path.getTotalLength();
      path.style.strokeDasharray = String(s.len);
      return { a, b, cxp, cyp };
    };

    // quadratic bezier point at t
    const qpt = (a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) => {
      const u = 1 - t;
      return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
    };

    const slots: Slot[] = [];
    const geom: { a: { x: number; y: number }; b: { x: number; y: number }; cxp: number; cyp: number }[] = [];
    for (let i = 0; i < N; i++) {
      const s = route(-1);
      slots.push(s);
      const g = setPath(i, s);
      geom.push({ a: g.a, b: g.b, cxp: g.cxp, cyp: g.cyp });
      s.start = performance.now() + i * (DURATION * 0.55); // stagger
    }

    const showFlag = (i: number, on: boolean, at?: { x: number; y: number }) => {
      const el = flagRefs.current[i];
      if (!el) return;
      if (on && at) { el.style.left = `${at.x}px`; el.style.top = `${at.y}px`; }
      el.style.opacity = on ? '1' : '0';
      el.style.transform = `translate(-50%,-50%) scale(${on ? 1 : 0.4})`;
    };

    if (reduce) {
      // Static: draw each arc fully, show destination flags.
      for (let i = 0; i < N; i++) {
        const p = pathRefs.current[i];
        if (p) p.style.strokeDashoffset = '0';
        showFlag(i, true, pt(slots[i].to));
        const pl = planeRefs.current[i];
        if (pl) pl.style.opacity = '0';
      }
      return;
    }

    let raf = 0;
    const loop = (now: number) => {
      for (let i = 0; i < N; i++) {
        const s = slots[i];
        const el = pathRefs.current[i];
        const plane = planeRefs.current[i];
        if (!el) continue;
        const elapsed = now - s.start;
        if (elapsed < 0) { el.style.strokeDashoffset = String(s.len); if (plane) plane.style.opacity = '0'; showFlag(i, false); continue; }
        if (elapsed <= DURATION) {
          const t = elapsed / DURATION;
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
          el.style.strokeDashoffset = String(s.len * (1 - e));
          const g = geom[i];
          const pos = qpt(g.a, { x: g.cxp, y: g.cyp }, g.b, e);
          if (plane) { plane.style.transform = `translate(${pos.x}px, ${pos.y}px)`; plane.style.opacity = '1'; }
          showFlag(i, false);
        } else if (elapsed <= DURATION + HOLD) {
          el.style.strokeDashoffset = '0';
          if (plane) plane.style.opacity = '0';
          showFlag(i, true, pt(s.to));
          const em = flagEmojiRefs.current[i];
          if (em) em.textContent = CITIES[s.to].flag;
        } else {
          // recycle: fly onward from the current destination
          const next = route(s.to);
          slots[i] = next;
          const g = setPath(i, next);
          geom[i] = { a: g.a, b: g.b, cxp: g.cxp, cyp: g.cyp };
          next.start = now;
          if (el) el.style.strokeDashoffset = String(next.len);
          showFlag(i, false);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* warm halo */}
      <div
        style={{
          position: 'absolute', left: cx - R * 1.25, top: cy - R * 1.25,
          width: R * 2.5, height: R * 2.5, borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,190,120,0.28) 32%, rgba(255,120,90,0.16) 52%, transparent 72%)',
        }}
      />

      {/* rendered globe */}
      <div
        style={{
          position: 'absolute', left: cx - planet / 2, top: cy - planet / 2,
          width: planet, height: planet, borderRadius: '50%', zIndex: 2,
          boxShadow: '0 18px 44px -16px rgba(60,20,10,0.5)',
        }}
      >
        <Suspense fallback={<div style={{ width: planet, height: planet, borderRadius: '50%', background: RC.grad, opacity: 0.25 }} />}>
          <RingoGlobe size={planet} />
        </Suspense>
      </div>

      {/* flight arcs + planes (overlay) */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'visible' }}>
        {Array.from({ length: N }).map((_, i) => (
          <g key={i}>
            <path
              ref={(el) => { pathRefs.current[i] = el; }}
              fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round"
              strokeOpacity="0.9" style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' }}
            />
            <g ref={(el) => { planeRefs.current[i] = el; }} style={{ opacity: 0 }}>
              <circle r="3.2" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.9))' }} />
            </g>
          </g>
        ))}
      </svg>

      {/* destination flag pops */}
      {Array.from({ length: N }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { flagRefs.current[i] = el; }}
          style={{
            position: 'absolute', left: 0, top: 0, zIndex: 6, opacity: 0,
            transform: 'translate(-50%,-50%) scale(0.4)',
            transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            width: 34, height: 34, borderRadius: '50%', background: RC.paper,
            border: `1px solid ${RC.line}`, boxShadow: '0 6px 14px -6px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span ref={(el) => { flagEmojiRefs.current[i] = el; }} style={{ fontSize: 19 }}>🇬🇧</span>
        </div>
      ))}
    </div>
  );
}
