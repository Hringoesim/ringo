// StoreScreen — every destination the site sells, in the website's own
// cards (owner 2026-09-18: "pictures on all the plans, the same UI as the
// website, to gain trust"): a white card with a 16:9 photograph, the flag
// and the name over it, "From €X" and one line about the plan underneath.
// The photographs are the site's (ringoesim.com/img/data-esims), so the
// app and the site show the same picture for the same place; the list
// itself comes from the live catalogue.
import { useMemo, useState } from 'react';
import { RC, RADIUS, TAP, cardSurface } from '../theme';
import { LOGO_SRC } from '../assets';
import { pictureFor, skyFor, FEATURED, type Destination , bundledPictureFor} from '../data/destinations';
import { useSummary, useAppleFrom } from '../store/summary';
import { useDestinations } from '../store/destinations';
import { money } from '../api/light';
import { haptic } from '../lib/haptics';

// What people actually type. "United States" does not contain "usa", so the
// most obvious search in an eSIM store returned nothing at all.
const ALIASES: Record<string, string> = {
  usa: 'usa', us: 'usa', america: 'usa', 'united states': 'usa',
  uk: 'united-kingdom', britain: 'united-kingdom', england: 'united-kingdom',
  scotland: 'united-kingdom', wales: 'united-kingdom',
  holland: 'netherlands', emirates: 'uae', dubai: 'uae', turkiye: 'turkey',
  burma: 'myanmar', czechia: 'czech-republic', korea: 'south-korea',
};
const matches = (d: Destination, q: string) =>
  !q || d.label.toLowerCase().includes(q) || d.id.includes(q) || ALIASES[q] === d.id;

const REGION_ORDER = ['Europe', 'North America', 'Latin America', 'Caribbean', 'Asia-Pacific', 'Oceania', 'Middle East', 'Africa', 'Central Asia and Caucasus'];

/** The picture every card opens with: the photograph over a sunset sky, the flag and the name. */
export function Picture({ d, big = false, compact = false }: { d: Destination; big?: boolean; compact?: boolean }) {
  return (
    <div style={{ position: 'relative', aspectRatio: '16 / 9', background: skyFor(d.id), overflow: 'hidden' }}>
      <img src={pictureFor(d.id)} alt="" loading={big ? 'eager' : 'lazy'} decoding="async" onError={(e) => { const el = e.currentTarget as HTMLImageElement; const b = bundledPictureFor(d.id); if (b && !el.src.endsWith(b)) { el.src = b; } else { el.style.display = 'none'; } }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,15,46,0) 45%, rgba(26,15,46,0.72) 100%)' }} />
      <div style={{ position: 'absolute', left: compact ? 12 : 16, right: compact ? 12 : 16, bottom: compact ? 10 : 12, display: 'flex', alignItems: 'center', gap: compact ? 7 : 10, minWidth: 0 }}>
        {d.flag && <span aria-hidden style={{ fontSize: big ? 26 : compact ? 16 : 20, lineHeight: 1 }}>{d.flag}</span>}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: big ? 24 : compact ? 15 : 18, fontWeight: 800, color: '#fff', letterSpacing: -0.4, textShadow: '0 2px 10px rgba(0,0,0,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
      </div>
    </div>
  );
}

function whatLine(d: Destination): string {
  if (d.kind === 'region' || d.id === 'usa') return d.countries > 1 ? `${d.countries} countries, one plan` : 'Its own plan, 30 days or renewing';
  return '30 days, or a plan that renews';
}

function Card({ d, summary, apple, onOpen, big = false, compact = false }: { d: Destination; summary: ReturnType<typeof useSummary>; apple: Record<string, string>; onOpen: (id: string) => void; big?: boolean; compact?: boolean }) {
  // Apple's price where StoreKit has answered for this destination (the
  // plan screen shows the same), else the catalogue's.
  const catalogueFrom = summary?.from?.[d.id];
  const from = apple[d.id] ?? (catalogueFrom != null ? money(catalogueFrom, summary!.currency) : null);
  return (
    <button className="press" onClick={() => onOpen(d.id)} style={{ textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', ...cardSurface(), overflow: 'hidden', width: '100%' }}>
      <Picture d={d} big={big} compact={compact} />
      <div style={{ padding: compact ? '10px 12px 12px' : '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: compact ? 2 : 4, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: compact ? 15 : 17, fontWeight: 700, color: RC.ink, letterSpacing: -0.2 }}>{from != null ? `From ${from}` : ' '}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: compact ? 12 : 13, color: RC.inkMute }}>{compact ? '30 days, or renews' : whatLine(d)}</div>
      </div>
    </button>
  );
}

export function StoreScreen({ onOpen, onMyEsim, onLogin, loggedIn }: { onOpen: (id: string) => void; onMyEsim: () => void; onLogin: () => void; loggedIn: boolean }) {
  const summary = useSummary();
  const apple = useAppleFrom(summary);
  const all = useDestinations();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const open = (id: string) => { haptic('light'); onOpen(id); };

  const featured = useMemo(() => FEATURED.map((id) => all.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d) && matches(d!, query)), [all, query]);
  const grouped = useMemo(() => {
    const countries = all.filter((d) => d.kind === 'country' && !FEATURED.includes(d.id) && matches(d, query));
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
          <button className="press" onClick={loggedIn ? onMyEsim : onLogin} style={{ border: `1px solid ${RC.line}`, background: RC.paper, borderRadius: 999, minHeight: TAP, padding: '0 16px', fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, color: RC.inkStrong, cursor: 'pointer' }}>
            {loggedIn ? 'My eSIM' : 'Sign in'}
          </button>
        </div>
        <div style={{ marginTop: 18, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.9, lineHeight: 1.08, textWrap: 'balance' }}>
          Where are you going?
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14.5, color: RC.inkMute, lineHeight: 1.45 }}>
          {total > 60 ? `${total} countries and every region.` : 'Every country and every region.'} Install in a tap, connected when you land.
        </div>

        <div style={{ marginTop: 16, position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="7" stroke={RC.inkMute} strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a country or region" aria-label="Search destinations" style={{ width: '100%', height: 50, padding: '0 16px 0 44px', boxSizing: 'border-box', borderRadius: RADIUS.control, border: `1.5px solid ${RC.line}`, background: RC.paper, outline: 'none', fontFamily: 'var(--font)', fontSize: 15.5, color: RC.ink }} />
        </div>

        {featured.length > 0 && (
          <>
            <div style={{ margin: '20px 0 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: RC.inkMute }}>Plans</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {featured.map((d, i) => <Card key={d.id} d={d} summary={summary} apple={apple} onOpen={open} big={i === 0} />)}
            </div>
          </>
        )}

        {grouped.map(([region, list]) => (
          <div key={region}>
            <div style={{ margin: '22px 0 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: RC.inkMute }}>{region}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(146px, 1fr))', gap: 10 }}>
              {list.map((d) => <Card key={d.id} d={d} summary={summary} apple={apple} onOpen={open} compact />)}
            </div>
          </div>
        ))}

        {all.length > 0 && featured.length === 0 && grouped.length === 0 && (
          <div style={{ marginTop: 24, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, textAlign: 'center' }}>Nothing matches “{q}”.</div>
        )}
        {all.length === 0 && (
          <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 200, borderRadius: RADIUS.card, border: `1px solid ${RC.line}`, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />)}</div>
        )}
      </div>
    </div>
  );
}
