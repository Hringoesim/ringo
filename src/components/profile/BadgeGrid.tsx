// Travel badges: one photo tile per destination the account has connected
// in, with the destination's name and the month it was first connected. The
// photographs are the website's (ringoesim.com/img/data-esims), with the
// bundled picture and then the destination's sunset sky behind.
//
// A Ringo Pioneer's badge comes first: a gold tile with the star, the title
// and their Pioneer reward (owner 2026-10-24). Never the Pioneer number.
//
// Columns follow the live width (iPhone Duo): 2 on the cover display, 3 on a
// phone, 4 or more on the inner display.
import type { CSSProperties } from 'react';
import { RC, RADIUS, SHADOW_CARD, TYPE, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW, GRAD_PREMIUM } from '../../theme';
import type { Profile, TravelBadge } from '../../api/light';
import { pictureFor, skyFor, bundledPictureFor } from '../../data/destinations';
import { useLayout, type Layout } from '../../lib/layout';
import { RingoCard } from '../Card';
import { RingoButton } from '../Button';
import { monthYear, pioneerTitle, pioneerPerk, PIONEER_GOLD, PIONEER_INK } from './format';
import { t, placeName } from '../../lib/i18n';

const TILE_RATIO = '4 / 5';
const STAR = 'M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z';

function grid(l: Layout): CSSProperties {
  const min = l.isCover ? 140 : l.isWide ? 160 : 100;
  return { display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}px), 1fr))`, gap: l.isWide ? 14 : 10 };
}

function Tile({ b }: { b: TravelBadge }) {
  const first = monthYear(b.first_at);
  return (
    <li style={{ position: 'relative', borderRadius: RADIUS.lg, overflow: 'hidden', aspectRatio: TILE_RATIO, background: skyFor(b.destination), boxShadow: SHADOW_CARD }}>
      <img
        src={pictureFor(b.destination)} alt="" loading="lazy" decoding="async"
        onError={(e) => { const el = e.currentTarget; const alt = bundledPictureFor(b.destination); if (alt && !el.src.endsWith(alt)) el.src = alt; else el.style.display = 'none'; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
      {b.active && (
        <span style={{ position: 'absolute', top: 8, insetInlineStart: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px 4px 8px', borderRadius: RADIUS.pill, background: 'rgba(14,7,24,0.62)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: RADIUS.pill, background: '#63E392' }} />
          {t('Active')}
        </span>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 10px 10px', color: '#fff', textShadow: PHOTO_TEXT_SHADOW }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{placeName(b.label, b.flag)}</div>
        {first && <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{first}</div>}
      </div>
    </li>
  );
}

/** The Pioneer badge: two columns wide, gold, with the star and the reward. */
export function PioneerTile({ pioneer, as = 'li' }: { pioneer: NonNullable<Profile['pioneer']>; as?: 'li' | 'div' }) {
  const T = as;
  return (
    <T
      aria-label={`${pioneerTitle(pioneer)}. ${pioneerPerk(pioneer)}.`}
      style={{
        position: 'relative', gridColumn: 'span 2', minHeight: 150, borderRadius: RADIUS.lg, overflow: 'hidden',
        background: PIONEER_GOLD, boxShadow: '0 1px 2px rgba(26,15,46,0.04), 0 14px 30px -16px rgba(217,152,42,0.7)',
        padding: 14, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12, color: PIONEER_INK,
      }}
    >
      {/* A large soft star behind, and a twinkle, so it reads as a medal at a glance. */}
      <svg aria-hidden width="130" height="130" viewBox="0 0 24 24" style={{ position: 'absolute', insetInlineEnd: -22, top: -18, opacity: 0.28 }}><path d={STAR} fill="#FFF7D6" /></svg>
      <span aria-hidden style={{ width: 44, height: 44, borderRadius: '50%', background: GRAD_PREMIUM, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -8px rgba(26,15,46,0.6)', position: 'relative' }}>
        <svg width="24" height="24" viewBox="0 0 24 24"><path d={STAR} fill="#FFCC33" /></svg>
      </span>
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{pioneerTitle(pioneer)}</div>
        <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{pioneerPerk(pioneer)}</div>
      </div>
    </T>
  );
}

export function BadgeGrid({ badges, pioneer }: { badges: TravelBadge[]; pioneer?: Profile['pioneer'] }) {
  const l = useLayout();
  return (
    <ul aria-label={t('Your badges')} style={{ ...grid(l), listStyle: 'none', margin: 0, padding: 0 }}>
      {pioneer && <PioneerTile pioneer={pioneer} />}
      {badges.map((b) => <Tile key={b.destination} b={b} />)}
    </ul>
  );
}

export function BadgeSkeleton() {
  const l = useLayout();
  return (
    <div aria-hidden style={grid(l)}>
      {[0, 1, 2].map((i) => <div key={i} style={{ borderRadius: RADIUS.lg, aspectRatio: TILE_RATIO, background: RC.cream, border: `1.5px solid ${RC.line}` }} />)}
    </div>
  );
}

// A new member: three empty frames where the photographs will go, one line
// on how a badge is earned, and a quiet way to the destinations.
export function BadgeEmpty({ onBrowse }: { onBrowse: () => void }) {
  const l = useLayout();
  return (
    <RingoCard padding={l.cardPad}>
      <div aria-hidden style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, maxWidth: 420 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ borderRadius: RADIUS.lg, aspectRatio: '1 / 1', border: `1.5px dashed ${RC.lineStrong}`, background: i === 0 ? RC.gradSoft : RC.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {i === 0 && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke={RC.inkStrong} strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="9.5" r="2.5" stroke={RC.inkStrong} strokeWidth="1.8" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <h3 style={{ margin: '16px 0 0', ...TYPE.h2, color: RC.ink }}>{t('Your first badge is one trip away')}</h3>
      <p style={{ margin: '8px 0 0', ...TYPE.small, color: RC.ink2 }}>{t('Every destination you connect in adds its photo here.')}</p>
      <div style={{ marginTop: 16 }}><RingoButton variant="soft" capped onClick={onBrowse}>{t('See destinations')}</RingoButton></div>
    </RingoCard>
  );
}
