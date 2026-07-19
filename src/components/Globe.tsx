// Globe.tsx — the Earth seen from a little plane that flies a smooth, continuous
// great-circle world tour; the camera follows it so countries scroll beneath.
// Major landmarks are REAL vector icons (each city its own distinct landmark, no
// emoji) that read as 4D — baked to sprites, lifted off the surface with a pinned
// contact shadow (parallax = height), a springy pop-in, a gentle bob and a hop as
// the plane flies over — coming as the plane nears and fading as it flies on.
// Real coastlines (Natural Earth 50m) via a d3-geo orthographic projection on a
// 2D canvas, a drifting cloud layer, and a blue-marble inner atmosphere (no halo).
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, geoInterpolate, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-50m.json';
import pinSrc from '../assets/landmarks3d/pin.webp';

const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

const TOUR: [number, number][] = [
  [-0.1, 51.5], // London
  [12.5, 41.9], // Rome
  [31.2, 30.0], // Cairo
  [55.3, 25.2], // Dubai
  [72.9, 19.1], // Mumbai
  [100.5, 13.7], // Bangkok
  [103.8, 1.35], // Singapore
  [139.7, 35.7], // Tokyo
  [151.2, -33.9], // Sydney
  [174.8, -36.8], // Auckland
  [-118.2, 34.1], // Los Angeles
  [-99.1, 19.4], // Mexico City
  [-74.1, 4.7], // Bogotá
  [-43.2, -22.9], // Rio
  [-58.4, -34.6], // Buenos Aires
  [3.4, 6.5], // Lagos
];

const ANG_SPEED = 0.16; // rad/s the plane travels along the surface

// One DISTINCT 3D landmark per city (kind → a Fluent 3D render, MIT-licensed).
// No emoji, no icon reused — Dubai and Istanbul are now different icons.
const LANDMARKS: { lng: number; lat: number; kind: string }[] = [
  { lng: -0.12, lat: 51.5, kind: 'ferriswheel' }, // London — London Eye
  { lng: 12.49, lat: 41.89, kind: 'classical' }, // Rome — Colosseum
  { lng: 28.98, lat: 41.0, kind: 'mosque' }, // Istanbul
  { lng: 55.27, lat: 25.2, kind: 'cityscape' }, // Dubai
  { lng: 72.88, lat: 19.07, kind: 'temple' }, // Mumbai
  { lng: 139.7, lat: 35.68, kind: 'tokyotower' }, // Tokyo
  { lng: 135.77, lat: 35.01, kind: 'torii' }, // Kyoto
  { lng: 151.2, lat: -33.86, kind: 'bridge' }, // Sydney — Harbour Bridge
  { lng: -43.2, lat: -22.9, kind: 'mountain' }, // Rio — Sugarloaf
  { lng: -74.04, lat: 40.69, kind: 'liberty' }, // New York — Statue of Liberty
];

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
    const R = size * 0.49;

    const projection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);
    const cloudProjection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const flying = size >= 150;

    // One real 3D map-pin (3dicons, CC0 — not an emoji) marks every city.
    const pin = new Image();
    pin.decoding = 'async';
    pin.src = pinSrc;

    const lmS = LANDMARKS.map(() => ({
      pop: 0, popV: 0, jump: 0, jumpV: 0, gd: 9,
      bobPh: Math.random() * Math.PI * 2, bobSp: 0.9 + Math.random() * 0.4,
      wasNear: false, vis: false,
    }));
    const order = LANDMARKS.map((_, i) => i);

    let seg = 0;
    let segT = 0;
    let planeLng = TOUR[0][0];
    let planeLat = TOUR[0][1];
    let aheadLng = TOUR[1][0];
    let aheadLat = TOUR[1][1];
    let lambda = -TOUR[0][0];
    let phi = -TOUR[0][1];
    let heading = NaN;
    let cloudOffset = 0;
    let tacc = 0;
    const trail: [number, number][] = [];
    let lastTs = performance.now();
    let lastDraw = 0;

    const ocean = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.12, cx, cy, R);
    ocean.addColorStop(0, '#4EB6EE');
    ocean.addColorStop(0.5, '#2E93D6');
    ocean.addColorStop(1, '#1567AC');
    const shade = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.28, cx + R * 0.14, cy + R * 0.16, R * 1.08);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.58, 'rgba(10,26,54,0.06)');
    shade.addColorStop(0.82, 'rgba(7,20,46,0.26)');
    shade.addColorStop(1, 'rgba(3,12,30,0.60)');
    const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 0, cx - R * 0.4, cy - R * 0.44, R * 0.5);
    hi.addColorStop(0, 'rgba(255,255,255,0.55)');
    hi.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    atmo.addColorStop(0, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.84, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.95, 'rgba(178,230,255,0.30)');
    atmo.addColorStop(1, 'rgba(120,195,240,0.12)');

    const dLimit = Math.PI / 2 - 0.05;

    const drawMarker = (i: number, baseSz: number) => {
      const lm = LANDMARKS[i];
      const s = lmS[i];
      const pop = reduce ? (geoDistance([lm.lng, lm.lat], [planeLng, planeLat]) < 0.6 && Math.cos(s.gd) > 0.15 ? 1 : 0) : Math.max(0, s.pop);
      if (pop < 0.02 || s.gd >= dLimit) { s.vis = false; return; }
      const pt = projection([lm.lng, lm.lat]);
      if (!pt) { s.vis = false; return; }
      const facing = Math.cos(s.gd);
      const persp = 0.85 + 0.15 * facing;
      const sz = baseSz * pop * persp;
      const bob = reduce ? 0 : Math.sin(tacc * s.bobSp + s.bobPh);
      const liftPx = sz * (0.28 + 0.10 * bob) + s.jump * baseSz * 0.6;
      const hN = Math.min(1, liftPx / (baseSz * 0.5));
      const vstr = clamp(1 + (s.popV + s.jumpV) * 0.012, 0.82, 1.28);

      ctx.save();
      ctx.globalAlpha = 0.26 * pop * (1 - 0.5 * hN);
      ctx.beginPath();
      ctx.ellipse(pt[0], pt[1] + baseSz * 0.06, sz * 0.3 * (1 - 0.15 * hN), sz * 0.11 * (0.6 + 0.4 * facing) * (1 - 0.15 * hN), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1a28';
      ctx.fill();
      ctx.restore();

      if (pin.complete && pin.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, pop * 1.5);
        ctx.translate(pt[0], pt[1] - liftPx);
        ctx.scale(1 / Math.sqrt(vstr), vstr);
        ctx.drawImage(pin, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      s.vis = true;
    };
    const drawLandmarks = () => {
      const baseSz = Math.max(22, R * 0.19); // 3D icons a touch larger for their detail
      order.sort((a, b) => lmS[b].gd - lmS[a].gd);
      for (const i of order) drawMarker(i, baseSz);
    };

    const drawClouds = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const centre: [number, number] = [-(lambda + cloudOffset), -phi];
      const limit = Math.PI / 2 - 0.02;
      for (const c of CLOUDS) {
        const d = geoDistance([c.lng, c.lat], centre);
        if (d >= limit) continue;
        const pt = cloudProjection([c.lng, c.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit;
        const alpha = 0.46 * Math.min(1, edge * 1.7);
        const rad = c.r * R * (0.55 + 0.45 * edge);
        const gr = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], rad);
        gr.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gr.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.45})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // A real vector plane (top-down airliner), nose pointing up (−y).
    const planePath = () => {
      const p = new Path2D();
      p.moveTo(0, -20);
      p.quadraticCurveTo(3.2, -14, 3.2, -4);
      p.lineTo(19, 6); p.lineTo(19, 11); p.lineTo(3.2, 6.5);
      p.lineTo(3.2, 16); p.lineTo(8, 21); p.lineTo(8, 24); p.lineTo(0, 22);
      p.lineTo(-8, 24); p.lineTo(-8, 21); p.lineTo(-3.2, 16);
      p.lineTo(-3.2, 6.5); p.lineTo(-19, 11); p.lineTo(-19, 6); p.lineTo(-3.2, -4);
      p.quadraticCurveTo(-3.2, -14, 0, -20);
      p.closePath();
      return p;
    };
    const PLANE = planePath();

    const drawPlane = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = projection(trail[i - 1]);
        const b = projection(trail[i]);
        if (!a || !b) continue;
        const age = i / trail.length;
        ctx.strokeStyle = `rgba(255,61,139,${0.55 * age})`;
        ctx.lineWidth = Math.max(1.4, R * 0.013 * age + R * 0.004);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.restore();

      const p = projection([planeLng, planeLat]);
      if (!p) return;
      const pa = projection([aheadLng, aheadLat]);
      const target = pa ? Math.atan2(pa[1] - p[1], pa[0] - p[0]) : (isNaN(heading) ? 0 : heading);
      if (isNaN(heading)) heading = target;
      else {
        let da = target - heading;
        da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        heading += da * 0.1;
      }
      const scl = Math.max(0.7, R * 0.008);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(heading + Math.PI / 2); // nose-up plane aligned to travel
      ctx.scale(scl, scl);
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 1.5;
      ctx.fillStyle = '#FFFFFF';
      ctx.fill(PLANE);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = 'rgba(28,20,14,0.5)';
      ctx.stroke(PLANE);
      ctx.restore();
    };

    const stepLandmarks = (dt: number) => {
      const sdt = Math.min(dt, 1 / 60);
      for (let i = 0; i < LANDMARKS.length; i++) {
        const lm = LANDMARKS[i];
        const s = lmS[i];
        s.gd = geoDistance([lm.lng, lm.lat], [-lambda, -phi]);
        const dPlane = geoDistance([lm.lng, lm.lat], [planeLng, planeLat]);
        const present = dPlane < 0.6 ? 1 : 0;
        s.popV += (170 * (present - s.pop) - 14 * s.popV) * sdt;
        s.pop += s.popV * sdt;
        const near = dPlane < 0.3;
        if (near && !s.wasNear) s.jumpV += 6;
        s.wasNear = near;
        s.jumpV += (-120 * s.jump - 9 * s.jumpV) * sdt;
        s.jump += s.jumpV * sdt;
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(R).rotate([lambda, phi, 0]);
      cloudProjection.scale(R).rotate([lambda + cloudOffset, phi, 0]);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();
      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = '#57B364';
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,88,44,0.45)';
      ctx.lineWidth = 0.4;
      ctx.stroke();
      ctx.restore();

      if (flying) drawClouds();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = hi;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = atmo;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(10,30,55,0.35)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      if (flying) {
        drawLandmarks();
        drawPlane();
      }

      if (!reduce) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      tacc += dt;
      cloudOffset += 0.9 * dt;

      if (flying) {
        let A = TOUR[seg];
        let B = TOUR[(seg + 1) % TOUR.length];
        let segLen = geoDistance(A, B) || 0.001;
        segT += (ANG_SPEED * dt) / segLen;
        while (segT >= 1) {
          const overshoot = (segT - 1) * segLen;
          seg = (seg + 1) % TOUR.length;
          A = TOUR[seg];
          B = TOUR[(seg + 1) % TOUR.length];
          segLen = geoDistance(A, B) || 0.001;
          segT = overshoot / segLen;
        }
        const interp = geoInterpolate(A, B);
        const pos = interp(segT);
        planeLng = pos[0];
        planeLat = pos[1];
        const ahead = interp(Math.min(1, segT + 0.03));
        aheadLng = ahead[0];
        aheadLat = ahead[1];
        trail.push([planeLng, planeLat]);
        if (trail.length > 140) trail.shift();

        const k = Math.min(1, dt * 2.4);
        const dL = (((-planeLng - lambda) % 360) + 540) % 360 - 180;
        lambda += dL * k;
        phi += (-planeLat - phi) * k;

        stepLandmarks(dt);
      } else {
        lambda += 6 * dt;
        phi += (-8 - phi) * Math.min(1, dt);
      }

      if (flying || now - lastDraw >= 33) {
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
