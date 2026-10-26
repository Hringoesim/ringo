// EarnBadges: the badges a member can earn (owner 2026-10-24: "badges have a
// badge list where people can earn them"). Every badge is shown, earned ones
// in the site's sunset colours, the rest muted with how to earn them and how
// far along the member is. Each badge pays Ringo coins once, by rarity
// (owner 2026-10-26; 100 coins = EUR 1 credit, credited by /api/app-profile);
// Pioneer is super rare, in gold.
import type { ReactNode } from 'react';
import { RC, RADIUS, TYPE, SITE_GRAD, cardSurface } from '../../theme';
import type { Layout } from '../../lib/layout';
import type { Achievement } from '../../api/light';
import { PIONEER_GOLD } from './format';

const RARITY: Record<string, { label: string; color: string }> = {
  common: { label: 'Common', color: RC.ink2 },
  rare: { label: 'Rare', color: '#2F6FEB' },
  epic: { label: 'Epic', color: '#8652E0' },
  super: { label: 'Super rare', color: '#B7791F' },
};

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const GLYPH: Record<string, ReactNode> = {
  'first-trip': <><rect x="5" y="4" width="14" height="16" rx="2" {...S} /><circle cx="12" cy="11" r="3" {...S} /><path d="M9 17h6" {...S} /></>,
  explorer: <><circle cx="12" cy="12" r="8" {...S} /><path d="M15 9l-2 4-4 2 2-4z" {...S} /></>,
  globetrotter: <><circle cx="12" cy="12" r="8" {...S} /><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16" {...S} /></>,
  continents: <><path d="M3 7l6-2 6 2 6-2v12l-6 2-6-2-6 2z" {...S} /><path d="M9 5v12M15 7v12" {...S} /></>,
  regular: <><path d="M4 9h16v10H4z" {...S} /><path d="M8 9V6a4 4 0 0 1 8 0v3" {...S} /></>,
  worldwide: <><circle cx="12" cy="12" r="5" {...S} /><ellipse cx="12" cy="12" rx="10" ry="3.2" transform="rotate(-20 12 12)" {...S} /></>,
  'global-3': <><path d="M12 4v8l5 3" {...S} /><circle cx="12" cy="12" r="8" {...S} /></>,
  'global-12': <><rect x="4" y="5" width="16" height="15" rx="2" {...S} /><path d="M4 10h16M9 3v4M15 3v4" {...S} /></>,
  waitlist: <><path d="M6 4h12v16l-6-4-6 4z" {...S} /></>,
  survey: <><path d="M8 4h8v3H8z" {...S} /><rect x="5" y="5" width="14" height="15" rx="2" {...S} /><path d="M9 12l2 2 4-4" {...S} /></>,
  pioneer: <><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" {...S} /></>,
  'friend-1': <><circle cx="12" cy="8" r="3.5" {...S} /><path d="M5 20a7 7 0 0 1 14 0" {...S} /></>,
  'friend-3': <><circle cx="12" cy="8" r="3" {...S} /><circle cx="5.5" cy="10" r="2.3" {...S} /><circle cx="18.5" cy="10" r="2.3" {...S} /><path d="M7 20a5 5 0 0 1 10 0M2 19a4 4 0 0 1 5-3.5M22 19a4 4 0 0 0-5-3.5" {...S} /></>,
  'friend-10': <><path d="M4 18l2-9 4 4 2-7 2 7 4-4 2 9z" {...S} /></>,
};

function Medal({ a, size }: { a: Achievement; size: number }) {
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: a.earned ? (a.rarity === 'super' ? PIONEER_GOLD : SITE_GRAD) : RC.cream, color: a.earned ? '#fff' : RC.inkMute,
      boxShadow: a.earned ? '0 6px 16px rgba(249,60,31,.28), inset 0 0 0 3px rgba(255,255,255,.35)' : `inset 0 0 0 2px ${RC.line}`,
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">{GLYPH[a.id] || GLYPH.explorer}</svg>
    </div>
  );
}

function Tile({ a, l }: { a: Achievement; l: Layout }) {
  const pct = Math.round((a.have / Math.max(1, a.need)) * 100);
  return (
    <li style={{ ...cardSurface(), listStyle: 'none', padding: l.isCover ? '14px 10px' : '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
      <Medal a={a} size={l.isCover ? 50 : 58} />
      <div style={{ ...TYPE.bodyStrong, color: RC.ink }}>{a.name}</div>
      {a.coins ? (
        <div style={{ ...TYPE.caption, fontWeight: 700, color: RARITY[a.rarity || 'common'].color }}>{`${RARITY[a.rarity || 'common'].label}, ${a.coins} coins`}</div>
      ) : null}
      <div style={{ ...TYPE.small, color: a.earned ? RC.success : RC.ink2, fontWeight: a.earned ? 700 : undefined }}>{a.earned ? 'Earned' : a.how}</div>
      {!a.earned && a.need > 1 && (
        <div style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div role="progressbar" aria-label={`${a.name} progress`} aria-valuemin={0} aria-valuemax={a.need} aria-valuenow={a.have}
            style={{ flex: 1, height: 6, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(pct, a.have ? 4 : 0)}%`, height: '100%', background: SITE_GRAD, borderRadius: RADIUS.pill }} />
          </div>
          <span style={{ ...TYPE.caption, color: RC.inkMute, fontVariantNumeric: 'tabular-nums' }}>{a.have}/{a.need}</span>
        </div>
      )}
    </li>
  );
}

/** Earned badges first, then the closest to being earned. */
export function EarnBadges({ items, l }: { items: Achievement[]; l: Layout }) {
  const sorted = [...items].sort((x, y) => Number(y.earned) - Number(x.earned) || y.have / y.need - x.have / x.need);
  return (
    <ul style={{ margin: 0, padding: 0, display: 'grid', gap: l.cardGap, gridTemplateColumns: l.isWide ? 'repeat(auto-fill, minmax(170px, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}>
      {sorted.map((a) => <Tile key={a.id} a={a} l={l} />)}
    </ul>
  );
}
