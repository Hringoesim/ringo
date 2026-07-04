// Globe.tsx — a realistic rotating Earth with a live flight simulation.
// Real coastlines (Natural Earth 110m land) drawn with a d3-geo orthographic
// projection onto a canvas. Flights are drawn in the SAME projection, so their
// great-circle arcs sit on the real countries and rotate with the globe; the
// destination flag pops up on landing (only while that country faces us).
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance, type GeoPermissibleObjects } from 'd3-geo';
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

const NFLIGHTS = 3;
const DURATION = 1700; // ms in the air
const HOLD = 700; // ms the flag stays after landing

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
    const R = size / 2 - size * 0.04;

    const projection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let lambda = 0; // longitude rotation (degrees)
    const TILT = -18;
    let lastTs = performance.now();
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
    const visible = (lng: number, lat: number) => geoDistance([lng, lat], [-lambda, -TILT]) < Math.PI / 2 - 0.08;

    // Pick a route whose BOTH endpoints are on the visible face right now, so the
    // whole flight (leave → arrive) plays on screen. Falls back to any pair.
    const newFlight = (prev: number, now: number): Flight => {
      const vis = CITIES.map((_, i) => i).filter((i) => visible(CITIES[i].lng, CITIES[i].lat));
      const pool = vis.length >= 2 ? vis : CITIES.map((_, i) => i);
      const from = prev >= 0 && pool.includes(prev) ? prev : pool[rnd(pool.length)];
      let to = pool[rnd(pool.length)];
      let guard = 0;
      while (to === from && guard++ < 12) to = pool[rnd(pool.length)];
      return { from, to, start: now };
    };
    const now0 = performance.now();
    const flights: Flight[] = Array.from({ length: NFLIGHTS }, (_, i) => ({
      ...newFlight(-1, now0),
      start: now0 + i * (DURATION * 0.5), // stagger
    }));

    const drawFlights = (now: number) => {
      for (let i = 0; i < NFLIGHTS; i++) {
        const f = flights[i];
        const a = CITIES[f.from];
        const b = CITIES[f.to];
        const elapsed = now - f.start;
        if (elapsed < 0) continue;
        if (elapsed > DURATION + HOLD) { flights[i] = newFlight(f.to, now); continue; }

        const flying = elapsed <= DURATION;
        const t = flying ? Math.min(1, elapsed / DURATION) : 1;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
        const interp = geoInterpolate([a.lng, a.lat], [b.lng, b.lat]);

        const PINK = '#FF3D8B';
        // origin marker so the arc clearly starts on its country
        if (visible(a.lng, a.lat)) {
          const oxy = projection([a.lng, a.lat]);
          if (oxy) {
            ctx.beginPath();
            ctx.arc(oxy[0], oxy[1], Math.max(2.2, R * 0.018), 0, Math.PI * 2);
            ctx.fillStyle = PINK;
            ctx.fill();
          }
        }

        // arc revealed up to e — geoPath clips it to the visible hemisphere.
        const steps = 26;
        const coords: [number, number][] = [];
        for (let k = 0; k <= steps; k++) coords.push(interp((e * k) / steps) as [number, number]);
        ctx.beginPath();
        path({ type: 'LineString', coordinates: coords } as GeoPermissibleObjects);
        ctx.strokeStyle = PINK;
        ctx.lineWidth = Math.max(1.8, R * 0.02);
        ctx.setLineDash([]);
        ctx.shadowColor = 'rgba(255,61,139,0.85)';
        ctx.shadowBlur = R * 0.045;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        if (flying) {
          // plane dot at the head of the arc (if on the near side)
          const head = interp(e) as [number, number];
          if (visible(head[0], head[1])) {
            const xy = projection(head);
            if (xy) {
              ctx.beginPath();
              ctx.arc(xy[0], xy[1], Math.max(2.6, R * 0.024), 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.fill();
            }
          }
        } else {
          // landed → flag chip at destination while it faces us
          if (visible(b.lng, b.lat)) {
            const xy = projection([b.lng, b.lat]);
            if (xy) {
              const rr = Math.max(10, R * 0.11);
              ctx.beginPath();
              ctx.arc(xy[0], xy[1], rr, 0, Math.PI * 2);
              ctx.fillStyle = '#FFFFFF';
              ctx.shadowColor = 'rgba(0,0,0,0.35)';
              ctx.shadowBlur = rr * 0.5;
              ctx.shadowOffsetY = rr * 0.2;
              ctx.fill();
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.shadowOffsetY = 0;
              ctx.font = `${rr * 1.25}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(b.flag, xy[0], xy[1] + rr * 0.05);
            }
          }
        }
      }
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.rotate([lambda, TILT, 0]);

      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

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

      // flights sit on the surface, above land, below the limb shading
      if (showFlights) drawFlights(now);

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

      if (!reduce) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      lambda += 4 * dt; // very slow spin (~90s per rotation) — easy to follow
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
