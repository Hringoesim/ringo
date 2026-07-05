// Globe.tsx — a realistic rotating Earth with a live flight simulation.
// Real coastlines (Natural Earth 110m land) drawn with a d3-geo orthographic
// projection onto a canvas. Flights are drawn in the SAME projection, so their
// great-circle arcs sit on the real countries and rotate with the globe; the
// destination flag pops up on landing (only while that country faces us).
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoGraticule10, geoDistance, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;
const GRATICULE = geoGraticule10() as unknown as GeoPermissibleObjects;

// Real cities (lng, lat) so arcs land on the actual countries.
const CITIES: { lng: number; lat: number; flag: string }[] = [
  { lng: -0.1, lat: 51.5, flag: '🇬🇧' },
  { lng: -74.0, lat: 40.7, flag: '🇺🇸' },
  { lng: 139.7, lat: 35.7, flag: '🇯🇵' },
  { lng: 55.3, lat: 25.2, flag: '🇦🇪' },
  { lng: 103.8, lat: 1.35, flag: '🇸🇬' },
  { lng: -3.7, lat: 40.4, flag: '🇪🇸' },
  { lng: -46.6, lat: -23.5, flag: '🇧🇷' },
  { lng: 28.0, lat: -26.2, flag: '🇿🇦' },
  { lng: 151.2, lat: -33.9, flag: '🇦🇺' },
  { lng: 13.4, lat: 52.5, flag: '🇩🇪' },
  { lng: 72.8, lat: 19.0, flag: '🇮🇳' },
  { lng: 4.35, lat: 50.85, flag: '🇧🇪' },
];

const NFLIGHTS = 5;
const DURATION = 1700; // ms in the air
const HOLD = 800; // ms the flag stays after landing

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
    let lambda = 0; // longitude rotation (degrees)
    let phi = -15; // latitude tilt (degrees) — gently tumbles N↔S
    let tacc = 0; // accumulated time (s) driving the tumble
    let scale = R; // projection scale — grows when zooming into a country
    let mode = 'roam'; // 'roam' (spin the world) | 'focus' (zoom a country)
    let modeT = 0; // time in the current mode (s)
    let focusI = 0; // city index being zoomed into
    let lastTs = performance.now();
    // ease an angle (deg) toward a target along the shortest path
    const easeAngle = (cur: number, target: number, k: number) => {
      const d = ((target - cur + 540) % 360) - 180;
      return cur + d * k;
    };
    let lastDraw = 0;
    const showGraticule = size >= 200;
    const showFlights = size >= 150;

    const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.08);
    glow.addColorStop(0, 'rgba(90,170,255,0.35)');
    glow.addColorStop(1, 'rgba(90,170,255,0)');
    const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.2, cx, cy, R);
    ocean.addColorStop(0, '#3AA3E8');
    ocean.addColorStop(0.65, '#1E6FB8');
    ocean.addColorStop(1, '#0E3F73');
    const shade = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.32, R * 0.45, cx, cy, R);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(2,12,30,0.45)');
    const hi = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.38, 0, cx - R * 0.34, cy - R * 0.38, R * 0.7);
    hi.addColorStop(0, 'rgba(255,255,255,0.35)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');

    // ── flight state ──────────────────────────────────────────────────────────
    const rnd = (n: number) => Math.floor(Math.random() * n);
    type Flight = { from: number; to: number; start: number };

    // Is a lng/lat currently on the near (visible) hemisphere? (small margin so
    // we don't pick a city right on the edge that's about to rotate away)
    const visible = (lng: number, lat: number) => geoDistance([lng, lat], [-lambda, -phi]) < Math.PI / 2 - 0.08;

    // Pick a fresh random route whose BOTH endpoints are on the visible face, so
    // the whole flight (leave → arrive) plays on screen. Fresh from/to every time
    // → lines come and go in all directions. Falls back to any pair.
    const newFlight = (now: number): Flight => {
      const vis = CITIES.map((_, i) => i).filter((i) => visible(CITIES[i].lng, CITIES[i].lat));
      const pool = vis.length >= 2 ? vis : CITIES.map((_, i) => i);
      const from = pool[rnd(pool.length)];
      let to = pool[rnd(pool.length)];
      let guard = 0;
      while (to === from && guard++ < 12) to = pool[rnd(pool.length)];
      return { from, to, start: now };
    };
    const now0 = performance.now();
    const flights: Flight[] = Array.from({ length: NFLIGHTS }, (_, i) => ({
      ...newFlight(now0),
      start: now0 + i * (DURATION * 0.42), // stagger
    }));

    const drawFlights = (now: number) => {
      const PINK = '#FF3D8B';
      for (let i = 0; i < NFLIGHTS; i++) {
        const f = flights[i];
        const A = CITIES[f.from];
        const B = CITIES[f.to];
        const elapsed = now - f.start;
        if (elapsed < 0) continue;
        if (elapsed > DURATION + HOLD) { flights[i] = newFlight(now); continue; }
        if (!visible(A.lng, A.lat) || !visible(B.lng, B.lat)) continue;
        const a = projection([A.lng, A.lat]);
        const b = projection([B.lng, B.lat]);
        if (!a || !b) continue;

        const flying = elapsed <= DURATION;
        const t = flying ? Math.min(1, elapsed / DURATION) : 1;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut

        // A 2D arc that bows OUTWARD from the globe centre — the line lifts off
        // the surface into the space around the planet, so it never covers a
        // country. Endpoints still sit on the real countries (projected).
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        let nx = mx - cx, ny = my - cy;
        let nl = Math.hypot(nx, ny);
        if (nl < 1) { nx = 0; ny = -1; nl = 1; }
        const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
        // gentle bow: the line lifts just off the surface and clearly connects
        // the two countries (not a big detached arc).
        const lift = dist * 0.16 + R * 0.06;
        const px = mx + (nx / nl) * lift;
        const py = my + (ny / nl) * lift;
        const q = (u: number): [number, number] => {
          const w = 1 - u;
          return [w * w * a[0] + 2 * w * u * px + u * u * b[0], w * w * a[1] + 2 * w * u * py + u * u * b[1]];
        };

        // arc revealed up to e
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        const N = 28;
        for (let k = 1; k <= N; k++) { const p = q((e * k) / N); ctx.lineTo(p[0], p[1]); }
        ctx.strokeStyle = PINK;
        ctx.lineWidth = Math.max(1.8, R * 0.022);
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255,61,139,0.9)';
        ctx.shadowBlur = R * 0.05;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // origin dot on its country
        ctx.beginPath();
        ctx.arc(a[0], a[1], Math.max(2.2, R * 0.022), 0, Math.PI * 2);
        ctx.fillStyle = PINK;
        ctx.fill();

        if (flying) {
          const h = q(e);
          ctx.beginPath();
          ctx.arc(h[0], h[1], Math.max(2.8, R * 0.03), 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = 'rgba(255,255,255,0.9)';
          ctx.shadowBlur = R * 0.035;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        } else {
          // destination flag on the country (no white circle)
          const fs = Math.max(16, R * 0.2);
          ctx.font = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = fs * 0.3;
          ctx.shadowOffsetY = 1;
          ctx.fillText(B.flag, b[0], b[1]);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }
      }
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(scale).rotate([lambda, phi, 0]);

      // atmosphere glow (behind, fixed to the disc)
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // earth content — clipped to the disc so a zoom stays inside the circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();

      if (showGraticule) {
        ctx.beginPath();
        path(GRATICULE);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = '#3E9B5F';
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,80,45,0.55)';
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

      // flights drawn LAST, unclipped — the arcs bow into the space around the
      // globe (above the surface), so they never cover a country.
      if (showFlights) drawFlights(now);

      if (!reduce) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      tacc += dt;
      modeT += dt;
      if (mode === 'roam') {
        // Spin the world, but speed UP over the empty Pacific so we don't dwell
        // on open ocean; tumble N↔S to show every continent.
        const centerLng = (((-lambda + 180) % 360) + 360) % 360 - 180;
        const overPacific = centerLng > 120 || centerLng < -120;
        lambda += (overPacific ? 16 : 5) * dt;
        const tumble = -12 + 17 * Math.sin(tacc * 0.32);
        phi += (tumble - phi) * Math.min(1, dt * 2.2);
        scale += (R - scale) * Math.min(1, dt * 2.5);
        if (modeT > 8) { mode = 'focus'; modeT = 0; focusI = rnd(CITIES.length); }
      } else {
        // Focus: ease to centre a real country and zoom in, hold, then roam on.
        const c = CITIES[focusI];
        lambda = easeAngle(lambda, -c.lng, Math.min(1, dt * 1.8));
        phi += (-c.lat - phi) * Math.min(1, dt * 1.8);
        scale += (R * 1.55 - scale) * Math.min(1, dt * 1.8);
        if (modeT > 4.5) { mode = 'roam'; modeT = 0; }
      }
      // Flights need smooth motion → draw every frame when flights are on;
      // otherwise throttle to ~30fps to save the main thread.
      if (showFlights || now - lastDraw >= 33) {
        lastDraw = now;
        draw(now);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size, opacity, display: 'block', borderRadius: '50%' }} />;
}
