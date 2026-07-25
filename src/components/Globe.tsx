// Globe.tsx — the Earth seen from a little plane that flies a smooth, continuous
// great-circle world tour; the camera follows it so countries scroll beneath.
// Real coastlines (Natural Earth 110m — light enough to stay smooth on-device)
// via a d3-geo orthographic projection on a 2D canvas, sun-lit land + ocean,
// drifting ambient clouds, 3D monument icons standing on their real cities,
// and the 3D plane sprite flying the tour clean (no cloud, no trail).
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoDistance, geoInterpolate, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import { LANDMARK_SRC } from '../assets/landmarks3d';
import planeSrc from '../assets/landmarks3d/plane.png';

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
// this IS the earth's visible spin rate. Tuned down twice on user feedback
// (0.26 -> 0.16 -> 0.10): a slow, dreamy drift.
const ANG_SPEED = 0.10;

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
  { key: 'snowman', lng: 100.0, lat: 66.0 }, // Siberian winter
  { key: 'evergreen', lng: -115.0, lat: 57.0 }, // Canadian boreal forest
  { key: 'tent', lng: -71.0, lat: -44.0 }, // Patagonia camping
  { key: 'crab', lng: -175.0, lat: 58.0 }, // Bering Sea
  { key: 'butterfly', lng: -56.0, lat: -15.0 }, // Brazilian highlands
  { key: 'horse', lng: 105.0, lat: 47.0 }, // Mongolian steppe
  { key: 'wolf', lng: 48.0, lat: 56.0 }, // Russian forest
  { key: 'bear', lng: -90.0, lat: 54.0 }, // Hudson Bay woods
  { key: 'eagle', lng: -98.0, lat: 40.0 }, // Great Plains, USA
  { key: 'flamingo', lng: -62.0, lat: -33.0 }, // Argentine pampas
  { key: 'gorilla', lng: 20.0, lat: 2.0 }, // Congo jungle
  { key: 'parrot', lng: -60.0, lat: 3.0 }, // Amazon jungle
  { key: 'dragon', lng: 119.0, lat: 30.0 }, // eastern China
];

// Zoom INTO the planet while the circle stays the same size — you see less of
// the sphere, but everything on it is bigger. VIS = angular radius of the part
// of the hemisphere that still fits inside the circle.
const ZOOM = 1.85;
const VIS = Math.asin(1 / ZOOM);
// terrain was art-directed at zoom 1.35 — keep its coverage proportional
const TS = ZOOM / 1.35;

// Hand-drawn cartoon terrain — big rivers, forest patches, mountain ranges.
// Points are chosen well inside coastlines so nothing spills into the sea.
const RIVERS: [number, number][][] = [
  [[-73, -4], [-67, -3.5], [-60, -3], [-55, -2.5], [-50.5, -0.8]], // Amazon
  [[32.9, 30.5], [31.2, 27], [32.5, 22], [33, 18], [32.5, 15.5]], // Nile
  [[-95.2, 46.5], [-91, 42], [-90.5, 36], [-91, 31], [-89.6, 29.5]], // Mississippi
  [[93, 32], [97, 30], [104, 29], [112, 30], [117.5, 31.5]], // Yangtze
  [[27.5, 0.5], [23, 2], [18, 1], [15.5, -4]], // Congo
  [[84, 52], [81, 58], [74, 62], [67, 66]], // Ob
  [[78, 29.5], [82, 26], [87.5, 24.5]], // Ganges
  [[8.5, 48.5], [13, 48], [19, 46.5], [25, 45.5], [29, 45.3]], // Danube
  [[37, 57], [45, 52], [46, 48], [47.5, 46.5]], // Volga
  [[100, 20], [104, 16], [105.5, 12.5], [106, 10.8]], // Mekong
  [[74, 34], [71, 30], [68, 26.5]], // Indus
  [[-7, 13.5], [0, 16.5], [5, 12], [6.5, 7]], // Niger
  [[147, -31], [143, -34], [139.8, -35]], // Murray-Darling
  [[-51, -21], [-55, -25], [-58, -30], [-59.5, -33]], // Paraná
  [[24, -14], [28, -16], [33, -18.5]], // Zambezi
  [[92, 53], [89, 58], [86, 63], [84, 67]], // Yenisei
];
const DESERTS: { lng: number; lat: number; r: number }[] = [
  // The Sahara as the vast band it really is — tiled edge to edge
  { lng: -12, lat: 22.5, r: 0.075 }, { lng: -4, lat: 24, r: 0.09 }, { lng: 5, lat: 22, r: 0.095 },
  { lng: 14, lat: 23, r: 0.095 }, { lng: 23, lat: 25.5, r: 0.08 }, { lng: 30, lat: 27, r: 0.06 },
  { lng: 46, lat: 22, r: 0.065 }, // Arabian
  { lng: 52, lat: 19.5, r: 0.055 }, // Rub' al Khali
  { lng: 54, lat: 32, r: 0.05 }, // Iranian plateau
  { lng: 105, lat: 43, r: 0.065 }, // Gobi
  { lng: 82, lat: 39, r: 0.055 }, // Taklamakan
  { lng: 60, lat: 40, r: 0.05 }, // Karakum
  { lng: 128, lat: -25.5, r: 0.075 }, { lng: 133, lat: -24.5, r: 0.075 }, { lng: 122, lat: -27, r: 0.06 }, // outback band
  { lng: 21, lat: -23.5, r: 0.055 }, // Kalahari
  { lng: 15.5, lat: -22.5, r: 0.035 }, // Namib
  { lng: 46, lat: 8, r: 0.04 }, // Horn of Africa
  { lng: 71.5, lat: 26.5, r: 0.04 }, // Thar
  { lng: -111, lat: 36, r: 0.045 }, // US southwest
  { lng: -105, lat: 31, r: 0.05 }, // Chihuahuan
  { lng: -103, lat: 25, r: 0.055 }, // central Mexican plateau
  { lng: -111, lat: 29.5, r: 0.04 }, // Sonoran
  { lng: -69.5, lat: -23.5, r: 0.03 }, // Atacama
  { lng: -69, lat: -45.5, r: 0.045 }, // Patagonian steppe
];
const FORESTS: { lng: number; lat: number; r: number }[] = [
  // The Amazon JUNGLE — deep green across the whole basin
  { lng: -66, lat: -4.5, r: 0.09 }, { lng: -58, lat: -4, r: 0.085 }, { lng: -52, lat: -2.5, r: 0.06 },
  // The Congo JUNGLE — central Africa's great rainforest
  { lng: 20, lat: 0.5, r: 0.085 }, { lng: 26, lat: 1.5, r: 0.06 }, { lng: 14, lat: 0, r: 0.05 },
  { lng: -112, lat: 58, r: 0.06 }, // Canadian boreal
  { lng: -76, lat: 48, r: 0.045 }, // Quebec
  { lng: 27, lat: 63, r: 0.045 }, // Scandinavia
  { lng: 95, lat: 60, r: 0.07 }, // Siberian taiga
  { lng: 128, lat: 60, r: 0.055 }, // East Siberia
  { lng: 105, lat: 16, r: 0.045 }, // SE Asia
  { lng: 113, lat: 0.5, r: 0.045 }, // Borneo rainforest
  { lng: 15, lat: 51, r: 0.035 }, // central-European woods
  { lng: -84, lat: 36, r: 0.035 }, // Appalachian woods
  { lng: 132, lat: -5, r: 0.05 }, // New Guinea rainforest
];
const RANGES: { lng: number; lat: number; s: number }[] = [
  { lng: -116, lat: 51, s: 1 }, { lng: -110, lat: 44, s: 0.85 }, { lng: -106, lat: 39, s: 0.9 }, // Rockies
  { lng: -70, lat: -14, s: 0.9 }, { lng: -70, lat: -24, s: 1 }, { lng: -71, lat: -34, s: 0.85 }, // Andes
  { lng: 8, lat: 46.4, s: 0.8 }, { lng: 11.5, lat: 46.8, s: 0.7 }, // Alps
  { lng: 77, lat: 34, s: 0.9 }, { lng: 81, lat: 31, s: 1 }, // Himalayas
  { lng: 59, lat: 58, s: 0.7 }, { lng: 60.5, lat: 64, s: 0.7 }, // Urals
  { lng: 38.5, lat: 10, s: 0.75 }, // Ethiopian highlands
  { lng: 43.5, lat: 42.8, s: 0.75 }, // Caucasus
  { lng: -6.5, lat: 31.5, s: 0.65 }, // Atlas
  { lng: 170.2, lat: -43.6, s: 0.7 }, // Southern Alps, NZ
  { lng: 99, lat: 38, s: 0.7 }, // Qilian / western China
  { lng: 8, lat: 61.5, s: 0.6 }, // Scandinavian mountains
  { lng: -79, lat: 38.5, s: 0.6 }, // Appalachians
  { lng: 148.5, lat: -30, s: 0.6 }, // Great Dividing Range
  { lng: 47.5, lat: 33.5, s: 0.65 }, // Zagros
  { lng: 80, lat: 42.5, s: 0.75 }, // Tian Shan
  { lng: 29, lat: -29.5, s: 0.6 }, // Drakensberg
];
// Sandy shores where the famous beaches are — small sand crescents that sit
// half on the coastline, half in the shallows.
const BEACHES: { lng: number; lat: number; r: number }[] = [
  { lng: -86.8, lat: 21.1, r: 0.032 }, // Cancún
  { lng: -43.18, lat: -23.0, r: 0.028 }, // Copacabana, Rio
  { lng: 153.4, lat: -28.0, r: 0.032 }, // Gold Coast
  { lng: 98.3, lat: 7.9, r: 0.028 }, // Phuket
  { lng: 1.4, lat: 38.9, r: 0.026 }, // Ibiza
  { lng: 115.2, lat: -8.7, r: 0.028 }, // Bali
  { lng: -80.15, lat: 25.9, r: 0.028 }, // Miami
  { lng: 39.3, lat: -6.2, r: 0.026 }, // Zanzibar
  { lng: 73.9, lat: 15.4, r: 0.026 }, // Goa
  { lng: -8.7, lat: 37.1, r: 0.026 }, // Algarve
  { lng: 25.4, lat: 37.2, r: 0.024 }, // Mykonos
  { lng: 122.0, lat: 11.9, r: 0.024 }, // Boracay
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
    const trail: [number, number][] = []; // chemtrail — recent path points
    let lastTs = performance.now();
    let lastDraw = 0;

    // ── Drag-to-spin: touch the planet and turn it yourself; after a short
    // pause the camera glides back to the plane (the chase lerp does the
    // catching up, so the hand-off is seamless).
    let dragging = false;
    let resumeAt = 0;
    let lastPX = 0;
    let lastPY = 0;
    const degPerPx = (2 * VIS * 180) / Math.PI / size; // visible span / canvas px
    const onDown = (e: PointerEvent) => {
      if (!flying) return;
      dragging = true;
      lastPX = e.clientX;
      lastPY = e.clientY;
      cv.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastPX;
      const dy = e.clientY - lastPY;
      lastPX = e.clientX;
      lastPY = e.clientY;
      // The surface FOLLOWS the finger: drag down → the earth rolls down,
      // drag right → it rolls right (centre moves the opposite way).
      lambda += dx * degPerPx;
      phi -= dy * degPerPx;
      phi = Math.max(-85, Math.min(85, phi));
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resumeAt = performance.now() + 1400;
    };
    // Trackpad/wheel over the planet spins it the way you scroll — scroll down
    // and the surface rolls down with you (and the page never scrolls).
    const onWheel = (e: WheelEvent) => {
      if (!flying) return;
      e.preventDefault();
      // Same rule as the finger: scroll down → the earth rolls down.
      phi -= e.deltaY * degPerPx * 0.9;
      phi = Math.max(-85, Math.min(85, phi));
      lambda += e.deltaX * degPerPx * 0.9;
      resumeAt = performance.now() + 1400;
    };
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });

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

    // Cartoon terrain — forest patches, big rivers, snow-capped ranges — all in
    // the rotating projection so they ride the globe like the coastlines do.
    const drawTerrain = () => {
      const centre: [number, number] = [-lambda, -phi];
      const limit = VIS - 0.04;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      // deserts first — sandy-yellow land patches (the Nile cuts through later)
      for (const f of DESERTS) {
        const d = geoDistance([f.lng, f.lat], centre);
        if (d >= limit) continue;
        const pt = projection([f.lng, f.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit;
        const rad = f.r * R * TS * (0.5 + 0.5 * edge);
        const a = Math.min(1, edge * 1.6);
        // beige, not yellow — reads as sand next to the green grasslands
        const gr = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], rad);
        gr.addColorStop(0, `rgba(226,206,166,${0.9 * a})`);
        gr.addColorStop(0.65, `rgba(222,201,158,${0.55 * a})`);
        gr.addColorStop(1, 'rgba(222,201,158,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // beaches — bright sand crescents hugging famous coastlines
      for (const b of BEACHES) {
        const d = geoDistance([b.lng, b.lat], centre);
        if (d >= limit) continue;
        const pt = projection([b.lng, b.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit;
        const rad = b.r * R * TS * (0.55 + 0.45 * edge);
        const a = Math.min(1, edge * 1.7);
        const gr = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], rad);
        gr.addColorStop(0, `rgba(244,224,176,${0.95 * a})`);
        gr.addColorStop(0.6, `rgba(240,218,166,${0.55 * a})`);
        gr.addColorStop(1, 'rgba(240,218,166,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // forests next (rivers cut through them)
      for (const f of FORESTS) {
        const d = geoDistance([f.lng, f.lat], centre);
        if (d >= limit) continue;
        const pt = projection([f.lng, f.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit;
        const rad = f.r * R * TS * (0.5 + 0.5 * edge);
        const gr = ctx.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], rad);
        gr.addColorStop(0, `rgba(24,104,46,${0.62 * Math.min(1, edge * 1.6)})`);
        gr.addColorStop(0.7, `rgba(24,104,46,${0.38 * Math.min(1, edge * 1.6)})`);
        gr.addColorStop(1, 'rgba(24,104,46,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      // rivers — ocean-blue threads over the land
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const river of RIVERS) {
        const mid = river[Math.floor(river.length / 2)];
        const d = geoDistance(mid, centre);
        if (d >= limit) continue;
        const edge = 1 - d / limit;
        ctx.strokeStyle = `rgba(46,140,206,${0.9 * Math.min(1, edge * 1.8)})`;
        ctx.lineWidth = Math.max(0.8, R * 0.009 * TS * (0.6 + 0.4 * edge));
        ctx.beginPath();
        let started = false;
        for (const p of river) {
          const pt = projection(p);
          if (!pt) { started = false; continue; }
          if (!started) { ctx.moveTo(pt[0], pt[1]); started = true; }
          else ctx.lineTo(pt[0], pt[1]);
        }
        ctx.stroke();
      }
      // mountain ranges — little cartoon peaks with snow caps
      for (const m of RANGES) {
        const d = geoDistance([m.lng, m.lat], centre);
        if (d >= limit) continue;
        const pt = projection([m.lng, m.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit;
        const h = R * 0.045 * TS * m.s * (0.55 + 0.45 * edge);
        const w = h * 1.25;
        const a = Math.min(1, edge * 1.8);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(pt[0] - w, pt[1]);
        ctx.lineTo(pt[0], pt[1] - h);
        ctx.lineTo(pt[0] + w, pt[1]);
        ctx.closePath();
        ctx.fillStyle = '#5E7D63';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pt[0] - w * 0.34, pt[1] - h * 0.58);
        ctx.lineTo(pt[0], pt[1] - h);
        ctx.lineTo(pt[0] + w * 0.34, pt[1] - h * 0.58);
        ctx.lineTo(pt[0] + w * 0.18, pt[1] - h * 0.46);
        ctx.lineTo(pt[0] - w * 0.18, pt[1] - h * 0.46);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

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
      const placed: { x: number; y: number; w: number; edge: number; img: HTMLImageElement }[] = [];
      for (const { s, d } of visible) {
        const pt = projection([s.lng, s.lat]);
        if (!pt) continue;
        const edge = 1 - d / limit; // 1 at centre → 0 at the fade ring
        const w = R * (0.085 + 0.085 * edge);
        const x = pt[0];
        const y = pt[1] - w * 0.32;
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.w + w) * 0.52)) continue;
        placed.push({ x, y, w, edge, img: s.img });
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
    // flies clean (user call).
    const drawPlane = () => {
      const p = projection([planeLng, planeLat]);
      if (!p) return;
      const pa = projection([aheadLng, aheadLat]);
      const target = pa ? Math.atan2(pa[1] - p[1], pa[0] - p[0]) : (isNaN(heading) ? 0 : heading);
      if (isNaN(heading)) heading = target;
      else {
        let da = target - heading;
        da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        heading += da * 0.045; // extra-gentle banking — long smooth arcs, never brusque
      }

      // Chemtrail — a thin white vapor line tracing the flown path, widest and
      // brightest at the plane, dissolving with age.
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.lineCap = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = projection(trail[i - 1]);
        const b = projection(trail[i]);
        if (!a || !b) continue;
        const age = i / trail.length; // 0 = oldest, 1 = newest
        ctx.strokeStyle = `rgba(255,255,255,${0.85 * age * age})`;
        ctx.lineWidth = Math.max(0.8, R * 0.011 * age);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.restore();

      // The sprite's nose points north-east (−45°), so rotate by heading + 45°
      // to fly nose-first — identical on every platform, unlike a text glyph.
      if (planeImg.complete && planeImg.naturalWidth > 0) {
        const w = Math.max(22, R * 0.2);
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(heading + Math.PI / 4);
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 7;
        ctx.shadowOffsetY = 2;
        ctx.drawImage(planeImg, -w / 2, -w / 2, w, w);
        ctx.restore();
      }
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.scale(R * ZOOM).rotate([lambda, phi, 0]);
      cloudProjection.scale(R * ZOOM).rotate([lambda + cloudOffset, phi, 0]);

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
      // Polar snow — white caps over any land above ~62° (Greenland, Siberia's
      // edge, Antarctica), clipped to the coastlines so the sea stays blue.
      ctx.save();
      ctx.beginPath();
      path(LAND);
      ctx.clip();
      for (const poleLat of [90, -90]) {
        const pd = geoDistance([0, poleLat], [-lambda, -phi]);
        const capAng = (Math.PI / 180) * 33; // bigger ice — caps reach ~57° latitude
        if (pd >= Math.PI / 2 + capAng) continue;
        const pp = projection([0, poleLat]);
        if (!pp) continue;
        const rad = R * ZOOM * Math.sin(capAng);
        const gr = ctx.createRadialGradient(pp[0], pp[1], 0, pp[0], pp[1], rad);
        gr.addColorStop(0, 'rgba(255,255,255,0.96)');
        gr.addColorStop(0.7, 'rgba(255,255,255,0.9)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pp[0], pp[1], rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.restore();

      drawTerrain();
      if (flying) drawClouds();

      // Lighting BEFORE the monuments: the night-side shading must never dim
      // the landmark/animal accents — they ride above it at full brightness.
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

      if (flying) drawMonuments();

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
        const ahead = interp(Math.min(1, segT + 0.055)); // look further ahead = earlier, softer turns
        aheadLng = ahead[0];
        aheadLat = ahead[1];
        trail.push([planeLng, planeLat]);
        if (trail.length > 150) trail.shift();
        // The chase pauses while the user is spinning the globe (and briefly
        // after), then the same lerp glides the camera back to the plane.
        if (!dragging && now >= resumeAt) {
          const k = Math.min(1, dt * 2.0);
          const dL = (((-planeLng - lambda) % 360) + 540) % 360 - 180;
          lambda += dL * k;
          phi += (-planeLat - phi) * k;
        }
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
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp);
      cv.removeEventListener('pointercancel', onUp);
    };
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size, opacity, display: 'block', borderRadius: '50%', touchAction: 'none', cursor: 'grab' }} />;
}
