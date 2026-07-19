// Globe.tsx — an INTERACTIVE Earth. A plane flies a continuous great-circle
// world tour and the camera chases it; grab-and-drag to spin the globe yourself
// (with flick momentum), and it eases back to following the plane after you let
// go. Major landmarks read as 4D — sprite-baked emoji that lift off the surface
// with a pinned contact shadow (parallax = height), a springy pop-in, a gentle
// bob, and a hop when the plane flies over or you tap them. Real coastlines
// (Natural Earth 50m) via a d3-geo orthographic projection on a 2D canvas, with
// a drifting cloud layer and a blue-marble inner atmosphere (no outer halo).
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, geoInterpolate, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-50m.json';

const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// The world tour — a continuous eastbound loop that visits every continent.
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

const ANG_SPEED = 0.17; // rad/s the plane travels along the surface

// Cartoon landmark icons pinned to real coordinates — a playful, Ringo earth.
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

// A drifting cloud layer — parallax depth over the continents.
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
    const R = size * 0.49; // zoomed-in — the planet nearly fills the frame
    const DEG_PER_PX = 180 / (Math.PI * R); // exact 1:1 surface-under-finger at centre

    const projection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);
    const cloudProjection = geoOrthographic().scale(R).translate([cx, cy]).clipAngle(90);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const flying = size >= 150; // plane tour + interaction only on the large globe

    // Bake each unique emoji to an offscreen sprite once — drawImage per frame is
    // far cheaper than fillText×10 every frame (the real iOS cost).
    const sprites = new Map<string, HTMLCanvasElement>();
    for (const lm of LANDMARKS) {
      if (sprites.has(lm.icon)) continue;
      const sc = document.createElement('canvas');
      sc.width = 128;
      sc.height = 128;
      const sctx = sc.getContext('2d');
      if (sctx) {
        sctx.font = `${128 * 0.8}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillText(lm.icon, 64, 66);
      }
      sprites.set(lm.icon, sc);
    }

    // Per-landmark runtime state (LANDMARKS is a module const → parallel array).
    const lmS = LANDMARKS.map(() => ({
      pop: 0, popV: 0, jump: 0, jumpV: 0, gd: 9,
      bobPh: Math.random() * Math.PI * 2, bobSp: 0.9 + Math.random() * 0.4,
      wasNear: false, sx: 0, sy: 0, hit: 0, vis: false,
    }));
    const order = LANDMARKS.map((_, i) => i);

    // ── camera + plane state ────────────────────────────────────────────────
    let seg = 0;
    let segT = 0;
    let planeLng = TOUR[0][0];
    let planeLat = TOUR[0][1];
    let aheadLng = TOUR[1][0];
    let aheadLat = TOUR[1][1];
    let lambda = -TOUR[0][0];
    let phi = -TOUR[0][1];
    let cloudOffset = 0;
    let tacc = 0;
    const trail: [number, number][] = [];
    let lastTs = performance.now();
    let lastDraw = 0;

    // ── interaction state ─────────────────────────────────────────────────────
    let mode: 'tour' | 'drag' | 'coast' | 'idle' = 'tour';
    let velL = 0, velP = 0, autoGain = 1, idleSince = 0;
    let downX = 0, downY = 0, downT = 0, moved = false, lastX = 0, lastY = 0, lastMoveT = 0;
    let sL = 0, sP = 0, sX = 0, sY = 0;

    const xy = (e: PointerEvent): [number, number] => {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      const [x, y] = xy(e);
      mode = 'drag'; velL = 0; velP = 0;
      sL = lambda; sP = phi; sX = x; sY = y;
      downX = x; downY = y; downT = e.timeStamp; lastX = x; lastY = y; lastMoveT = e.timeStamp; moved = false;
      cv.style.cursor = 'grabbing';
      if (reduce) draw();
    };
    const onMove = (e: PointerEvent) => {
      if (mode !== 'drag') return;
      const [x, y] = xy(e);
      // absolute anchor from the grab point — drift-free, exact 1:1 at centre
      lambda = sL + (x - sX) * DEG_PER_PX;
      phi = clamp(sP - (y - sY) * DEG_PER_PX, -85, 85);
      const dtm = Math.max(0.008, (e.timeStamp - lastMoveT) / 1000);
      velL = 0.8 * velL + 0.2 * ((x - lastX) * DEG_PER_PX / dtm);
      velP = 0.8 * velP + 0.2 * (-(y - lastY) * DEG_PER_PX / dtm);
      if (Math.hypot(x - downX, y - downY) > 6) moved = true;
      lastX = x; lastY = y; lastMoveT = e.timeStamp; idleSince = e.timeStamp;
      if (reduce) draw();
    };
    const onUp = (e: PointerEvent) => {
      const [x, y] = xy(e);
      cv.style.cursor = 'grab';
      if (!moved && e.timeStamp - downT < 250) {
        // TAP → hop the nearest visible landmark
        let best = -1, bd = 1e9;
        for (let i = 0; i < lmS.length; i++) {
          const s = lmS[i];
          if (!s.vis) continue;
          const d = Math.hypot(x - s.sx, y - s.sy);
          if (d < s.hit && d < bd) { bd = d; best = i; }
        }
        if (best >= 0) { lmS[best].jumpV += 6; if (navigator.vibrate) navigator.vibrate(10); }
        mode = 'idle';
      } else {
        velL = clamp(velL, -360, 360); velP = clamp(velP, -360, 360);
        mode = Math.hypot(velL, velP) > 6 ? 'coast' : 'idle';
      }
      idleSince = e.timeStamp;
    };
    if (flying) {
      cv.style.touchAction = 'none';
      cv.style.userSelect = 'none';
      cv.style.cursor = 'grab';
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onUp);
    }

    // ── static gradients ──────────────────────────────────────────────────────
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

    // ── 4D landmark marker ─────────────────────────────────────────────────────
    const drawMarker = (i: number, baseSz: number) => {
      const lm = LANDMARKS[i];
      const s = lmS[i];
      const pop = reduce ? (Math.cos(s.gd) > 0.15 ? 1 : 0) : Math.max(0, s.pop);
      if (pop < 0.02 || s.gd >= dLimit) { s.vis = false; return; }
      const pt = projection([lm.lng, lm.lat]);
      if (!pt) { s.vis = false; return; }
      const facing = Math.cos(s.gd);
      const persp = 0.85 + 0.15 * facing; // grows as it turns toward you
      const sz = baseSz * pop * persp;
      const bob = reduce ? 0 : Math.sin(tacc * s.bobSp + s.bobPh);
      const liftPx = sz * (0.28 + 0.10 * bob) + s.jump * baseSz * 0.6; // rise + hover + hop
      const hN = Math.min(1, liftPx / (baseSz * 0.5)); // normalized height
      const vstr = clamp(1 + (s.popV + s.jumpV) * 0.012, 0.82, 1.28); // squash/stretch

      // LAYER 1 — pinned contact shadow (opposition to the lifted icon = height)
      ctx.save();
      ctx.globalAlpha = 0.26 * pop * (1 - 0.5 * hN);
      ctx.beginPath();
      ctx.ellipse(pt[0], pt[1] + baseSz * 0.04, sz * 0.33 * (1 - 0.15 * hN), sz * 0.12 * (0.6 + 0.4 * facing) * (1 - 0.15 * hN), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1a28';
      ctx.fill();
      ctx.restore();

      // LAYER 2 — the lifted icon, with squash/stretch from spring velocity
      const sprite = sprites.get(lm.icon);
      if (sprite) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, pop * 1.5);
        ctx.translate(pt[0], pt[1] - liftPx);
        ctx.scale(1 / Math.sqrt(vstr), vstr);
        ctx.drawImage(sprite, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      s.sx = pt[0]; s.sy = pt[1] - liftPx; s.hit = sz * 0.7; s.vis = true;
    };
    const drawLandmarks = () => {
      const baseSz = Math.max(14, R * 0.14);
      order.sort((a, b) => lmS[b].gd - lmS[a].gd); // far → near (painter's occlusion)
      for (const i of order) drawMarker(i, baseSz);
    };

    // ── drifting clouds ─────────────────────────────────────────────────────────
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

    // ── plane + contrail ───────────────────────────────────────────────────────
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
      const ang = pa ? Math.atan2(pa[1] - p[1], pa[0] - p[0]) : 0;
      const fs = Math.max(16, R * 0.15);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(ang + Math.PI / 4);
      ctx.font = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = fs * 0.18;
      ctx.shadowOffsetY = 1;
      ctx.fillText('✈️', 0, 0);
      ctx.restore();
    };

    // ── landmark simulation (springs) ──────────────────────────────────────────
    const stepLandmarks = (dt: number) => {
      const sdt = Math.min(dt, 1 / 60);
      for (let i = 0; i < LANDMARKS.length; i++) {
        const lm = LANDMARKS[i];
        const s = lmS[i];
        s.gd = geoDistance([lm.lng, lm.lat], [-lambda, -phi]);
        const present = Math.cos(s.gd) > 0.15 ? 1 : 0;
        s.popV += (170 * (present - s.pop) - 14 * s.popV) * sdt; // presence spring
        s.pop += s.popV * sdt;
        const near = geoDistance([lm.lng, lm.lat], [planeLng, planeLat]) < 0.30;
        if (near && !s.wasNear) s.jumpV += 6; // plane fly-over → hop
        s.wasNear = near;
        s.jumpV += (-120 * s.jump - 9 * s.jumpV) * sdt; // hop spring
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
        drawLandmarks(); // unclipped — lifted icons may crest the limb (depth cue)
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
        // plane advances UNCONDITIONALLY so the tour clock never teleports
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

        // interaction / camera machine
        if (mode === 'coast') {
          lambda += velL * dt;
          phi = clamp(phi + velP * dt, -85, 85);
          const f = Math.pow(0.95, dt * 60); // frame-rate-independent decay
          velL *= f; velP *= f;
          if (Math.hypot(velL, velP) < 6) { velL = velP = 0; mode = 'idle'; idleSince = now; }
        } else if (mode === 'idle') {
          if (now - idleSince > 2500) mode = 'tour'; // resume following the plane
        }
        // one blend scalar: 1 in tour, ~0 while you interact (smooth handoff/return)
        const wantTour = mode === 'tour';
        autoGain += ((wantTour ? 1 : 0) - autoGain) * Math.min(1, dt * (wantTour ? 1.5 : 8));
        const k = Math.min(1, dt * 2.6) * autoGain;
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
    return () => {
      cancelAnimationFrame(raf);
      if (flying) {
        cv.removeEventListener('pointerdown', onDown);
        cv.removeEventListener('pointermove', onMove);
        cv.removeEventListener('pointerup', onUp);
        cv.removeEventListener('pointercancel', onUp);
        cv.style.touchAction = '';
        cv.style.userSelect = '';
        cv.style.cursor = '';
      }
    };
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size, opacity, display: 'block', borderRadius: '50%' }} />;
}
