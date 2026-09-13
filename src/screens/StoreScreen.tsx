// StoreScreen — the shop. Every destination Ringo Light sells, with its picture
// and its lowest price: the six regions as big cards, the countries as tiles.
// Prices come live from ringoesim.com (EUR in Europe, USD elsewhere, decided
// by the site from the caller's IP); the layout renders at once from the
// bundled list and fills the prices in when they land.
import { useMemo, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD } from '../theme';
import { LOGO_SRC } from '../assets';
import { REGIONS, COUNTRIES, pictureFor, type Destination } from '../data/destinations';
import { money, type Summary } from '../api/light';
import { useSummary } from '../store/summary';
import { haptic } from '../lib/haptics';

function FromPrice({ id, summary, light: onDark = false }: { id: string; summary: Summary | null; light?: boolean }) {
  const cents = summary?.from?.[id];
  const text = cents != null ? `From ${money(cents, summary!.currency)}` : ' ';
  return (
    <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: onDark ? 'rgba(255,255,255,0.92)' : RC.inkStrong, minHeight: 16, display: 'inline-block' }}>
      {text}
    </span>
  );
}

function RegionCard({ d, summary, onOpen }: { d: Destination; summary: Summary | null; onOpen: () => void }) {
  return (
    <button
      className="press"
      onClick={onOpen}
      style={{
        border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
        position: 'relative', height: 150, borderRadius: RADIUS.xl, overflow: 'hidden',
        background: RC.cream2, boxShadow: SHADOW_CARD,
      }}
    >
      <img src={pictureFor(d.id)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0) 30%, rgba(20,10,30,0.72) 100%)' }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.05, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{d.label}</div>
          <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.86)' }}>
            {d.countries === 1 ? 'One country' : `${d.countries} countries`}
          </div>
        </div>
        <div style={{ flexShrink: 0, padding: '7px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.35)' }}>
          <FromPrice id={d.id} summary={summary} light />
        </div>
      </div>
    </button>
  );
}

function CountryTile({ d, summary, onOpen }: { d: Destination; summary: Summary | null; onOpen: () => void }) {
  return (
    <button
      className="press"
      onClick={onOpen}
      style={{
        border: `1px solid ${RC.line}`, padding: 0, cursor: 'pointer', textAlign: 'left',
        borderRadius: RADIUS.lg, overflow: 'hidden', background: RC.paper, boxShadow: SHADOW_CARD,
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', height: 84, background: RC.cream2 }}>
        <img src={pictureFor(d.id)} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ padding: '9px 11px 11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink, letterSpacing: -0.2 }}>
          {d.flag && <span aria-hidden style={{ fontSize: 15 }}>{d.flag}</span>}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
        </div>
        <div style={{ marginTop: 2 }}><FromPrice id={d.id} summary={summary} /></div>
      </div>
    </button>
  );
}

export function StoreScreen({ onOpen, onMyEsim }: { onOpen: (id: string) => void; onMyEsim?: () => void }) {
  const summary = useSummary();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const regions = useMemo(() => REGIONS.filter((d) => !query || d.label.toLowerCase().includes(query)), [query]);
  const countries = useMemo(() => COUNTRIES.filter((d) => !query || d.label.toLowerCase().includes(query)), [query]);
  const open = (id: string) => { haptic('light'); onOpen(id); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px)) 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: 30, width: 'auto', display: 'block' }} />
          {onMyEsim && (
            <button className="press" onClick={onMyEsim} style={{ border: `1px solid ${RC.line}`, background: RC.paper, borderRadius: 999, padding: '7px 12px', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: RC.inkStrong, cursor: 'pointer' }}>
              My eSIM
            </button>
          )}
        </div>
        <div style={{ marginTop: 18, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.9, lineHeight: 1.08, textWrap: 'balance' }}>
          Where are you going?
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14.5, color: RC.inkMute, lineHeight: 1.45 }}>
          Data eSIMs for 35 destinations. Pay once, install in a tap, connected when you land.
        </div>

        <div style={{ marginTop: 16, height: 48, padding: '0 14px', borderRadius: 14, background: RC.paper, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke={RC.inkMute} strokeWidth="2" />
            <path d="M20 20l-3-3" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a country or region"
            aria-label="Search destinations"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font)', fontSize: 15, color: RC.ink }}
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear" style={{ border: 'none', background: RC.cream, borderRadius: 999, width: 22, height: 22, cursor: 'pointer', color: RC.inkMute, fontSize: 13, lineHeight: 1 }}>×</button>
          )}
        </div>

        {regions.length > 0 && (
          <>
            <div style={{ marginTop: 22, marginBottom: 10, fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>Regions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {regions.map((d) => <RegionCard key={d.id} d={d} summary={summary} onOpen={() => open(d.id)} />)}
            </div>
          </>
        )}

        {countries.length > 0 && (
          <>
            <div style={{ marginTop: 24, marginBottom: 10, fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>Countries</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {countries.map((d) => <CountryTile key={d.id} d={d} summary={summary} onOpen={() => open(d.id)} />)}
            </div>
          </>
        )}

        {regions.length === 0 && countries.length === 0 && (
          <div style={{ marginTop: 40, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
            Nothing called “{q.trim()}” yet. The Global plan works in 133 countries.
            <div style={{ marginTop: 12 }}>
              <button className="press" onClick={() => open('global')} style={{ border: 'none', background: RC.gradSoft, color: RC.inkStrong, borderRadius: 999, padding: '9px 14px', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>See the Global plan</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 26, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.5, textAlign: 'center' }}>
          Prices include VAT. Payment by card or Apple Pay through Stripe.
        </div>
      </div>
    </div>
  );
}
