// NightSky: stars in the dark upper part of the welcome sky, fading out where
// the sunset begins, and a shooting star now and then (owner 2026-09-27:
// "make the sky have stars").
//
// Positions come from a fixed seed, so every launch on a given screen shows
// the same sky. Stars never land in a clear zone around the wordmark, so the
// logo's contrast against the plum is untouched, and none are spent behind
// the globe. Most stars are one static SVG; a subset twinkles as separate
// opacity layers with varied durations. The shooting star is one element on a
// 33 second loop with three streaks 9, 13 and 11 seconds apart, flying either
// across the band above the logo or, when that band is too thin (compact
// screens), down the corner beside it. Reduced motion keeps the stars still
// and drops the shooting star.
import { useMemo, type CSSProperties } from 'react';
import { BRAND } from '../theme';
import { useReducedMotion } from '../lib/useReducedMotion';

export interface SkyGeometry {
  width: number;
  /** the wordmark's box, relative to the sky */
  logo: { left: number; right: number; top: number; bottom: number };
  /** the globe's centre and size, relative to the sky */
  globeX: number;
  globeY: number;
  globe: number;
}

const SEED = 20260927;
const CANDIDATES = 170;
const MAX_STARS = 64;
const MAX_TWINKLE = 14;
const CLEAR_X = 22; // clear zone around the logo box, pt
const CLEAR_Y = 16;

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star { x: number; y: number; d: number; o: number; twinkle?: { s: number; delay: number } }

function makeStars(g: SkyGeometry): Star[] {
  const rand = mulberry32(SEED);
  const fadeStart = g.globeY - g.globe * 0.45;
  const fadeEnd = g.globeY + g.globe * 0.05;
  const r = g.globe * 0.49 + 3;
  const out: Star[] = [];
  let twinkles = 0;
  for (let i = 0; i < CANDIDATES; i++) {
    // Draw every number first, so a star's place never depends on its neighbours being kept.
    const x = rand() * g.width;
    const y = rand() * fadeEnd;
    const d = 1 + rand() * 1.5;
    const base = 0.5 + rand() * 0.5;
    const s = 2.6 + rand() * 3.2;
    const phase = rand();
    if (out.length >= MAX_STARS) continue;
    const fade = y <= fadeStart ? 1 : Math.max(0, (fadeEnd - y) / (fadeEnd - fadeStart));
    if (fade < 0.2) continue;
    const L = g.logo;
    if (x > L.left - CLEAR_X && x < L.right + CLEAR_X && y > L.top - CLEAR_Y && y < L.bottom + CLEAR_Y) continue;
    if (Math.hypot(x - g.globeX, y - g.globeY) < r) continue;
    const star: Star = { x, y, d, o: base * fade };
    if (i % 3 === 0 && twinkles < MAX_TWINKLE) {
      star.twinkle = { s, delay: -phase * s };
      twinkles++;
    }
    out.push(star);
  }
  return out;
}

// The shooting star's path: head start, travel and angle, in the sky's px.
function meteorPath(g: SkyGeometry) {
  const band = g.logo.top - CLEAR_Y;
  if (band >= 48) {
    const x0 = g.width * 0.94, y0 = band * 0.18;
    return { x0, y0, dx: -g.width * 0.58, dy: band * 0.62 };
  }
  // Beside the logo: from the top right corner down towards it, stopping short of its clear zone.
  const x0 = g.width - 6, y0 = 4;
  const dx = -(x0 - (g.logo.right + CLEAR_X + 6));
  return { x0, y0, dx, dy: Math.min(-dx * 0.62, Math.max(24, g.globeY - g.globe * 0.5)) };
}

export function NightSky({ geometry }: { geometry: SkyGeometry }) {
  const reduce = useReducedMotion();
  const { width, logo, globeX, globeY, globe } = geometry;
  const stars = useMemo(
    () => makeStars({ width, logo, globeX, globeY, globe }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, logo.left, logo.right, logo.top, logo.bottom, globeX, globeY, globe],
  );
  const height = Math.ceil(globeY + globe * 0.05);
  const meteor = meteorPath(geometry);
  const angle = (Math.atan2(meteor.dy, meteor.dx) * 180) / Math.PI;
  const tail = Math.min(90, Math.max(44, Math.hypot(meteor.dx, meteor.dy) * 0.45));

  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: '100%', height, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, display: 'block' }}>
        {stars.filter((s) => reduce || !s.twinkle).map((s, i) => (
          <circle key={i} cx={s.x.toFixed(1)} cy={s.y.toFixed(1)} r={(s.d / 2).toFixed(2)} fill={BRAND.starlight} opacity={s.o.toFixed(2)} />
        ))}
      </svg>
      {!reduce && stars.filter((s) => s.twinkle).map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: s.x - s.d / 2, top: s.y - s.d / 2, width: s.d, height: s.d, borderRadius: '50%',
            background: BRAND.starlight, '--o': s.o.toFixed(2),
            animation: `ringoTwinkle ${s.twinkle!.s.toFixed(2)}s ease-in-out ${s.twinkle!.delay.toFixed(2)}s infinite alternate both`,
          } as CSSProperties}
        />
      ))}
      {!reduce && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0,
            '--x0': `${meteor.x0.toFixed(1)}px`, '--y0': `${meteor.y0.toFixed(1)}px`,
            '--dx': `${meteor.dx.toFixed(1)}px`, '--dy': `${meteor.dy.toFixed(1)}px`,
            animation: 'ringoMeteor 33s linear 3s infinite both',
          } as CSSProperties}
        >
          {/* The head sits on the element's origin; the tail trails back along the path. */}
          <div
            style={{
              position: 'absolute', right: 0, top: -0.8, width: tail, height: 1.6, borderRadius: 1,
              transformOrigin: '100% 50%', transform: `rotate(${angle.toFixed(1)}deg)`,
              background: `linear-gradient(90deg, rgba(255,246,236,0) 0%, rgba(255,246,236,0.55) 70%, ${BRAND.starlight} 100%)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
