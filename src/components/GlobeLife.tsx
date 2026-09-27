// GlobeLife: small moving things on the near face of the landing globe
// (owner 2026-09-27: "make the sky have stars and other moving things on the
// globe"). Signal pulses pop at three city points to suggest connection.
// The plane and its chemtrail are drawn by the globe itself (Globe.tsx); the
// second plane and the cloud wisps that lived here were removed (owner
// 2026-09-27: "no need for clouds when you have a plane").
//
// It sits between the planet and the satellite's near orbit, clipped to the
// planet's disk. Every moving part is a CSS transform or opacity animation
// (no per-frame JavaScript, no animated filters), so WKWebView keeps it on the
// compositor. Reduced motion drops the pulses and keeps the still city dots.
import { type CSSProperties } from 'react';
import { BRAND } from '../theme';
import { useReducedMotion } from '../lib/useReducedMotion';

const DISK = 0.49; // the planet's radius, share of the box (as in Satellite.tsx)

const CITIES = [
  { x: 0.27, y: 0.38, colour: BRAND.amber, delay: 0 },
  { x: 0.75, y: 0.33, colour: BRAND.pink, delay: -1.6 },
  { x: 0.68, y: 0.58, colour: BRAND.orange, delay: -3.2 },
];

export function GlobeLife({ size }: { size: number }) {
  const reduce = useReducedMotion();
  const ring = Math.max(14, Math.round(size * 0.06));
  const abs: CSSProperties = { position: 'absolute', left: 0, top: 0 };

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        clipPath: `circle(${DISK * 100}% at 50% 50%)`, WebkitClipPath: `circle(${DISK * 100}% at 50% 50%)`,
      }}
    >
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
    </div>
  );
}
