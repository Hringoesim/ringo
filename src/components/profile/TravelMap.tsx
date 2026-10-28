// TravelMap — where a member has travelled, on a world map (owner
// 2026-10-23: "on the users profile we want to show where they have
// travelled"). A country they held a Ringo eSIM for is filled in brand
// orange; the countries a regional plan covered get a lighter shade (we know
// the region, not which of its countries they visited). Global colours
// nothing: it covers the world. The map's shapes (world-atlas, ~100 KB) load
// only when the profile opens.
import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import { RC } from '../../theme';
import type { TravelBadge } from '../../api/light';
import { useDestinations } from '../../store/destinations';
import { ISO_NUMERIC } from '../../data/isoNumeric';
import { t } from '../../lib/i18n';

type Shapes = FeatureCollection<Geometry, { name: string }>;
let shapesPromise: Promise<Shapes> | null = null;
function loadShapes(): Promise<Shapes> {
  shapesPromise ??= Promise.all([import('topojson-client'), import('world-atlas/countries-110m.json')]).then(([topo, atlas]) => {
    const t = (atlas as { default?: unknown }).default ?? atlas;
    return topo.feature(t as any, (t as any).objects.countries) as unknown as Shapes;
  });
  return shapesPromise;
}

const W = 360, H = 175;

// A regional plan's area, as the store sections the site files countries
// under (the catalogue's `region`).
const REGION_SECTION: Record<string, string> = {
  europe: 'Europe', asia: 'Asia-Pacific', latam: 'Latin America', 'middle-east': 'Middle East',
  'north-america': 'North America', caribbean: 'Caribbean', africa: 'Africa', oceania: 'Oceania',
};
// The catalogue hands the app a flag emoji; its two regional indicators are the ISO code.
function isoOfFlag(flag?: string): string | null {
  const cps = [...String(flag || '')].map((c) => c.codePointAt(0)! - 0x1f1e6);
  return cps.length === 2 && cps.every((n) => n >= 0 && n < 26) ? String.fromCharCode(65 + cps[0], 65 + cps[1]) : null;
}

export function TravelMap({ badges }: { badges: TravelBadge[] }) {
  const [shapes, setShapes] = useState<Shapes | null>(null);
  const destinations = useDestinations();
  useEffect(() => { let alive = true; void loadShapes().then((s) => { if (alive) setShapes(s); }); return () => { alive = false; }; }, []);

  const { visited, covered } = useMemo(() => {
    const visited = new Set<string>(), covered = new Set<string>();
    for (const b of badges) {
      if (b.kind === 'country' && b.iso) { const n = ISO_NUMERIC[b.iso.toUpperCase()]; if (n) visited.add(n); }
      if (b.kind === 'region' && b.destination !== 'global') {
        const section = REGION_SECTION[b.destination];
        for (const d of destinations) {
          const iso = isoOfFlag(d.flag);
          if (section && d.kind === 'country' && d.region === section && iso) { const n = ISO_NUMERIC[iso]; if (n) covered.add(n); }
        }
      }
    }
    return { visited, covered };
  }, [badges, destinations]);

  const paths = useMemo(() => {
    if (!shapes) return { top: 0, height: H, list: [] as { id: string; d: string }[] };
    // Fitted to the land without Antarctica, so the map has no empty band.
    const land = { ...shapes, features: shapes.features.filter((f) => f.properties?.name !== 'Antarctica') };
    const projection = geoNaturalEarth1().fitWidth(W, land);
    const path = geoPath(projection);
    const [[, y0], [, y1]] = path.bounds(land);
    return { top: Math.floor(y0), height: Math.ceil(y1 - y0), list: land.features.map((f) => ({ id: String(f.id ?? ''), d: path(f) || '' })) };
  }, [shapes]);

  return (
    <div style={{ borderRadius: 20, background: RC.paper, border: `1.5px solid ${RC.line}`, overflow: 'hidden', padding: '10px 6px' }}>
      <svg viewBox={`0 ${paths.top} ${W} ${paths.height}`} width="100%" role="img" aria-label={t('Map of the countries you have travelled to with Ringo')} style={{ display: 'block' }}>
        {paths.list.map((p, i) => (
          <path
            key={`${p.id}-${i}`}
            d={p.d}
            fill={visited.has(p.id) ? '#F93C1F' : covered.has(p.id) ? 'rgba(249,60,31,0.42)' : 'rgba(120,100,140,0.18)'}
            stroke={RC.paper}
            strokeWidth={0.4}
          />
        ))}
      </svg>
    </div>
  );
}
