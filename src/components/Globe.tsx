// Globe.tsx — the Earth seen from a little plane that flies a smooth, continuous
// great-circle world tour; the camera follows it so countries scroll beneath.
// Real coastlines (Natural Earth 110m — light enough to stay smooth on-device)
// via a d3-geo orthographic projection on a 2D canvas, sun-lit land + ocean,
// drifting ambient clouds, 3D monument icons standing on their real cities,
// and the ✈️ emoji plane trailed by a fluffy cloud.
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, geoInterpolate, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import { LANDMARK_SRC } from '../assets/landmarks3d';

const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;

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

// 3D monument icons standing on their real cities (one unique landmark each).
const MONUMENTS: { key: keyof typeof LANDMARK_SRC; lng: number; lat: number }[] = [
  { key: 'ferriswheel', lng: -0.12, lat: 51.5 }, // London Eye
  { key: 'classical', lng: 12.5, lat: 41.9 }, // Rome
  { key: 'mosque', lng: 29.0, lat: 41.0 }, // Istanbul
  { key: 'cityscape', lng: 55.3, lat: 25.2 }, // Dubai
  { key: 'temple', lng: 72.9, lat: 19.1 }, // Mumbai
  { key: 'tokyotower', lng: 139.7, lat: 35.7 }, // Tokyo
  { key: 'torii', lng: 135.8, lat: 35.0 }, // Kyoto
  { key: 'bridge', lng: 151.2, lat: -33.9 }, // Sydney
  { key: 'mountain', lng: -43.2, lat: -22.9 }, // Rio
  { key: 'liberty', lng: -74.0, lat: 40.7 }, // New York
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

    // Monument sprites — load once; drawn when their city faces the camera.
    const sprites = MONUMENTS.map((m) => {
      const img = new Image();
      img.src = LANDMARK_SRC[m.key];
      return { ...m, img };
    });

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
    const trail: [number, number][] = [];
    let lastTs = performance.now();
    let lastDraw = 0;

    // Sun-lit ocean — brighter at the light spot, deep sea toward the limb.
    const ocean = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.12, cx, cy, R);
    ocean.addColorStop(0, '#5FC4F5');
    ocean.addColorStop(0.5, '#2E93D6');
    ocean.addColorStop(1, '#124F92');
    // Land picks up the same light — spring green in the sun, forest in shadow.
    const landFill = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.1, cx, cy, R * 1.05);
    landFill.addColorStop(0, '#8ADB7E');
    landFill.addColorStop(0.55, '#57B364');
    landFill.addColorStop(1, '#2E7C46');
    // Day/night terminator — a stronger, rounder shadow gives the ball weight.
    const shade = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.28, cx + R * 0.14, cy + R * 0.16, R * 1.08);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.55, 'rgba(10,26,54,0.08)');
    shade.addColorStop(0.8, 'rgba(7,20,46,0.32)');
    shade.addColorStop(1, 'rgba(3,12,30,0.72)');
    const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 0, cx - R * 0.4, cy - R * 0.44, R * 0.55);
    hi.addColorStop(0, 'rgba(255,255,255,0.62)');
    hi.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
    atmo.addColorStop(0, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.82, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.94, 'rgba(178,230,255,0.38)');
    atmo.addColorStop(1, 'rgba(120,195,240,0.16)');

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
        const alpha = 0.42 * Math.min(1, edge * 1.7);
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

    // Monuments stand upright on their cities, growing as they face the camera.
    const drawMonuments = () => {
      const centre: [number, number] = [-lambda, -phi];
      const limit = Math.PI / 2 - 0.18; // fade out before the very edge
      const visible = sprites
        .map((s) => ({ s, d: geoDistance([s.lng, s.lat], centre) }))
        .filter(({ s, d }) => d < limit && s.img.complete && s.img.naturalWidth > 0)
        .sort((a, b) => b.d - a.d); // far ones first, near-centre on top
      if (!visible.length) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (const { s, d } of visible) {
        const pt = projection([s.lng, s.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit; // 1 at centre → 0 at the fade ring
        const w = R * (0.11 + 0.13 * edge);
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.25 + edge * 1.1);
        ctx.shadowColor = 'rgba(8,24,48,0.35)';
        ctx.shadowBlur = w * 0.18;
        ctx.shadowOffsetY = w * 0.06;
        // anchor the base of the monument on the city
        ctx.drawImage(s.img, pt[0] - w / 2, pt[1] - w * 0.82, w, w);
        ctx.restore();
      }
      ctx.restore();
    };

    // The ✈️ emoji plane with a fluffy cloud tagging along behind it.
    const drawPlane = () => {
      // Cloud-puff trail along the recent path — newest puffs tight and bright,
      // older ones spread and dissolve.
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < trail.length; i += 5) {
        const pt = projection(trail[i]);
        if (!pt) continue;
        const age = i / trail.length; // 0 = oldest, 1 = newest
        const rad = R * (0.055 - 0.03 * age);
        const alpha = 0.34 * age * age;
        if (alpha < 0.02) continue;
        const gr = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], rad);
        gr.addColorStop(0, `rgba(255,255,255,${alpha})`);
        gr.addColorStop(0.6, `rgba(255,255,255,${alpha * 0.5})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
        ctx.fill();
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

      // The chunky cartoon cloud right behind the plane (its loyal follower).
      const back = heading + Math.PI;
      const bx = p[0] + Math.cos(back) * R * 0.115;
      const by = p[1] + Math.sin(back) * R * 0.115;
      const puffs: [number, number, number][] = [
        [0, 0, R * 0.048],
        [-R * 0.045, R * 0.012, R * 0.036],
        [R * 0.042, R * 0.014, R * 0.034],
        [0, -R * 0.03, R * 0.032],
      ];
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (const [ox, oy, rad] of puffs) {
        const gr = ctx.createRadialGradient(bx + ox, by + oy, rad * 0.2, bx + ox, by + oy, rad);
        gr.addColorStop(0, 'rgba(255,255,255,0.92)');
        gr.addColorStop(0.7, 'rgba(255,255,255,0.75)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(bx + ox, by + oy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Apple's ✈️ glyph natively points south-west (nose bottom-left), so
      // rotate by heading − 135° to fly nose-first.
      const fs = Math.max(18, R * 0.17);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(heading - (3 * Math.PI) / 4);
      ctx.font = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillText('✈️', 0, 0);
      ctx.restore();
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
      ctx.fillStyle = landFill;
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,88,44,0.4)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();

      if (flying) drawClouds();
      if (flying) drawMonuments();

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

      if (flying) drawPlane();

      if (!reduce) raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
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
