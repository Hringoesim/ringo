// Globe.tsx — a realistic rotating Earth.
// Real coastlines (Natural Earth 110m land via world-atlas) drawn with a d3-geo
// orthographic projection onto a canvas, spinning continuously. Blue oceans,
// green land, soft atmosphere glow and limb shading sell a real globe.
import { useEffect, useRef } from 'react';
import { geoOrthographic, geoPath, geoGraticule10, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';

// world-atlas land topology → GeoJSON land feature (computed once).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND = feature(landTopo as any, (landTopo as any).objects.land) as unknown as GeoPermissibleObjects;
const GRATICULE = geoGraticule10() as unknown as GeoPermissibleObjects;

export function RingoGlobe({ size = 300, opacity = 1 }: { size?: number; opacity?: number; spin?: number }) {
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
    const R = size / 2 - size * 0.04; // leave room for the atmosphere glow

    const projection = geoOrthographic()
      .scale(R)
      .translate([cx, cy])
      .clipAngle(90);
    const path = geoPath(projection, ctx);

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let lambda = 0; // longitude rotation

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      projection.rotate([lambda, -18, 0]); // tilt the axis for a natural view

      // Atmosphere glow behind the disc.
      const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.08);
      glow.addColorStop(0, 'rgba(90,170,255,0.35)');
      glow.addColorStop(1, 'rgba(90,170,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Ocean sphere.
      const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.2, cx, cy, R);
      ocean.addColorStop(0, '#3AA3E8');
      ocean.addColorStop(0.65, '#1E6FB8');
      ocean.addColorStop(1, '#0E3F73');
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();

      // Graticule (faint lat/long lines).
      ctx.beginPath();
      path(GRATICULE);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Land.
      ctx.beginPath();
      path(LAND);
      ctx.fillStyle = '#3E9B5F';
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,80,45,0.55)';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Limb shading + day highlight, clipped to the disc.
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      const shade = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.32, R * 0.45, cx, cy, R);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(2,12,30,0.45)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, size, size);
      const hi = ctx.createRadialGradient(cx - R * 0.34, cy - R * 0.38, 0, cx - R * 0.34, cy - R * 0.38, R * 0.7);
      hi.addColorStop(0, 'rgba(255,255,255,0.35)');
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hi;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      // Crisp rim.
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180,220,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (!reduce) {
        lambda += 0.28; // degrees per frame → ~16s per rotation
        raf = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size, opacity, display: 'block', borderRadius: '50%' }} />;
}
