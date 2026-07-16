// Globe.tsx — the Earth seen from a little plane touring the world. A plane
// flies a continuous great-circle loop around real countries; the CAMERA
// follows it, so the globe turns to keep the plane in view and every country
// scrolls beneath as it circumnavigates. Real coastlines (Natural Earth 50m)
// via a d3-geo orthographic projection on a canvas, with a drifting cloud
// layer, a blue-marble atmosphere, and cartoon landmarks on the surface.
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, geoInterpolate, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-50m.json';

const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;

// The world tour — a continuous eastbound loop that visits every continent, so
// over one lap you fly over Europe, Africa, the Middle East, South & SE Asia,
// East Asia, Oceania, the Americas and back. [lng, lat].
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

const ANG_SPEED = 0.17; // rad/s the plane travels along the surface (leisurely)

// Cartoon 3D-style landmark icons (Apple emoji render glossy/3D) pinned to real
// coordinates — a playful, unmistakably-Ringo earth. Seen as the plane passes.
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

// A drifting cloud layer — soft white puffs pinned to geo coords, drifting a
// touch faster than the surface so they parallax over the continents (depth).
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
    const R = size * 0.49; // zoomed-in — the planet nearly fills the frame (close camera)

    const projection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);
    // A second sphere for the clouds — drifts relative to the surface (parallax).
    const cloudProjection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const flying = size >= 150; // plane tour only on the large landing globe

    // ── camera + plane state ────────────────────────────────────────────────
    let seg = 0; // current tour segment (waypoint i → i+1)
    let segT = 0; // 0..1 progress along the current segment
    let planeLng = TOUR[0][0]; // plane position (follows the great-circle path)
    let planeLat = TOUR[0][1];
    let aheadLng = TOUR[1][0]; // a point just ahead, for heading
    let aheadLat = TOUR[1][1];
    let lambda = -TOUR[0][0]; // camera longitude — follows the plane
    let phi = -TOUR[0][1]; // camera latitude — follows the plane
    let cloudOffset = 0; // clouds' extra longitude vs the surface (parallax)
    let tacc = 0;
    const trail: [number, number][] = []; // recent plane positions → contrail
    let lastTs = performance.now();
    let lastDraw = 0;

    // Bright, friendly "Ringo" ocean — a cheerful cartoon blue, lit upper-left.
    const ocean = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.12, cx, cy, R);
    ocean.addColorStop(0, '#4EB6EE');
    ocean.addColorStop(0.5, '#2E93D6');
    ocean.addColorStop(1, '#1567AC');
    // Day/night terminator — deepened so the globe reads as a lit SPHERE.
    const shade = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.28, cx + R * 0.14, cy + R * 0.16, R * 1.08);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.58, 'rgba(10,26,54,0.06)');
    shade.addColorStop(0.82, 'rgba(7,20,46,0.26)');
    shade.addColorStop(1, 'rgba(3,12,30,0.60)');
    // Bright, tight specular where the sun hits the upper-left ocean.
    const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 0, cx - R * 0.4, cy - R * 0.44, R * 0.5);
    hi.addColorStop(0, 'rgba(255,255,255,0.55)');
    hi.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    // Inner atmosphere — a cool bright limb on the INSIDE of the sphere.
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    atmo.addColorStop(0, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.84, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.95, 'rgba(178,230,255,0.30)');
    atmo.addColorStop(1, 'rgba(120,195,240,0.12)');

    // ── surface icons (landmarks) ───────────────────────────────────────────
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
      ctx.fillText(icon, pt[0], pt[1]);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    };
    const drawLandmarks = () => {
      const sz = Math.max(12, R * 0.14);
      for (const lm of LANDMARKS) drawEmojiAt(lm.lng, lm.lat, lm.icon, sz);
    };

    // Soft cloud puffs on their own drifting sphere — parallax depth.
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

    // ── the plane + its contrail ────────────────────────────────────────────
    const drawPlane = () => {
      // contrail — the path just flown, fading with age, clipped to the surface
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = projection(trail[i - 1]);
        const b = projection(trail[i]);
        if (!a || !b) continue;
        const age = i / trail.length; // 0 oldest → 1 newest
        ctx.strokeStyle = `rgba(255,61,139,${0.55 * age})`;
        ctx.lineWidth = Math.max(1.4, R * 0.013 * age + R * 0.004);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.restore();

      // the plane itself, banked along its heading
      const p = projection([planeLng, planeLat]);
      if (!p) return;
      const pa = projection([aheadLng, aheadLat]);
      const ang = pa ? Math.atan2(pa[1] - p[1], pa[0] - p[0]) : 0;
      const fs = Math.max(16, R * 0.15);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(ang + Math.PI / 4); // ✈️ nominally points up-right; align nose to travel
      ctx.font = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = fs * 0.18;
      ctx.shadowOffsetY = 1;
      ctx.fillText('✈️', 0, 0);
      ctx.restore();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(R).rotate([lambda, phi, 0]);
      cloudProjection.scale(R).rotate([lambda + cloudOffset, phi, 0]);

      // earth content — clipped to the disc
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

      // whisper-thin dark edge keeps the disc crisp (no glowing halo)
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
      cloudOffset += 0.9 * dt; // clouds drift east over the surface (parallax)

      if (flying) {
        // advance the plane along the great-circle tour at ~constant speed
        let A = TOUR[seg];
        let B = TOUR[(seg + 1) % TOUR.length];
        let segLen = geoDistance(A, B) || 0.001;
        segT += (ANG_SPEED * dt) / segLen;
        while (segT >= 1) {
          const overshoot = (segT - 1) * segLen; // carry leftover ARC, not t
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

        // camera eases toward the plane (chase-cam — the plane leads slightly),
        // taking the shortest way around in longitude.
        const k = Math.min(1, dt * 2.6);
        let dL = (((-planeLng - lambda) % 360) + 540) % 360 - 180;
        lambda += dL * k;
        phi += (-planeLat - phi) * k;

        trail.push([planeLng, planeLat]);
        if (trail.length > 150) trail.shift();
      } else {
        // small globe (icons): a simple gentle spin, no plane
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
