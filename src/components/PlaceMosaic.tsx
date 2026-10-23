// PlaceMosaic — Global told the way ringoesim.com tells it (owner
// 2026-10-23: "the picture of global I want it to be the same as the
// website"): the website's own mosaic, src/pages/PlaceMosaic.jsx there. A
// silent sunset film two rows tall on the left (its poster for anyone who
// asks for less motion), and four sunny beach photographs, each on a slow
// drift. Every file is the site's, so the two never drift apart.
import { useReducedMotion } from '../lib/useReducedMotion';
import { SITE } from '../api/light';
import { SITE_PICTURES, MOSAIC_IDS } from '../data/destinations';

const MOSAICS: Record<(typeof MOSAIC_IDS)[number], { film: { src: string; poster: string }; tiles: string[] }> = {
  global: {
    film: { src: `${SITE}/video/dashboard-sunset.mp4`, poster: `${SITE}/img/dashboard-sunset.jpg` },
    tiles: ['guadeloupe', 'seychelles', 'jamaica', 'us-virgin-islands'],
  },
};

/** Fills its positioned parent. */
export function PlaceMosaic({ id }: { id: string }) {
  const set = MOSAICS[id as keyof typeof MOSAICS] || MOSAICS.global;
  const still = useReducedMotion();
  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as const;
  return (
    <div aria-hidden data-mosaic={id} style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: 3, background: '#1a0f2e' }}>
      <style>{`
        @keyframes pmDrift { 0% { transform: scale(1.02) translate(0,0) } 50% { transform: scale(1.14) translate(-2%,-2%) } 100% { transform: scale(1.02) translate(0,0) } }
        [data-mosaic] .pm-tile { animation: pmDrift 18s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { [data-mosaic] .pm-tile { animation: none } }
      `}</style>
      <div style={{ gridColumn: 'span 2', gridRow: 'span 2', overflow: 'hidden', position: 'relative' }}>
        {still
          ? <img src={set.film.poster} alt="" decoding="async" style={fill} />
          : <video src={set.film.src} poster={set.film.poster} autoPlay muted loop playsInline preload="metadata" disablePictureInPicture style={fill} />}
      </div>
      {set.tiles.map((p, i) => (
        <div key={p} style={{ overflow: 'hidden', position: 'relative' }}>
          <img className="pm-tile" src={`${SITE_PICTURES}/${p}.jpg`} alt="" decoding="async" loading="lazy" style={{ ...fill, animationDelay: `${-i * 4}s` }} />
        </div>
      ))}
    </div>
  );
}
