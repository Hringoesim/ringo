// Globe.tsx — a realistic rotating Earth with a live flight simulation.
// Real coastlines (Natural Earth 50m land) drawn with a d3-geo orthographic
// projection onto a canvas. Flights are drawn in the SAME projection, so their
// great-circle arcs sit on the real countries and rotate with the globe; the
// destination flag pops up on landing (only while that country faces us).
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-50m.json';

const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;

// Real cities (lng, lat) so arcs land on the actual countries.
type City = { lng: number; lat: number; flag: string };
const CITY: Record<string, City> = {
  london: { lng: -0.1, lat: 51.5, flag: '🇬🇧' },
  newyork: { lng: -74.0, lat: 40.7, flag: '🇺🇸' },
  mexico: { lng: -99.1, lat: 19.4, flag: '🇲🇽' },
  buenosaires: { lng: -58.4, lat: -34.6, flag: '🇦🇷' },
  bogota: { lng: -74.1, lat: 4.7, flag: '🇨🇴' },
  madrid: { lng: -3.7, lat: 40.4, flag: '🇪🇸' },
  sydney: { lng: 151.2, lat: -33.9, flag: '🇦🇺' },
  bangkok: { lng: 100.5, lat: 13.7, flag: '🇹🇭' },
};

// Popular real routes. BOTH endpoints of every route sit on the same face of the
// globe, so when we spin that face toward the viewer they're both visible — the
// line always connects two countries you can actually see (no more USA→India
// where India is round the back).
const ROUTES: [string, string][] = [
  ['london', 'newyork'], // UK → USA
  ['newyork', 'mexico'], // USA → Mexico
  ['buenosaires', 'newyork'], // Argentina → USA
  ['bogota', 'madrid'], // Colombia → Spain
  ['sydney', 'bangkok'], // Australia → Thailand
  ['madrid', 'london'], // Spain → UK
];

const ORIENT = 1.1; // s spinning the globe to bring the next route into view
const FLY = 2.0; // s in the air (brisk, but still easy to follow)
const HOLD = 1.0; // s the flag stays after landing

// A springy ease that overshoots then settles — used for the arrival "pop".
const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function RingoGlobe({ size = 300, opacity = 1 }: { size?: number; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.45; // large disc; a small margin lets arcs bow just off the surface

    const projection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const showFlights = size >= 150;

    // ── the route the globe is currently showing ────────────────────────────
    const centreOf = (r: [string, string]) => {
      const A = CITY[r[0]], B = CITY[r[1]];
      return { lng: (A.lng + B.lng) / 2, lat: (A.lat + B.lat) / 2 };
    };
    // A gentle, clamped tilt — enough to frame the route squarely, never so much
    // that we're staring down at the Arctic.
    const tiltFor = (lat: number) => Math.max(-30, Math.min(30, -lat * 0.66));
    let routeI = 0;
    let phase: 'orient' | 'fly' | 'hold' = 'orient';
    let phaseT = 0; // s elapsed in the current phase
    // start already facing the first route so the opening frame is meaningful
    const c0 = centreOf(ROUTES[0]);
    let lambda = -c0.lng; // longitude rotation (degrees)
    let phi = tiltFor(c0.lat); // latitude tilt (degrees)
    let lastTs = performance.now();
    let lastDraw = 0;
    // ease an angle (deg) toward a target along the shortest path
    const easeAngle = (cur: number, target: number, k: number) => {
      const d = ((target - cur + 540) % 360) - 180;
      return cur + d * k;
    };

    // Ocean lit from the upper-left, deepening to a rich navy on the far side
    // (muted, satellite-like — not neon).
    const ocean = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.12, cx, cy, R);
    ocean.addColorStop(0, '#2C79B4');
    ocean.addColorStop(0.5, '#1A5A90');
    ocean.addColorStop(1, '#0A2C4E');
    // Directional day/night shade — clear on the lit side, deepening into the
    // lower-right for a real spherical falloff.
    const shade = ctx.createRadialGradient(cx - R * 0.36, cy - R * 0.4, R * 0.32, cx + R * 0.1, cy + R * 0.12, R * 1.05);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.72, 'rgba(6,20,44,0.14)');
    shade.addColorStop(1, 'rgba(3,12,30,0.6)');
    // Tight specular highlight where the light hits.
    const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 0, cx - R * 0.4, cy - R * 0.44, R * 0.55);
    hi.addColorStop(0, 'rgba(255,255,255,0.42)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');

    // ── flight drawing ──────────────────────────────────────────────────────
    // Draws the CURRENT route only: an arc bowing off the surface from origin to
    // destination, revealed as the plane flies, with the flag popping on landing.
    // Nothing is drawn while the globe is still spinning the route into view.
    const isVisible = (p: City) => geoDistance([p.lng, p.lat], [-lambda, -phi]) < Math.PI / 2 - 0.02;
    const drawFlight = () => {
      if (phase === 'orient') return;
      const r = ROUTES[routeI];
      const A = CITY[r[0]], B = CITY[r[1]];
      if (!isVisible(A) || !isVisible(B)) return; // both endpoints must be on the near face
      const a = projection([A.lng, A.lat]);
      const b = projection([B.lng, B.lat]);
      if (!a || !b) return;

      const flying = phase === 'fly';
      const t = flying ? Math.min(1, phaseT / FLY) : 1;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
      const PINK = '#FF3D8B';

      // A 2D arc bowing OUTWARD from the globe centre — the line lifts off the
      // surface so it never covers a country, but stays close enough to clearly
      // connect the two.
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      let nx = mx - cx, ny = my - cy;
      let nl = Math.hypot(nx, ny);
      if (nl < 1) { nx = 0; ny = -1; nl = 1; }
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // A gentle lift, clamped so the apex always stays comfortably inside the
      // disc (never clipped by the canvas, never a detached arc in space). Most
      // routes bow over open ocean, so it doesn't cover a country either.
      const lift = Math.min(dist * 0.13 + R * 0.05, R * 0.24);
      const px = mx + (nx / nl) * lift;
      const py = my + (ny / nl) * lift;
      const q = (u: number): [number, number] => {
        const w = 1 - u;
        return [w * w * a[0] + 2 * w * u * px + u * u * b[0], w * w * a[1] + 2 * w * u * py + u * u * b[1]];
      };

      // arc revealed up to e, drawn with a gradient that fades from the origin
      // into a bright leading edge — reads as motion, not a static wire.
      const head = q(e);
      const grad = ctx.createLinearGradient(a[0], a[1], head[0], head[1]);
      grad.addColorStop(0, 'rgba(255,61,139,0.25)');
      grad.addColorStop(0.6, 'rgba(255,61,139,0.9)');
      grad.addColorStop(1, '#FF5BA0');
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      const N = 40;
      for (let k = 1; k <= N; k++) { const p = q((e * k) / N); ctx.lineTo(p[0], p[1]); }
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.6, R * 0.02);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,61,139,0.55)';
      ctx.shadowBlur = R * 0.06;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // small origin dot marks where the trip begins
      ctx.beginPath();
      ctx.arc(a[0], a[1], Math.max(1.8, R * 0.015), 0, Math.PI * 2);
      ctx.fillStyle = PINK;
      ctx.fill();

      if (flying) {
        // a departure pulse ripples out from the origin as the plane takes off
        if (phaseT < 0.7) {
          const pr = phaseT / 0.7;
          ctx.beginPath();
          ctx.arc(a[0], a[1], (0.015 + 0.07 * pr) * R, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,61,139,${0.55 * (1 - pr)})`;
          ctx.lineWidth = Math.max(1, R * 0.008);
          ctx.stroke();
        }

        // a soft comet head leads the trail — a white core in a pink glow
        // (no arrow/plane marker)
        ctx.beginPath();
        ctx.arc(head[0], head[1], Math.max(4, R * 0.045), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,61,139,0.30)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(head[0], head[1], Math.max(2.4, R * 0.026), 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = R * 0.03;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      } else {
        // destination flag on the country (no white circle), popping in with a
        // little spring as the plane lands
        const pop = 0.55 + 0.45 * easeOutBack(Math.min(1, phaseT / 0.45));
        const fs = Math.max(15, R * 0.17);
        ctx.save();
        ctx.translate(b[0], b[1]);
        ctx.scale(pop, pop);
        ctx.font = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = fs * 0.3;
        ctx.shadowOffsetY = 1;
        ctx.fillText(B.flag, 0, 0);
        ctx.restore();
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(R).rotate([lambda, phi, 0]);

      // earth content — clipped to the disc (no halo/atmosphere ring)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();

      // land — natural satellite green, crisp 50m coastlines
      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = '#3C6E3A';
      ctx.fill();
      ctx.strokeStyle = 'rgba(22,52,20,0.5)';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = hi;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180,220,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // flight drawn LAST, unclipped — the arc bows into the space around the
      // globe (above the surface), so it never covers a country.
      if (showFlights) drawFlight();

      if (!reduce) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      phaseT += dt;

      // Spin the globe so the CURRENT route faces us, then hold it steady while
      // the plane flies — "spin the earth like that". The earth is driven by the
      // route, so origin and destination are always both in view.
      const c = centreOf(ROUTES[routeI]);
      // during orient we swing fast into place; once flying, we hold nearly still
      const k = phase === 'orient' ? Math.min(1, dt * 2.6) : Math.min(1, dt * 0.6);
      lambda = easeAngle(lambda, -c.lng, k);
      phi += (tiltFor(c.lat) - phi) * k;

      // advance the little state machine: orient → fly → hold → next route
      if (phase === 'orient' && phaseT >= ORIENT) { phase = 'fly'; phaseT = 0; }
      else if (phase === 'fly' && phaseT >= FLY) { phase = 'hold'; phaseT = 0; }
      else if (phase === 'hold' && phaseT >= HOLD) { routeI = (routeI + 1) % ROUTES.length; phase = 'orient'; phaseT = 0; }

      // Flights need smooth motion → draw every frame when flights are on;
      // otherwise throttle to ~30fps to save the main thread.
      if (showFlights || now - lastDraw >= 33) {
        lastDraw = now;
        draw();
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size, opacity, display: 'block', borderRadius: '50%' }} />;
}
