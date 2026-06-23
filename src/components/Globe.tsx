// Globe.tsx — a real, rotating dotted Earth rendered on canvas.
// Continents come from a coarse equirectangular land map; each land cell is
// projected onto a sphere and rotated by `spin`, so recognisable continents turn
// past the limb. Brand gradient (orange→pink) colours the dots; radial shading
// gives the sphere volume.
import { useEffect, useRef } from 'react';

// Coarse world map: '#' = land, '.' = sea. Rows run N→S, columns W→E (-180→180).
const WORLD = [
  '........................................',
  '...####.......####.......############...',
  '..#######....####....#################..',
  '.########..###.....################.....',
  '..######........####################....',
  '...#####........###################.....',
  '....####.......####...##########..##.....',
  '.....###......######..########....##....',
  '......##.....#######.######..####.......',
  '.......#....#######..####...#####.......',
  '........###..######..##....####.........',
  '.........###..#####..........#####......',
  '..........###..####.........######......',
  '...........##..###..........#####.......',
  '............#...............###.##.......',
  '............#............................',
  '........................................',
  '.......######..........######...........',
  '....############################........',
  '..####################################..',
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
// orange #F0803A → pink #ED4D8E
function dotColor(t: number, alpha: number) {
  const r = Math.round(lerp(0xF0, 0xED, t));
  const g = Math.round(lerp(0x80, 0x4D, t));
  const b = Math.round(lerp(0x3A, 0x8E, t));
  return `rgba(${r},${g},${b},${alpha})`;
}

// Pre-extract land points (lon/lat in radians) once.
const LAND: { lon: number; lat: number }[] = [];
WORLD.forEach((row, r) => {
  const lat = (90 - (r + 0.5) * (180 / WORLD.length)) * (Math.PI / 180);
  const cols = row.length;
  for (let c = 0; c < cols; c++) {
    if (row[c] === '#') {
      const lon = (-180 + (c + 0.5) * (360 / cols)) * (Math.PI / 180);
      LAND.push({ lon, lat });
    }
  }
});

export function RingoGlobe({ size = 300, opacity = 1, spin = 0 }: { size?: number; opacity?: number; spin?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1));
    cv.width = size * dpr;
    cv.height = size * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 3;
    const rot = spin * 2.1; // a touch faster than the flag orbit

    // Sphere base (lit cream sphere).
    const fill = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.2, cx, cy, R);
    fill.addColorStop(0, '#FFE9D8');
    fill.addColorStop(0.6, '#FBD2BA');
    fill.addColorStop(1, '#F2AE8B');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    // Land dots on the front hemisphere.
    const dot = Math.max(1.1, size * 0.012);
    for (const p of LAND) {
      const lon = p.lon + rot;
      const cosLat = Math.cos(p.lat);
      const x = cosLat * Math.sin(lon);
      const y = Math.sin(p.lat);
      const z = cosLat * Math.cos(lon);
      if (z <= 0.02) continue; // behind the globe
      const sx = cx + x * R;
      const sy = cy - y * R;
      const depth = z; // 0..1
      const t = (x + 1) / 2;
      ctx.beginPath();
      ctx.arc(sx, sy, dot * (0.5 + 0.6 * depth), 0, Math.PI * 2);
      ctx.fillStyle = dotColor(t, 0.45 + 0.5 * depth);
      ctx.fill();
    }

    // Limb shading for volume.
    const shade = ctx.createRadialGradient(cx - R * 0.28, cy - R * 0.3, R * 0.55, cx, cy, R);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(122,46,18,0.34)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = shade;
    ctx.fill();

    // Specular highlight.
    const hi = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.36, 0, cx - R * 0.32, cy - R * 0.36, R * 0.55);
    hi.addColorStop(0, 'rgba(255,255,255,0.55)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = hi;
    ctx.fill();

    // Rim.
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(237,77,142,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [size, spin]);

  return <canvas ref={ref} style={{ width: size, height: size, opacity, display: 'block' }} />;
}
