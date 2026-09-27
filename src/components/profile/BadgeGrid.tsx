// Travel badges: one photo tile per destination the account has connected
// in, three to a row, the destination's name and the month it was first
// connected. The photographs are the website's (ringoesim.com/img/data-esims),
// with the bundled picture and then the destination's sunset sky behind.
import { RC, RADIUS, BRAND, SHADOW_CARD, THEMES, hexA } from '../../theme';
// The dot sits on a dark scrim in either theme, so it takes the dark palette's green.
import type { TravelBadge } from '../../api/light';
import { pictureFor, skyFor, bundledPictureFor } from '../../data/destinations';
import { RingoCard } from '../Card';
import { RingoButton } from '../Button';
import { monthYear } from './format';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 } as const;
const TILE_RATIO = '4 / 5';

function Tile({ b }: { b: TravelBadge }) {
  const first = monthYear(b.first_at);
  const star = BRAND.starlight;
  return (
    <li style={{ position: 'relative', borderRadius: RADIUS.lg, overflow: 'hidden', aspectRatio: TILE_RATIO, background: skyFor(b.destination), boxShadow: SHADOW_CARD }}>
      <img
        src={pictureFor(b.destination)} alt="" loading="lazy" decoding="async"
        onError={(e) => { const el = e.currentTarget; const alt = bundledPictureFor(b.destination); if (alt && !el.src.endsWith(alt)) el.src = alt; else el.style.display = 'none'; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${hexA(BRAND.plum, 0)} 38%, ${hexA(BRAND.plum, 0.86)} 100%)` }} />
      {b.active && (
        <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 6px', borderRadius: RADIUS.pill, background: hexA(BRAND.plum, 0.62), backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: star, fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 700 }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: RADIUS.pill, background: THEMES.dark.success }} />
          Active
        </span>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 9px 9px', color: star }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.label}</div>
        {first && <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 11, color: hexA(star, 0.8) }}>{first}</div>}
      </div>
    </li>
  );
}

export function BadgeGrid({ badges }: { badges: TravelBadge[] }) {
  return (
    <ul aria-label="Travel badges" style={{ ...GRID, listStyle: 'none', margin: 0, padding: 0 }}>
      {badges.map((b) => <Tile key={b.destination} b={b} />)}
    </ul>
  );
}

export function BadgeSkeleton() {
  return (
    <div aria-hidden style={GRID}>
      {[0, 1, 2].map((i) => <div key={i} style={{ borderRadius: RADIUS.lg, aspectRatio: TILE_RATIO, background: RC.cream, border: `1px solid ${RC.line}` }} />)}
    </div>
  );
}

// A new member: three empty frames where the photographs will go, one line
// on how a badge is earned, and a quiet way to the destinations.
export function BadgeEmpty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <RingoCard padding={16}>
      <div aria-hidden style={GRID}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ borderRadius: RADIUS.lg, aspectRatio: '1 / 1', border: `1.5px dashed ${RC.lineStrong}`, background: i === 0 ? RC.gradSoft : RC.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {i === 0 && (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke={RC.inkStrong} strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="9.5" r="2.5" stroke={RC.inkStrong} strokeWidth="1.8" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>Your first badge is one trip away</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
        Each destination you connect in with Ringo adds its photograph here, with the month you first landed.
      </div>
      <div style={{ marginTop: 14 }}><RingoButton variant="soft" onClick={onBrowse}>See destinations</RingoButton></div>
    </RingoCard>
  );
}
