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

const SPIN = 6; // deg/s — the globe spins CONSTANTLY, never settling
const FLY = 2.2; // s in the air
const HOLD = 1.2; // s the flag stays after landing
const IDLE = 0.6; // s gap between flights

// Cartoon 3D-style landmark icons (Apple emoji render glossy/3D) pinned to real
// coordinates — a playful, unmistakably-Ringo earth.
const LANDMARKS: { lng: number; lat: number; icon: string }[] = [
  { lng: 2.35, lat: 48.85, icon: '🗼' }, // Paris
  { lng: -74.04, lat: 40.69, icon: '🗽' }, // New York
  { lng: -0.12, lat: 51.5, icon: '🎡' }, // London
  { lng: 139.7, lat: 35.68, icon: '🏯' }, // Tokyo
  { lng: 12.49, lat: 41.89, icon: '🏛️' }, // Rome
  { lng: 55.27, lat: 25.2, icon: '🕌' }, // Dubai
  { lng: -122.4, lat: 37.8, icon: '🌉' }, // San Francisco
  { lng: 151.2, lat: -33.86, icon: '🏙️' }, // Sydney
  { lng: 28.98, lat: 41.0, icon: '🕌' }, // Istanbul
  { lng: -43.2, lat: -22.9, icon: '⛰️' }, // Rio
];

// A drifting cloud layer — soft white puffs pinned to geo coords, rotating a
// touch FASTER than the surface so they parallax over the continents. That
// independent motion is what gives the globe its depth / "alive" feel.
const CLOUDS: { lng: number; lat: number; r: number }[] = [
  { lng: -30, lat: 22, r: 0.30 }, { lng: -62, lat: -12, r: 0.34 },
  { lng: 18, lat: 6, r: 0.26 }, { lng: 58, lat: 32, r: 0.30 },
  { lng: 102, lat: -18, r: 0.36 }, { lng: 140, lat: 12, r: 0.28 },
  { lng: 172, lat: -34, r: 0.30 }, { lng: -122, lat: 42, r: 0.32 },
  { lng: -92, lat: -30, r: 0.26 }, { lng: 2, lat: 52, r: 0.24 },
  { lng: 46, lat: -42, r: 0.28 }, { lng: -150, lat: 8, r: 0.34 },
  { lng: 122, lat: 46, r: 0.26 }, { lng: -18, lat: -26, r: 0.30 },
  { lng: 82, lat: 22, r: 0.24 }, { lng: 158, lat: 28, r: 0.28 },
];

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
    const R = size * 0.49; // zoomed-in — the planet nearly fills the frame (close camera)

    const projection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);
    // A second sphere for the clouds — same size, rotated slightly ahead of the
    // surface so the two layers drift apart (parallax depth).
    const cloudProjection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const showFlights = size >= 150;

    // ── the route the globe is currently showing ────────────────────────────
    // The globe spins constantly; a flight only plays on a route whose BOTH
    // endpoints are comfortably on the near face right now (so no impossible line,
    // and it stays visible for the whole short flight as the earth keeps turning).
    let phase: 'idle' | 'fly' | 'hold' = 'idle';
    let phaseT = 0; // s elapsed in the current phase
    let cur: [string, string] | null = null; // route currently flying
    let lastRoute = ''; // avoid repeating the same route back-to-back
    let lambda = -40; // longitude rotation (degrees) — advances every frame
    let cloudLambda = -40; // clouds drift a touch faster → parallax
    let phi = -12; // latitude tilt (degrees) — gently tumbles
    let tacc = 0; // time accumulator for the tumble
    let lastTs = performance.now();
    let lastDraw = 0;
    const geoToCentre = (p: City) => geoDistance([p.lng, p.lat], [-lambda, -phi]);
    // Pick the best-framed visible route (both endpoints well inside the near
    // face), not the one just shown; null if nothing is nicely in view yet.
    const pickRoute = (): [string, string] | null => {
      const margin = Math.PI / 2 - 0.55; // ~31° in from the limb
      let best: [string, string] | null = null;
      let bestScore = Infinity;
      for (const r of ROUTES) {
        const key = r.join('>');
        if (key === lastRoute) continue;
        const dA = geoToCentre(CITY[r[0]]), dB = geoToCentre(CITY[r[1]]);
        if (dA >= margin || dB >= margin) continue;
        const score = Math.max(dA, dB); // prefer the most centred route
        if (score < bestScore) { bestScore = score; best = r; }
      }
      return best;
    };

    // Ocean lit from the upper-left, deepening to a rich navy on the far side
    // (muted, satellite-like — not neon).
    // Bright, friendly "Ringo" ocean — a cheerful cartoon blue, lit upper-left.
    const ocean = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.12, cx, cy, R);
    ocean.addColorStop(0, '#4EB6EE');
    ocean.addColorStop(0.5, '#2E93D6');
    ocean.addColorStop(1, '#1567AC');
    // Day/night terminator — deepened so the globe reads as a lit SPHERE with
    // real form (the far side falls into dusk), while the palette stays warm.
    const shade = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.28, cx + R * 0.14, cy + R * 0.16, R * 1.08);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.58, 'rgba(10,26,54,0.06)');
    shade.addColorStop(0.82, 'rgba(7,20,46,0.26)');
    shade.addColorStop(1, 'rgba(3,12,30,0.60)');
    // Bright, tight specular where the sun hits the upper-left ocean — a strong
    // 3D cue that the surface curves toward the light.
    const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 0, cx - R * 0.4, cy - R * 0.44, R * 0.5);
    hi.addColorStop(0, 'rgba(255,255,255,0.55)');
    hi.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    // Inner atmosphere — a cool bright limb hugging the INSIDE of the sphere
    // (the "blue-marble" glow), clipped to the disc so it's on the planet, never
    // an outer halo ring.
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    atmo.addColorStop(0, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.84, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.95, 'rgba(178,230,255,0.30)');
    atmo.addColorStop(1, 'rgba(120,195,240,0.12)');

    // ── flight drawing ──────────────────────────────────────────────────────
    // Draws the CURRENT route only: an arc bowing off the surface from origin to
    // destination, revealed as the plane flies, with the flag popping on landing.
    // Nothing is drawn while the globe is still spinning the route into view.
    const isVisible = (p: City) => geoDistance([p.lng, p.lat], [-lambda, -phi]) < Math.PI / 2 - 0.02;
    const drawFlight = () => {
      if (!cur || phase === 'idle') return;
      const r = cur;
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
      const lift = Math.min(dist * 0.11 + R * 0.04, R * 0.15);
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

    // ── cartoon landmarks + a sailing boat ──────────────────────────────────
    const drawEmojiAt = (lng: number, lat: number, icon: string, sz: number) => {
      if (geoDistance([lng, lat], [-lambda, -phi]) >= Math.PI / 2 - 0.06) return; // round the back
      const pt = projection([lng, lat]);
      if (!pt) return;
      ctx.font = `${sz}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = sz * 0.16;
      ctx.shadowOffsetY = 1;
      ctx.fillText(icon, pt[0], pt[1]); // baseline on the coordinate → icon stands on it
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    };
    // Soft cloud puffs on their own (faster) sphere — the parallax layer that
    // gives the globe depth. Foreshortened + faded toward the limb so they wrap.
    const drawClouds = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const centre: [number, number] = [-cloudLambda, -phi];
      const limit = Math.PI / 2 - 0.02;
      for (const c of CLOUDS) {
        const d = geoDistance([c.lng, c.lat], centre);
        if (d >= limit) continue;
        const pt = cloudProjection([c.lng, c.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit; // 1 at centre → 0 at the limb
        const alpha = 0.46 * Math.min(1, edge * 1.7);
        const rad = c.r * R * (0.55 + 0.45 * edge);
        const g = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], rad);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.45})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    const drawLandmarks = () => {
      const sz = Math.max(12, R * 0.15);
      for (const lm of LANDMARKS) drawEmojiAt(lm.lng, lm.lat, lm.icon, sz);
      // a little boat sailing eastward across the Pacific, bobbing as it goes
      const boatLng = -178 + ((tacc * 4) % 82);
      const boatLat = 6 + 2.4 * Math.sin(tacc * 0.7);
      drawEmojiAt(boatLng, boatLat, '⛵', Math.max(13, R * 0.15));
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(R).rotate([lambda, phi, 0]);
      cloudProjection.scale(R).rotate([cloudLambda, phi, 0]);

      // earth content — clipped to the disc (no halo/atmosphere ring)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();

      // land — bright, friendly "Ringo" green, crisp 50m coastlines
      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = '#57B364';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,88,44,0.45)';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      ctx.restore();

      // drifting cloud layer — parallax depth over the surface
      if (showFlights) drawClouds();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = hi;
      ctx.fillRect(0, 0, size, size);
      // inner atmosphere limb (on the sphere, clipped — not an outer halo)
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      // No halo/atmosphere ring and no bright rim — just the sphere against the bg.
      // A whisper-thin dark edge keeps the disc crisp without glowing.
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(10,30,55,0.35)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // cartoon landmarks + the sailing boat sit on the surface
      if (showFlights) drawLandmarks();

      // flight drawn LAST, unclipped — the arc bows into the space around the
      // globe (above the surface), so it never covers a country.
      if (showFlights) drawFlight();

      if (!reduce) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      phaseT += dt;
      tacc += dt;

      // CONSTANT spin — the earth is always turning; plus a gentle N↔S tumble so
      // every continent drifts into view over time.
      lambda += SPIN * dt;
      cloudLambda += SPIN * 1.13 * dt; // 13% faster → clouds visibly parallax over land
      const tumble = -13 + 11 * Math.sin(tacc * 0.22);
      phi += (tumble - phi) * Math.min(1, dt * 1.2);

      // idle → fly → hold → idle. A flight starts only when a route is nicely in
      // view; if none is (yet), we keep spinning and check again next frame.
      if (phase === 'idle') {
        if (phaseT >= IDLE) { const r = pickRoute(); if (r) { cur = r; lastRoute = r.join('>'); phase = 'fly'; phaseT = 0; } }
      } else if (phase === 'fly') {
        if (phaseT >= FLY) { phase = 'hold'; phaseT = 0; }
      } else if (phaseT >= HOLD) {
        phase = 'idle'; phaseT = 0; cur = null;
      }

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
