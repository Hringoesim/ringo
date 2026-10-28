// EarnBadges: the badges a member can earn (owner 2026-10-24: "badges have a
// badge list where people can earn them"). Every badge is shown, earned ones
// in the site's sunset colours, the rest muted with how to earn them and how
// far along the member is. Each badge pays Ringo coins once, by rarity
// (owner 2026-10-26; 100 coins = EUR 1 credit, credited by /api/app-profile);
// Pioneer is super rare, in gold. Tapping a badge shows when it was earned or
// how to earn it (owner 2026-10-28). Year round (global-12) is legendary,
// 2000 coins, its medal in the brand's sunset (owner 2026-10-28).
import { useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RC, RADIUS, TYPE, SITE_GRAD, cardSurface } from '../../theme';
import type { Layout } from '../../lib/layout';
import type { Achievement } from '../../api/light';
import { PIONEER_GOLD } from './format';
import { t, tk, fmtNumber, fmtDate } from '../../lib/i18n';

const RARITY: Record<string, { label: string; color: string }> = {
  common: { label: tk('Common'), color: RC.ink2 },
  rare: { label: tk('Rare'), color: '#2F6FEB' },
  epic: { label: tk('Epic'), color: '#8652E0' },
  super: { label: tk('Super rare'), color: '#B7791F' },
  legendary: { label: tk('Legend'), color: '#E0457B' },
};

const SUNSET = 'linear-gradient(110deg, #F26122, #FF42A1 55%, #8652E0)';

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
  quiz: <><path d="M5 18V13M10 18V9M15 18V11M20 18V5" {...S} /></>,
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
      background: a.earned ? (a.rarity === 'super' ? PIONEER_GOLD : a.rarity === 'legendary' ? SUNSET : SITE_GRAD) : RC.cream, color: a.earned ? '#fff' : RC.inkMute,
      boxShadow: a.earned ? '0 6px 16px rgba(249,60,31,.28), inset 0 0 0 3px rgba(255,255,255,.35)' : `inset 0 0 0 2px ${RC.line}`,
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">{GLYPH[a.id] || GLYPH.explorer}</svg>
    </div>
  );
}

/** A rarity the app does not know reads as Common rather than breaking the screen. */
const rarityOf = (a: Achievement) => RARITY[a.rarity ?? ''] ?? RARITY.common;

function Tile({ a, l, onOpen }: { a: Achievement; l: Layout; onOpen: () => void }) {
  const pct = Math.round((a.have / Math.max(1, a.need)) * 100);
  return (
    <li className="press" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{ ...cardSurface(), listStyle: 'none', cursor: 'pointer', padding: l.isCover ? '14px 10px' : '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
      <Medal a={a} size={l.isCover ? 50 : 58} />
      <div style={{ ...TYPE.bodyStrong, color: RC.ink }}>{a.name}</div>
      {a.coins ? (
        <div style={{ ...TYPE.caption, fontWeight: 700, color: rarityOf(a).color }}>{t('{rarity}, {n} coins', { rarity: t(rarityOf(a).label), n: a.coins })}</div>
      ) : null}
      <div style={{ ...TYPE.small, color: a.earned ? RC.success : RC.ink2, fontWeight: a.earned ? 700 : undefined }}>{a.earned ? t('Earned') : a.how}</div>
      {!a.earned && a.need > 1 && (
        <div style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div role="progressbar" aria-label={t('{name} progress', { name: a.name })} aria-valuemin={0} aria-valuemax={a.need} aria-valuenow={a.have}
            style={{ flex: 1, height: 6, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(pct, a.have ? 4 : 0)}%`, height: '100%', background: SITE_GRAD, borderRadius: RADIUS.pill }} />
          </div>
          <span style={{ ...TYPE.caption, color: RC.inkMute, fontVariantNumeric: 'tabular-nums' }}>{fmtNumber(a.have)}/{fmtNumber(a.need)}</span>
        </div>
      )}
    </li>
  );
}

/** Earned badges first, then the closest to being earned. */
export function EarnBadges({ items, l }: { items: Achievement[]; l: Layout }) {
  const sorted = [...items].sort((x, y) => Number(y.earned) - Number(x.earned) || y.have / Math.max(1, y.need) - x.have / Math.max(1, x.need));
  const [open, setOpen] = useState<Achievement | null>(null);
  return (
    <>
      <ul style={{ margin: 0, padding: 0, display: 'grid', gap: l.cardGap, gridTemplateColumns: l.isWide ? 'repeat(auto-fill, minmax(170px, 1fr))' : 'repeat(2, minmax(0, 1fr))' }}>
        {sorted.map((a) => <Tile key={a.id} a={a} l={l} onOpen={() => setOpen(a)} />)}
      </ul>
      {open && <BadgeSheet a={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Tapping a badge (owner 2026-10-28): when it was earned, or how to earn it. */
function BadgeSheet({ a, onClose }: { a: Achievement; onClose: () => void }) {
  const titleId = useId();
  const pct = Math.round((a.have / Math.max(1, a.need)) * 100);
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,15,46,0.46)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'ringoFadeIn 0.24s ease both' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="rise"
        style={{ width: '100%', maxWidth: 560, boxSizing: 'border-box', background: RC.paper, borderRadius: '24px 24px 0 0', padding: '28px 24px max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Medal a={a} size={96} />
        <div id={titleId} style={{ marginTop: 16, ...TYPE.h2, color: RC.ink }}>{a.name}</div>
        {a.coins ? <div style={{ marginTop: 6, ...TYPE.caption, fontWeight: 700, color: rarityOf(a).color }}>{t('{rarity}, {n} coins', { rarity: t(rarityOf(a).label), n: a.coins })}</div> : null}
        {a.earned ? (
          <div style={{ marginTop: 14, ...TYPE.bodyStrong, color: RC.success }}>
            {a.earned_at ? t('Earned on {date}', { date: fmtDate(a.earned_at, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('Earned')}
          </div>
        ) : (
          <>
            <div style={{ marginTop: 16, ...TYPE.caption, fontWeight: 700, color: RC.inkMute }}>{t('How to earn it')}</div>
            <div style={{ marginTop: 4, ...TYPE.body, color: RC.ink, maxWidth: 360 }}>{a.how}</div>
            {a.need > 1 && (
              <div style={{ width: '100%', maxWidth: 320, marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div role="progressbar" aria-label={t('{name} progress', { name: a.name })} aria-valuemin={0} aria-valuemax={a.need} aria-valuenow={a.have}
                  style={{ flex: 1, height: 8, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(pct, a.have ? 4 : 0)}%`, height: '100%', background: SITE_GRAD, borderRadius: RADIUS.pill }} />
                </div>
                <span style={{ ...TYPE.caption, color: RC.inkMute, fontVariantNumeric: 'tabular-nums' }}>{fmtNumber(a.have)}/{fmtNumber(a.need)}</span>
              </div>
            )}
          </>
        )}
        <button type="button" className="press" onClick={onClose}
          style={{ marginTop: 22, width: '100%', maxWidth: 360, border: 'none', background: RC.cream, borderRadius: 999, padding: '14px 16px', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 700, color: RC.ink, cursor: 'pointer' }}>{t('Done')}</button>
      </div>
    </div>,
    document.body,
  );
}
