// StoreScreen: every destination the site sells, in the website's own cards
// (owner 2026-09-18: "pictures on all the plans, the same UI as the website,
// to gain trust"). A white card with a photograph, the flag and the name over
// it, and the price under it. The photographs are the site's
// (ringoesim.com/img/data-esims), so the app and the site show the same
// picture for the same place; the list itself comes from the live catalogue.
//
// Layout follows the live width (iPhone Duo: about 360pt closed, about 744pt
// open): the popular plans are one column on a phone and two on a wide
// screen; the country tiles are two up on a phone and three to four up wide.
import { useMemo, useState, type CSSProperties } from 'react';
import { PlaceMosaic } from '../components/PlaceMosaic';
import { RC, RADIUS, TAP, TYPE, cardSurface, typeFor, hexA, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { LOGO_SRC } from '../assets';
import { SectionHead } from '../components/ui';
import { hasMosaic, pictureFor, skyFor, FEATURED, bundledPictureFor, type Destination } from '../data/destinations';
import { useSummary, useAppleFrom } from '../store/summary';
import { useDestinations } from '../store/destinations';
import { money } from '../api/light';
import { haptic } from '../lib/haptics';
import { useLayout, contentColumn, cardGrid, tileGrid, TABBAR_CLEARANCE, type Layout } from '../lib/layout';

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

/**
 * The picture every card opens with: the photograph over a sunset sky (the
 * Global mosaic for Global), the site's dark overlay, the flag and the name.
 * A photo that fails tries the bundled copy, then shows the sky.
 */
export function Picture({ d, size = 'big', eager = false, chip }: { d: Destination; size?: 'big' | 'tile'; eager?: boolean; chip?: string | null }) {
  const big = size === 'big';
  return (
    <div style={{ position: 'relative', aspectRatio: big ? '16 / 9' : '4 / 3', background: skyFor(d.id), overflow: 'hidden' }}>
      {hasMosaic(d.id)
        ? <PlaceMosaic id={d.id} />
        : (
          <img
            src={pictureFor(d.id)}
            alt=""
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              const b = bundledPictureFor(d.id);
              if (b && !el.src.endsWith(b)) el.src = b;
              else el.style.display = 'none';
            }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
      {chip && (
        <span style={{ position: 'absolute', top: 10, right: 10, padding: '5px 10px', borderRadius: RADIUS.pill, background: 'rgba(14,7,24,0.55)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
          {chip}
        </span>
      )}
      <div style={{ position: 'absolute', left: big ? 16 : 12, right: big ? 16 : 12, bottom: big ? 14 : 10, display: 'flex', alignItems: 'center', gap: big ? 10 : 7, minWidth: 0, color: '#fff', textShadow: PHOTO_TEXT_SHADOW }}>
        {d.flag && <span aria-hidden style={{ fontSize: big ? 26 : 18, lineHeight: 1, flexShrink: 0 }}>{d.flag}</span>}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: big ? 24 : 17, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
      </div>
    </div>
  );
}

/** One short line under a popular plan's price. Global is the only plan that renews. */
function whatLine(d: Destination): string {
  if (d.id === 'global') return 'Unlimited data, one monthly plan';
  if (d.kind === 'region' && d.countries > 1) return `Works in ${d.countries} countries`;
  return 'One payment, no renewal';
}

function Card({ d, from, onOpen, size, eager = false }: { d: Destination; from: string | null; onOpen: (id: string) => void; size: 'big' | 'tile'; eager?: boolean }) {
  const big = size === 'big';
  const chip = big && d.kind === 'region' && d.countries > 1 && d.id !== 'global' ? `${d.countries} countries` : null;
  const priceText = from != null ? `From ${from}` : '';
  return (
    <button
      type="button"
      className="card-press"
      onClick={() => onOpen(d.id)}
      aria-label={from != null ? `${d.label}, from ${from}` : d.label}
      style={{ ...cardSurface(), textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', font: 'inherit', color: 'inherit' }}
    >
      <Picture d={d} size={size} eager={eager} chip={chip} />
      <div style={{ padding: big ? '14px 16px 16px' : '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: big ? 17 : 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: RC.ink, fontVariantNumeric: 'tabular-nums', minHeight: big ? 22 : 20 }}>{priceText}</div>
        {big && <div style={{ ...TYPE.small, color: RC.ink2 }}>{whatLine(d)}</div>}
      </div>
    </button>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <circle cx="11" cy="11" r="7" stroke={RC.inkMute} strokeWidth="2" />
        <path d="M20 20l-3.5-3.5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search a country or region"
        aria-label="Search destinations"
        className="ringo-input"
        style={{
          width: '100%', height: 54, padding: value ? '0 52px 0 46px' : '0 16px 0 46px', boxSizing: 'border-box',
          borderRadius: RADIUS.control, background: RC.paper,
          border: `1.5px solid ${focused ? RC.inkStrong : RC.lineStrong}`,
          boxShadow: focused ? `0 0 0 3px ${hexA('#FF5724', 0.14)}` : 'none',
          outline: 'none', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 500, color: RC.ink, letterSpacing: '-0.01em',
          WebkitAppearance: 'none', appearance: 'none',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
        }}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', width: TAP, height: TAP, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <span aria-hidden style={{ width: 22, height: 22, borderRadius: '50%', background: RC.cream, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke={RC.ink2} strokeWidth="2" strokeLinecap="round" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}

function Skeleton({ l }: { l: Layout }) {
  return (
    <div style={{ marginTop: l.sectionGap, ...cardGrid(l) }}>
      {[0, 1, 2, 3].slice(0, l.isWide ? 4 : 3).map((i) => (
        <div key={i} style={{ aspectRatio: '16 / 12', borderRadius: RADIUS.card, border: `1.5px solid ${RC.line}`, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );
}

export function StoreScreen({ onOpen, onMyEsim, onLogin, loggedIn }: { onOpen: (id: string) => void; onMyEsim: () => void; onLogin: () => void; loggedIn: boolean }) {
  const l = useLayout();
  const summary = useSummary();
  const apple = useAppleFrom(summary);
  const all = useDestinations();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const open = (id: string) => { haptic('light'); onOpen(id); };

  // Apple's price where StoreKit has answered for this destination (the plan
  // screen shows the same), else the catalogue's.
  const fromOf = (d: Destination): string | null => {
    const c = summary?.from?.[d.id];
    return apple[d.id] ?? (c != null && summary ? money(c, summary.currency) : null);
  };

  const featured = useMemo(() => FEATURED.map((id) => all.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d) && matches(d!, query)), [all, query]);
  const grouped = useMemo(() => {
    const countries = all.filter((d) => d.kind === 'country' && !FEATURED.includes(d.id) && matches(d, query));
    const by = new Map<string, Destination[]>();
    for (const d of countries) { const k = d.region || 'More places'; if (!by.has(k)) by.set(k, []); by.get(k)!.push(d); }
    for (const list of by.values()) list.sort((a, b) => a.label.localeCompare(b.label));
    return [...by.entries()].sort((a, b) => (REGION_ORDER.indexOf(a[0]) + 1 || 99) - (REGION_ORDER.indexOf(b[0]) + 1 || 99));
  }, [all, query]);

  const nothing = all.length > 0 && featured.length === 0 && grouped.length === 0;
  const accountBtn: CSSProperties = {
    border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, borderRadius: RADIUS.pill, minHeight: TAP, padding: '0 18px',
    fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.orangeInk, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px))', paddingBottom: `calc(${TABBAR_CLEARANCE} + 24px)` }}>
        <div style={contentColumn(l)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: TAP }}>
            <img src={LOGO_SRC} alt="Ringo" style={{ height: l.isWide ? 34 : 30, width: 'auto', display: 'block' }} />
            <button type="button" className="press" onClick={loggedIn ? onMyEsim : onLogin} style={accountBtn}>
              {loggedIn ? 'My eSIM' : 'Sign in'}
            </button>
          </div>

          <h1 style={{ margin: '20px 0 0', ...typeFor('display', l.size), color: RC.ink, textWrap: 'balance' } as CSSProperties}>
            Where are you going?
          </h1>
          <p style={{ margin: '8px 0 16px', ...TYPE.body, color: RC.ink2 }}>Your eSIM is ready in minutes.</p>

          <div style={l.isWide ? { maxWidth: 560 } : undefined}>
            <SearchField value={q} onChange={setQ} />
          </div>

          {featured.length > 0 && (
            <section style={{ marginTop: l.sectionGap }}>
              {!query && <SectionHead title="Popular plans" sub="Many countries, one eSIM." />}
              <div style={cardGrid(l)}>
                {featured.map((d, i) => (
                  <Card key={d.id} d={d} from={fromOf(d)} onOpen={open} size="big" eager={i < (l.isWide ? 2 : 1)} />
                ))}
              </div>
            </section>
          )}

          {grouped.map(([region, list]) => (
            <section key={region} style={{ marginTop: l.sectionGap }}>
              <SectionHead title={region} />
              <div style={tileGrid(l)}>
                {list.map((d) => <Card key={d.id} d={d} from={fromOf(d)} onOpen={open} size="tile" />)}
              </div>
            </section>
          ))}

          {nothing && (
            <div style={{ marginTop: l.sectionGap, textAlign: 'center' }}>
              <div style={{ ...TYPE.h3, color: RC.ink }}>Nothing matches “{q.trim()}”</div>
              <div style={{ marginTop: 6, ...TYPE.small, color: RC.ink2 }}>Try a country name, or Global for everywhere.</div>
            </div>
          )}
          {all.length === 0 && <Skeleton l={l} />}
        </div>
      </div>
    </div>
  );
}
