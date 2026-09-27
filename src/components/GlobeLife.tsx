// GlobeLife: small moving things on the near face of the landing globe
// (owner 2026-09-27: "make the sky have stars and other moving things on the
// globe"). A little flat plane crossing the lower face with a dotted contrail
// that fades behind it, two cloud wisps drifting over the surface, and signal
// pulses popping at three city points to suggest connection.
//
// It sits between the planet and the satellite's near orbit, clipped to the
// planet's disk, so anything past the horizon is hidden by the sphere the same
// way the satellite's far side is. Every moving part is a CSS transform or
// opacity animation (no per-frame JavaScript, no animated filters), so
// WKWebView keeps it on the compositor. Reduced motion parks the plane, holds
// the clouds and drops the contrail and the pulses.
import { type CSSProperties } from 'react';
import { BRAND } from '../theme';
import { useReducedMotion } from '../lib/useReducedMotion';

const DISK = 0.49; // the planet's radius, share of the box (as in Satellite.tsx)
const PLANE_SECONDS = 12;
const FLY = 0.75; // share of the cycle spent crossing; the rest is behind the globe
const PARKED = 0.6; // reduced motion: where on the route the plane rests

// The route, in shares of the globe size: a tilted arc low across the face,
// starting and ending past the rim so the plane rises over the horizon.
const X0 = -0.04, X1 = 1.04, Y0 = 0.84, Y1 = 0.76, ARC = 0.13;
function route(f: number) {
  const x = X0 + (X1 - X0) * f;
  const y = Y0 + (Y1 - Y0) * f - ARC * 4 * f * (1 - f);
  const heading = (Math.atan2(Y1 - Y0 - ARC * 4 * (1 - 2 * f), X1 - X0) * 180) / Math.PI;
  const scale = 0.62 + 0.38 * Math.sin(Math.PI * f); // smaller near the rim
  return { x, y, heading, scale };
}
const at = (f: number) => {
  const p = route(f);
  return `translate(calc(var(--gs) * ${p.x.toFixed(4)}), calc(var(--gs) * ${p.y.toFixed(4)})) rotate(${p.heading.toFixed(1)}deg) scale(${p.scale.toFixed(3)})`;
};
// The flight as 20 straight steps of the same curve the contrail dots sit on.
const STEPS = 20;
const PLANE_KEYFRAMES =
  '@keyframes ringoPlane {' +
  Array.from({ length: STEPS + 1 }, (_, i) => `${((FLY * 100 * i) / STEPS).toFixed(2)}% { transform: ${at(i / STEPS)}; }`).join(' ') +
  ` 100% { transform: ${at(1)}; } }`;

const TRAIL = Array.from({ length: 10 }, (_, i) => 0.12 + i * 0.085);
const CITIES = [
  { x: 0.27, y: 0.38, colour: BRAND.amber, delay: 0 },
  { x: 0.75, y: 0.33, colour: BRAND.pink, delay: -1.6 },
  { x: 0.68, y: 0.58, colour: BRAND.orange, delay: -3.2 },
];
const CLOUDS = [
  { y: 0.27, width: 0.2, seconds: 46, delay: -18, opacity: 0.72 },
  { y: 0.55, width: 0.15, seconds: 64, delay: -47, opacity: 0.6 },
];

function Plane({ width }: { width: number }) {
  return (
    <svg width={width} height={width * (30 / 36)} viewBox="0 0 36 30" aria-hidden style={{ display: 'block' }}>
      <path d="M19 13L11 2.5h3.6L25 13zM19 17l-8 10.5h3.6L25 17z" fill={BRAND.orange} stroke={BRAND.plum} strokeWidth="1" strokeLinejoin="round" />
      <path d="M7.5 13L4 7h2.6l4.4 6zM7.5 17L4 23h2.6l4.4-6z" fill={BRAND.pink} stroke={BRAND.plum} strokeWidth="1" strokeLinejoin="round" />
      <path d="M3 15c0-1.7 2-2.5 5-2.5h20c4 0 6.5 1.3 6.5 2.5s-2.5 2.5-6.5 2.5H8c-3 0-5-.8-5-2.5z" fill="#FFFFFF" stroke={BRAND.plum} strokeWidth="1.1" />
      <path d="M29 13.6c1.9.3 3.4.8 3.9 1.4h-3.9z" fill={BRAND.violet} />
    </svg>
  );
}

function Wisp({ width, opacity }: { width: number; opacity: number }) {
  return (
    <svg width={width} height={width * (16 / 60)} viewBox="0 0 60 16" aria-hidden style={{ display: 'block', opacity }}>
      <rect x="0" y="8" width="44" height="6" rx="3" fill="#FFFFFF" />
      <rect x="10" y="3" width="30" height="7" rx="3.5" fill="#FFFFFF" />
      <rect x="24" y="11" width="34" height="5" rx="2.5" fill="#FFFFFF" />
    </svg>
  );
}

export function GlobeLife({ size }: { size: number }) {
  const reduce = useReducedMotion();
  const plane = Math.max(20, Math.round(size * 0.075));
  const dot = Math.max(2, size * 0.0075);
  const ring = Math.max(14, Math.round(size * 0.06));
  const abs: CSSProperties = { position: 'absolute', left: 0, top: 0 };
  const parked = route(PARKED);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        clipPath: `circle(${DISK * 100}% at 50% 50%)`, WebkitClipPath: `circle(${DISK * 100}% at 50% 50%)`,
        '--gs': `${size}px`,
      } as CSSProperties}
    >
      {!reduce && <style>{PLANE_KEYFRAMES}</style>}

      {/* Cloud wisps, drifting west to east over the surface. */}
      {CLOUDS.map((c, i) => (
        <div
          key={`c${i}`}
          style={{
            ...abs, top: size * c.y,
            ...(reduce
              ? { transform: `translateX(${size * (i ? 0.58 : 0.18)}px)` }
              : { animation: `ringoCloud ${c.seconds}s linear ${c.delay}s infinite both` }),
          }}
        >
          <Wisp width={size * c.width} opacity={c.opacity} />
        </div>
      ))}

      {/* Signal pulses: a still dot at each city, a ring that swells and fades. */}
      {CITIES.map((c, i) => (
        <div key={`p${i}`} style={{ ...abs, left: size * c.x, top: size * c.y }}>
          {!reduce && (
            <div
              style={{
                position: 'absolute', left: -ring / 2, top: -ring / 2, width: ring, height: ring, borderRadius: '50%',
                border: `2px solid ${c.colour}`, boxSizing: 'border-box',
                animation: `ringoPulse 4.8s cubic-bezier(0.22, 1, 0.36, 1) ${c.delay}s infinite both`,
              }}
            />
          )}
          <div
            style={{
              position: 'absolute', left: -3.5, top: -3.5, width: 7, height: 7, borderRadius: '50%',
              background: c.colour, boxShadow: `0 0 0 1.5px ${BRAND.plum}`,
            }}
          />
        </div>
      ))}

      {/* The contrail: each dot lights as the plane passes, then fades. */}
      {!reduce && TRAIL.map((f) => {
        const p = route(f);
        return (
          <div
            key={`t${f}`}
            style={{
              ...abs, left: size * p.x - dot / 2, top: size * p.y - dot / 2, width: dot, height: dot, borderRadius: '50%',
              background: '#FFFFFF',
              animation: `ringoTrail ${PLANE_SECONDS}s linear ${(f * FLY - 1) * PLANE_SECONDS}s infinite both`,
            }}
          />
        );
      })}

      <div
        style={{
          ...abs,
          ...(reduce
            ? { transform: `translate(${size * parked.x}px, ${size * parked.y}px) rotate(${parked.heading}deg) scale(${parked.scale})` }
            : { animation: `ringoPlane ${PLANE_SECONDS}s linear infinite both` }),
        }}
      >
        <div style={{ transform: 'translate(-50%, -50%)' }}>
          <Plane width={plane} />
        </div>
      </div>
    </div>
  );
}

