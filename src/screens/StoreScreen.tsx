// StoreScreen — every destination the site sells (owner 2026-09-18: "sell
// data to all destinations"): the Global plan, the regions and the United
// States as picture tiles, then every country grouped by region with its
// flag, all from the live catalogue so a country added on the site appears
// here without a release. Search filters everything.
import { useMemo, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD } from '../theme';
import { LOGO_SRC } from '../assets';
import { pictureFor, hasPicture, FEATURED, type Destination } from '../data/destinations';
import { useSummary } from '../store/summary';
import { useDestinations } from '../store/destinations';
import { money } from '../api/light';
import { haptic } from '../lib/haptics';

const REGION_ORDER = ['Europe', 'North America', 'Latin America', 'Caribbean', 'Asia-Pacific', 'Oceania', 'Middle East', 'Africa', 'Central Asia and Caucasus'];

function FromPill({ id, summary }: { id: string; summary: ReturnType<typeof useSummary> }) {
  const from = summary?.from?.[id];
  if (from == null) return null;
  return <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'rgba(20,10,30,0.45)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '6px 11px', whiteSpace: 'nowrap' }}>From {money(from, summary!.currency)}</span>;
}

function Tile({ d, summary, onOpen, big }: { d: Destination; summary: ReturnType<typeof useSummary>; onOpen: (id: string) => void; big?: boolean }) {
  return (
    <button className="press" onClick={() => onOpen(d.id)} style={{ position: 'relative', textAlign: 'left', cursor: 'pointer', border: 'none', padding: 0, borderRadius: RADIUS.xl, overflow: 'hidden', background: RC.cream2, height: big ? 150 : 118, boxShadow: SHADOW_CARD }}>
      {hasPicture(d.id)
        ? <img src={pictureFor(d.id)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #FFB877 0%, #F2585F 55%, #9B57DC 100%)' }} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0) 30%, rgba(20,10,30,0.72) 100%)' }} />
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: big ? 24 : 19, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.05, textShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>{d.flag ? `${d.flag} ` : ''}{d.label}</div>
          <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>{d.countries > 1 ? `${d.countries} countries` : 'Own plan'}</div>
        </div>
        <FromPill id={d.id} summary={summary} />
      </div>
    </button>
  );
}

function CountryRow({ d, summary, onOpen, last }: { d: Destination; summary: ReturnType<typeof useSummary>; onOpen: (id: string) => void; last: boolean }) {
  const from = summary?.from?.[d.id];
  return (
    <button className="press" onClick={() => onOpen(d.id)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '12px 14px', borderBottom: last ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 24, lineHeight: 1, width: 30, textAlign: 'center' }} aria-hidden>{d.flag || '🌐'}</span>
      <span style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink }}>{d.label}</span>
      {from != null && <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: RC.inkStrong }}>from {money(from, summary!.currency)}</span>}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 3l5 5-5 5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function StoreScreen({ onOpen, onMyEsim, onLogin, loggedIn }: { onOpen: (id: string) => void; onMyEsim: () => void; onLogin: () => void; loggedIn: boolean }) {
  const summary = useSummary();
  const all = useDestinations();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const open = (id: string) => { haptic('light'); onOpen(id); };

  const featured = useMemo(() => FEATURED.map((id) => all.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d) && (!query || d!.label.toLowerCase().includes(query))), [all, query]);
  const grouped = useMemo(() => {
    const countries = all.filter((d) => d.kind === 'country' && !FEATURED.includes(d.id) && (!query || d.label.toLowerCase().includes(query)));
    const by = new Map<string, Destination[]>();
    for (const d of countries) { const k = d.region || 'More'; if (!by.has(k)) by.set(k, []); by.get(k)!.push(d); }
    for (const list of by.values()) list.sort((a, b) => a.label.localeCompare(b.label));
    return [...by.entries()].sort((a, b) => (REGION_ORDER.indexOf(a[0]) + 1 || 99) - (REGION_ORDER.indexOf(b[0]) + 1 || 99));
  }, [all, query]);
  const total = all.filter((d) => d.kind === 'country').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px)) 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: 30, width: 'auto', display: 'block' }} />
          <button className="press" onClick={loggedIn ? onMyEsim : onLogin} style={{ border: `1px solid ${RC.line}`, background: RC.paper, borderRadius: 999, padding: '7px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: RC.inkStrong, cursor: 'pointer' }}>
            {loggedIn ? 'My eSIM' : 'Sign in'}
          </button>
        </div>
        <div style={{ marginTop: 18, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.9, lineHeight: 1.08, textWrap: 'balance' }}>
          Where are you going?
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14.5, color: RC.inkMute, lineHeight: 1.45 }}>
          {total ? `${total} countries and every region.` : 'Every country and region.'} Install in a tap, connected when you land.
        </div>

        <div style={{ marginTop: 16, position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="7" stroke={RC.inkMute} strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a country or region" aria-label="Search destinations" style={{ width: '100%', height: 50, padding: '0 16px 0 44px', boxSizing: 'border-box', borderRadius: RADIUS.md, border: `1.5px solid ${RC.line}`, background: RC.paper, outline: 'none', fontFamily: 'var(--font)', fontSize: 15.5, color: RC.ink }} />
        </div>

        {featured.length > 0 && (
          <>
            <div style={{ margin: '20px 0 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: RC.inkMute }}>Plans</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              {featured.map((d, i) => <Tile key={d.id} d={d} summary={summary} onOpen={open} big={i === 0} />)}
            </div>
          </>
        )}

        {grouped.map(([region, list]) => (
          <div key={region}>
            <div style={{ margin: '22px 0 8px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: RC.inkMute }}>{region}</div>
            <div style={{ borderRadius: RADIUS.lg, background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD, overflow: 'hidden' }}>
              {list.map((d, i) => <CountryRow key={d.id} d={d} summary={summary} onOpen={open} last={i === list.length - 1} />)}
            </div>
          </div>
        ))}

        {all.length > 0 && featured.length === 0 && grouped.length === 0 && (
          <div style={{ marginTop: 24, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, textAlign: 'center' }}>Nothing matches “{q}”.</div>
        )}
        {all.length === 0 && (
          <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 118, borderRadius: RADIUS.xl, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}</div>
        )}
      </div>
    </div>
  );
}
