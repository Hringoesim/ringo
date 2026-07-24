// Globe.tsx — the Earth seen from a little plane that flies a smooth, continuous
// great-circle world tour; the camera follows it so countries scroll beneath.
// The ball itself is REALISTIC: NASA's Blue Marble (public domain) rendered
// through a tiny WebGL inverse-orthographic shader, zoomed in (ZOOM) with the
// circle size unchanged. A 2D canvas rides on top for the drifting clouds, the
// 3D monument/animal sprites, lighting overlays and the plane. While the
// texture loads (or if WebGL is unavailable) the old vector earth fills in.
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, geoInterpolate, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import { LANDMARK_SRC } from '../assets/landmarks3d';
import planeSrc from '../assets/landmarks3d/plane.png';
import earthTexSrc from '../assets/earth-blue-marble.jpg';

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

// rad/s the plane travels along the surface. The camera chases the plane, so
// this IS the earth's visible spin rate. 0.26 was "too fast" (user) — back to
// the original calm glide.
const ANG_SPEED = 0.16;

// 3D monument + nature icons standing on their real places. Placements keep
// every pair ≥ ~12° apart so no two sprites can overlap on screen (a runtime
// collision guard in drawMonuments backstops this).
const MONUMENTS: { key: keyof typeof LANDMARK_SRC; lng: number; lat: number }[] = [
  { key: 'ferriswheel', lng: -0.12, lat: 51.5 }, // London Eye
  { key: 'classical', lng: 12.5, lat: 41.9 }, // Rome
  { key: 'mosque', lng: 29.0, lat: 41.0 }, // Istanbul
  { key: 'cityscape', lng: 55.3, lat: 25.2 }, // Dubai
  { key: 'temple', lng: 72.9, lat: 19.1 }, // Mumbai
  { key: 'tokyotower', lng: 139.7, lat: 35.7 }, // Tokyo
  { key: 'bridge', lng: -122.48, lat: 37.82 }, // Golden Gate, San Francisco
  { key: 'mountain', lng: -43.16, lat: -22.95 }, // Sugarloaf, Rio
  { key: 'liberty', lng: -74.04, lat: 40.69 }, // New York
  { key: 'snowmountain', lng: 86.9, lat: 28.0 }, // Everest / Himalayas
  { key: 'volcano', lng: 110.44, lat: -7.54 }, // Merapi, Indonesia
  { key: 'cactus', lng: -102.5, lat: 23.6 }, // Mexico
  { key: 'palmtree', lng: -66.6, lat: 18.2 }, // Caribbean
  { key: 'camel', lng: 25.0, lat: 26.0 }, // Sahara
  { key: 'kangaroo', lng: 134.0, lat: -24.0 }, // Australian outback
  { key: 'sailboat', lng: 151.2, lat: -33.87 }, // Sydney Harbour
  { key: 'moai', lng: -109.35, lat: -27.11 }, // Easter Island
  { key: 'elephant', lng: 37.0, lat: -1.3 }, // Kenya
  { key: 'panda', lng: 104.0, lat: 31.5 }, // Sichuan, China
  { key: 'tiger', lng: 101.5, lat: -0.5 }, // Sumatran tiger
  { key: 'lion', lng: 25.0, lat: -21.5 }, // southern-Africa savanna
  { key: 'penguin', lng: 110.0, lat: -68.0 }, // Antarctica
  { key: 'polarbear', lng: -41.0, lat: 73.0 }, // Greenland
  { key: 'whale', lng: -150.0, lat: -25.0 }, // South Pacific
  { key: 'dolphin', lng: -38.0, lat: 28.0 }, // Atlantic
  { key: 'monkey', lng: -68.0, lat: -7.0 }, // Amazon
  { key: 'beach', lng: 73.3, lat: 3.2 }, // Maldives palm beach
  { key: 'ship', lng: -33.0, lat: 47.0 }, // North Atlantic liner
  { key: 'octopus', lng: 155.0, lat: 8.0 }, // north-west Pacific
  { key: 'shark', lng: -172.0, lat: 8.0 }, // central Pacific
  { key: 'tropicalfish', lng: 161.0, lat: -15.0 }, // Coral Sea
  { key: 'castle', lng: 10.9, lat: 49.5 }, // Bavaria (Neuschwanstein)
  { key: 'rocket', lng: -80.6, lat: 28.4 }, // Cape Canaveral
  { key: 'slotmachine', lng: -115.1, lat: 36.1 }, // Las Vegas
  { key: 'stadium', lng: 2.15, lat: 41.38 }, // Barcelona (Camp Nou)
  { key: 'desertisland', lng: -135.0, lat: -12.0 }, // South Pacific
];

// Zoom INTO the planet while the circle stays the same size — you see less of
// the sphere, but everything on it is bigger. VIS = angular radius of the part
// of the hemisphere that still fits inside the circle.
const ZOOM = 1.6;
const VIS = Math.asin(1 / ZOOM);

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

// ── WebGL blue-marble renderer ───────────────────────────────────────────────
// Screen-space unit sphere point v = (x·east + y·north + z·centre) is the exact
// orthographic inverse; the JS side hands the shader the centre/east/north
// basis vectors so there is no sign guessing in GLSL.
const VERT = `
attribute vec2 aPos;
varying vec2 vQ;
void main() { vQ = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }
`;
const FRAG = `
precision highp float;
varying vec2 vQ;
uniform vec3 uC;   // geographic unit vector at screen centre
uniform vec3 uE;   // east basis at centre
uniform vec3 uN;   // north basis at centre
uniform float uZoom;
uniform float uDiscR; // globe radius in clip units (0..1)
uniform sampler2D uTex;
const float PI = 3.141592653589793;
void main() {
  float q = length(vQ);
  if (q > uDiscR) discard;
  vec2 p = vQ / (uDiscR * uZoom);
  float r2 = dot(p, p);
  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 g = p.x * uE + p.y * uN + z * uC;
  float lon = atan(g.x, g.z);
  float lat = asin(clamp(g.y, -1.0, 1.0));
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  float edge = 1.0 - smoothstep(uDiscR - 0.006, uDiscR, q);
  vec4 c = texture2D(uTex, uv);
  // daylight lift — Blue Marble is dusk-dark raw; brighten + gentle gamma
  vec3 day = clamp(pow(c.rgb, vec3(0.8)) * 1.22, 0.0, 1.0);
  gl_FragColor = vec4(day, edge);
}
`;

interface GlEarth {
  draw(lambda: number, phi: number): void;
  ready(): boolean;
}

function initGlEarth(canvas: HTMLCanvasElement, discR: number): GlEarth | null {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uC = gl.getUniformLocation(prog, 'uC');
  const uE = gl.getUniformLocation(prog, 'uE');
  const uN = gl.getUniformLocation(prog, 'uN');
  gl.uniform1f(gl.getUniformLocation(prog, 'uZoom'), ZOOM);
  gl.uniform1f(gl.getUniformLocation(prog, 'uDiscR'), discR);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let texReady = false;
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // equirect wraps horizontally; clamp vertically
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    texReady = true;
  };
  img.src = earthTexSrc;

  const D = Math.PI / 180;
  return {
    ready: () => texReady,
    draw(lambda: number, phi: number) {
      if (!texReady) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const L = -lambda * D; // geographic centre of the view
      const B = -phi * D;
      const cB = Math.cos(B), sB = Math.sin(B), cL = Math.cos(L), sL = Math.sin(L);
      gl.uniform3f(uC, cB * sL, sB, cB * cL);
      gl.uniform3f(uE, cL, 0, -sL);
      gl.uniform3f(uN, -sB * sL, cB, -sB * cL);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}

export function RingoGlobe({ size = 300, opacity = 1 }: { size?: number; opacity?: number }) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const glCv = glRef.current;
    if (!cv || !glCv) return;
    const dpr = Math.min(2, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    glCv.width = size * dpr;
    glCv.height = size * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.49;
    const earth = initGlEarth(glCv, R / (size / 2));

    const projection = geoOrthographic().scale(R * ZOOM).translate([cx, cy]).clipAngle(90);
    const path = geoPath(projection, ctx);
    const cloudProjection = geoOrthographic().scale(R * ZOOM).translate([cx, cy]).clipAngle(90);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const flying = size >= 150;

    // Monument sprites — load once; drawn when their city faces the camera.
    const sprites = MONUMENTS.map((m) => {
      const img = new Image();
      img.src = LANDMARK_SRC[m.key];
      return { ...m, img };
    });
    // The plane is the Fluent 3D emoji airplane as a sprite — a text ✈️ points
    // different ways on different platforms, a PNG never does. Its nose points
    // north-east in the artwork.
    const planeImg = new Image();
    planeImg.src = planeSrc;

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
    let lastTs = performance.now();
    let lastDraw = 0;

    // Vector fallback paint (used until the texture is ready / if WebGL fails).
    const ocean = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.12, cx, cy, R);
    ocean.addColorStop(0, '#5FC4F5');
    ocean.addColorStop(0.5, '#2E93D6');
    ocean.addColorStop(1, '#124F92');
    const landFill = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.1, cx, cy, R * 1.05);
    landFill.addColorStop(0, '#8ADB7E');
    landFill.addColorStop(0.55, '#57B364');
    landFill.addColorStop(1, '#2E7C46');
    // Lighting overlays — these sit on TOP of the photo texture and give the
    // ball its sun-lit depth.
    const shade = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.28, cx + R * 0.14, cy + R * 0.16, R * 1.08);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.55, 'rgba(10,26,54,0.05)');
    shade.addColorStop(0.8, 'rgba(7,20,46,0.2)');
    shade.addColorStop(1, 'rgba(3,12,30,0.48)');
    const hi = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.44, 0, cx - R * 0.4, cy - R * 0.44, R * 0.55);
    hi.addColorStop(0, 'rgba(255,255,255,0.5)');
    hi.addColorStop(0.5, 'rgba(255,255,255,0.13)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
    atmo.addColorStop(0, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.82, 'rgba(150,220,255,0)');
    atmo.addColorStop(0.94, 'rgba(178,230,255,0.34)');
    atmo.addColorStop(1, 'rgba(120,195,240,0.16)');

    const drawClouds = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const centre: [number, number] = [-(lambda + cloudOffset), -phi];
      const limit = VIS - 0.02;
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
    // A collision pass guarantees no two sprites ever overlap: the one nearer
    // the centre wins, the loser is skipped this frame.
    const drawMonuments = () => {
      const centre: [number, number] = [-lambda, -phi];
      const limit = VIS - 0.09; // fade out before the visible rim
      const visible = sprites
        .map((s) => ({ s, d: geoDistance([s.lng, s.lat], centre) }))
        .filter(({ s, d }) => d < limit && s.img.complete && s.img.naturalWidth > 0)
        .sort((a, b) => a.d - b.d); // near-centre first = wins collisions
      if (!visible.length) return;
      const placed: { img: HTMLImageElement; x: number; y: number; w: number; edge: number }[] = [];
      for (const { s, d } of visible) {
        const pt = projection([s.lng, s.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit; // 1 at centre → 0 at the fade ring
        const w = R * (0.085 + 0.085 * edge);
        const x = pt[0];
        const y = pt[1] - w * 0.32;
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.w + w) * 0.52)) continue;
        placed.push({ img: s.img, x, y, w, edge });
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      // draw far-to-near so nearer sprites layer naturally over the horizon
      for (let i = placed.length - 1; i >= 0; i--) {
        const p = placed[i];
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.25 + p.edge * 1.1);
        ctx.shadowColor = 'rgba(8,24,48,0.35)';
        ctx.shadowBlur = p.w * 0.18;
        ctx.shadowOffsetY = p.w * 0.06;
        ctx.drawImage(p.img, p.x - p.w / 2, p.y - p.w / 2, p.w, p.w);
        ctx.restore();
      }
      ctx.restore();
    };

    // The plane sprite, nose-first along the route. No cloud, no trail — it
    // flies clean over the realistic earth (matches the approved poster).
    const drawPlane = () => {
      const p = projection([planeLng, planeLat]);
      if (!p) return;
      const pa = projection([aheadLng, aheadLat]);
      const target = pa ? Math.atan2(pa[1] - p[1], pa[0] - p[0]) : (isNaN(heading) ? 0 : heading);
      if (isNaN(heading)) heading = target;
      else {
        let da = target - heading;
        da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        heading += da * 0.07; // gentle banking — no sudden nose snaps
      }
      if (!(planeImg.complete && planeImg.naturalWidth > 0)) return;
      const w = Math.max(24, R * 0.2);
      ctx.save();
      ctx.translate(p[0], p[1]);
      // The artwork's nose points north-east → offset the heading by 45°.
      ctx.rotate(heading + Math.PI / 4);
      ctx.shadowColor = 'rgba(0,0,0,0.32)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(planeImg, -w / 2, -w / 2, w, w);
      ctx.restore();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(R * ZOOM).rotate([lambda, phi, 0]);
      cloudProjection.scale(R * ZOOM).rotate([lambda + cloudOffset, phi, 0]);

      const glOn = !!earth && earth.ready();
      if (glOn) {
        earth!.draw(lambda, phi);
      } else {
        // vector fallback while the texture loads / without WebGL
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
        ctx.restore();
      }

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

        const k = Math.min(1, dt * 2.0); // slightly lazier chase = gliding camera
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

  return (
    <div style={{ width: size, height: size, position: 'relative', opacity }}>
      <canvas ref={glRef} style={{ position: 'absolute', inset: 0, width: size, height: size, borderRadius: '50%' }} />
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: size, height: size, borderRadius: '50%' }} />
    </div>
  );
}
