// Satellite: a small satellite on a tilted orbit around the landing globe
// (owner 2026-09-26: "add a satellite that is rotating above the globe").
//
// Depth without a 3D engine: the orbit is drawn twice, once under the globe
// and once over it. The copy under the globe runs the whole orbit, so the
// opaque planet hides it on the far side. The copy over the globe is the same
// motion with an opacity step that shows it only on the near half. Every
// moving part is a CSS transform or opacity animation, so WKWebView keeps it
// on the compositor: no layout, no JavaScript per frame.
//
// The ellipse comes from two eased sways (horizontal and vertical, a quarter
// period apart), tilted as one. Reduced motion holds the satellite still on
// the near side, a little right of centre.
import { useEffect, useState, type CSSProperties } from 'react';

export const ORBIT_SECONDS = 12;
const TILT = -14; // degrees
const RX = 0.52; // orbit half width, share of the globe size
const RY = 0.17; // orbit half height before the tilt
const LIFT = 0.28; // orbit centre sits this far above the globe centre
const STILL = 0.78; // reduced motion: where on the orbit to rest, in half turns

function useReducedMotion(): boolean {
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

// Flat illustration in the brand palette: an orange body, violet panels,
// a plum strut and a white dish.
function Craft({ width }: { width: number }) {
  return (
    <svg width={width} height={width * 0.5} viewBox="0 0 56 28" aria-hidden style={{ display: 'block', transform: 'translate(-50%, -50%) rotate(-8deg)', filter: 'drop-shadow(0 2px 3px rgba(26,15,46,0.35))' }}>
      <defs>
        <linearGradient id="ringoSatBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB83D" />
          <stop offset="1" stopColor="#FF5724" />
        </linearGradient>
      </defs>
      <rect x="15" y="13" width="26" height="2.4" rx="1.2" fill="#1A0F2E" />
      <g>
        <rect x="1" y="7" width="16" height="14" rx="2" fill="#8652E0" stroke="#1A0F2E" strokeWidth="1.2" />
        <path d="M6.3 7.6v12.8M11.6 7.6v12.8M1.6 14h14.8" stroke="#C9B3F5" strokeWidth="1" />
      </g>
      <g>
        <rect x="39" y="7" width="16" height="14" rx="2" fill="#8652E0" stroke="#1A0F2E" strokeWidth="1.2" />
        <path d="M44.3 7.6v12.8M49.6 7.6v12.8M39.6 14h14.8" stroke="#C9B3F5" strokeWidth="1" />
      </g>
      <rect x="21" y="6.5" width="14" height="15" rx="3" fill="url(#ringoSatBody)" stroke="#1A0F2E" strokeWidth="1.2" />
      <rect x="23.5" y="9" width="4" height="10" rx="1.5" fill="#FFFFFF" opacity="0.45" />
      <path d="M28 6.5V3.2" stroke="#1A0F2E" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M23.8 3.4a4.2 2.2 0 0 0 8.4 0z" fill="#FFFFFF" stroke="#1A0F2E" strokeWidth="1" />
    </svg>
  );
}

/** One side of the orbit: `back` sits under the globe, `front` over it. */
export function Orbit({ size, side }: { size: number; side: 'back' | 'front' }) {
  const reduce = useReducedMotion();
  const rx = size * RX;
  const ry = size * RY;
  const cx = size / 2;
  const cy = size / 2 - size * LIFT;
  const pad = size * 0.2;
  const craft = Math.max(34, Math.round(size * 0.16));
  const half = ORBIT_SECONDS / 2;
  const front = side === 'front';

  const sway = (name: string, delay = 0): CSSProperties => ({
    animation: `${name} ${half}s cubic-bezier(0.37, 0, 0.63, 1) ${delay}s infinite alternate both`,
  });
  // Reduced motion: the same point the animation would pass through.
  const t = STILL * Math.PI;
  const still = { x: -rx * Math.cos(t), y: ry * Math.sin(t), s: 0.93 + 0.15 * Math.sin(t) };

  const arc = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
  const dots = { fill: 'none', stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1.4, strokeDasharray: '1.5 6', strokeLinecap: 'round' as const };

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <svg
        width={size + pad * 2}
        height={size}
        viewBox={`${-pad} 0 ${size + pad * 2} ${size}`}
        style={{ position: 'absolute', left: -pad, top: 0, overflow: 'visible' }}
      >
        {front ? (
          <>
            <defs>
              <clipPath id="ringoSatDisk"><circle cx={size / 2} cy={size / 2} r={size * 0.49} /></clipPath>
            </defs>
            {/* Over the planet only the near arc shows; everywhere else the path under the globe does. */}
            <path d={arc} {...dots} clipPath="url(#ringoSatDisk)" transform={`rotate(${TILT} ${cx} ${cy})`} />
          </>
        ) : (
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...dots} transform={`rotate(${TILT} ${cx} ${cy})`} />
        )}
      </svg>
      <div style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, transform: `rotate(${TILT}deg)` }}>
        <div
          style={{
            '--rx': `${rx}px`, '--ry': `${ry}px`,
            ...(reduce
              ? { transform: `translateX(${still.x}px)`, opacity: 1 }
              : {
                  ...sway('ringoSatX'),
                  ...(front ? { animation: `${sway('ringoSatX').animation}, ringoSatNear ${ORBIT_SECONDS}s linear infinite both` } : null),
                }),
          } as CSSProperties}
        >
          <div
            style={{
              '--ry': `${ry}px`,
              ...(reduce ? { transform: `translateY(${still.y}px) scale(${still.s})` } : sway('ringoSatY', -ORBIT_SECONDS / 4)),
            } as CSSProperties}
          >
            <div style={{ transform: `rotate(${-TILT}deg)`, opacity: front ? 1 : 0.9 }}>
              <Craft width={craft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
