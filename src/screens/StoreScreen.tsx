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
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { PlaceMosaic } from '../components/PlaceMosaic';
import { RC, RADIUS, TAP, TYPE, cardSurface, typeFor, hexA, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { LOGO_SRC } from '../assets';
import { SectionHead } from '../components/ui';
import { hasMosaic, pictureFor, skyFor, FEATURED, bundledPictureFor, type Destination } from '../data/destinations';
import { useSummary, useAppleFrom } from '../store/summary';
import { useDestinations } from '../store/destinations';
import { money, light } from '../api/light';
import { CITIES } from '../data/cities';
import { useAccount } from '../store/account';
import { haptic, hapticSelection } from '../lib/haptics';
import { useLayout, contentColumn, cardGrid, tileGrid, TABBAR_CLEARANCE, type Layout } from '../lib/layout';
import europeOrbitPhoto from '../assets/store/europe-orbit.jpg'; // NASA iss066e116300, public domain
import dishPhoto from '../assets/store/dish-blue.jpg'; // Unsplash Wj1D-qiOseE, Unsplash licence

// The Power shortcut card over the list: a photograph like every other card
// in the app, a small icon over it, the words at the foot.
const shortcutCard = (photo: string, place = 'center / cover'): CSSProperties => ({
  position: 'relative', overflow: 'hidden', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 22, border: 'none', fontFamily: 'var(--font)', color: '#fff',
  background: `linear-gradient(180deg, rgba(26,15,46,0) 28%, rgba(26,15,46,0.88) 100%), url(${photo}) ${place}, ${RC.ink}`, textShadow: PHOTO_TEXT_SHADOW,
});
// The Power list gets a sky gradient behind it, so it is plain which list is open.
const POWER_TOP = '#BFD3FF';
const POWER_BG = `linear-gradient(180deg, ${POWER_TOP} 0%, #D6D2FA 240px, #EEE6FB 520px, ${RC.bg} 900px)`;
// On the Power list a region can show a satellite picture instead of its usual photographs.
const POWER_PHOTOS: Record<string, string> = { europe: europeOrbitPhoto };
const shortcutIcon: CSSProperties = { width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,15,46,0.32)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' };

// What people actually type. "United States" does not contain "usa", so the
// most obvious search in an eSIM store returned nothing at all.
const ALIASES: Record<string, string> = {
  usa: 'usa', us: 'usa', america: 'usa', 'united states': 'usa',
  uk: 'united-kingdom', britain: 'united-kingdom', england: 'united-kingdom',
  scotland: 'united-kingdom', wales: 'united-kingdom',
  holland: 'netherlands', emirates: 'uae', dubai: 'uae', turkiye: 'turkey',
  burma: 'myanmar', czechia: 'czech-republic', korea: 'south-korea',
};
// The ISO code a destination's flag emoji spells (its two regional indicators).
function isoOf(d: Destination): string | null {
  const cps = [...String(d.flag || '')].map((c) => c.codePointAt(0)! - 0x1f1e6);
  return cps.length === 2 && cps.every((n) => n >= 0 && n < 26) ? String.fromCharCode(65 + cps[0], 65 + cps[1]) : null;
}
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Cities whose name starts with the query (or a word in it does): "barc" finds Barcelona.
// Folded once: search runs on every keystroke over ~300 cities.
let FOLDED: { words: string[]; iso: string; name: string }[] | null = null;
const foldedCities = () => (FOLDED ??= CITIES.map(([name, iso]) => ({ name, iso, words: fold(name).split(/[\s-]+/) })));
function citiesFor(q: string): [string, string][] {
  const f = fold(q);
  if (f.length < 2) return [];
  return foldedCities().filter(({ words }) => words.some((w, i) => w.startsWith(f) || words.slice(i).join(' ').startsWith(f))).map(({ name, iso }) => [name, iso]);
}
// The countries whose cities match, worked out once per query, not once per destination.
let lastCityQuery = '';
let lastCityIsos = new Set<string>();
const cityIsos = (q: string) => {
  if (q !== lastCityQuery) { lastCityQuery = q; lastCityIsos = new Set(citiesFor(q).map(([, c]) => c)); }
  return lastCityIsos;
};
const matches = (d: Destination, q: string) => {
  if (!q) return true;
  if (fold(d.label).includes(fold(q)) || d.id.includes(q) || ALIASES[q] === d.id) return true;
  const iso = isoOf(d);
  return Boolean(iso) && cityIsos(q).has(iso!);
};

const REGION_ORDER = ['Europe', 'North America', 'Latin America', 'Caribbean', 'Asia-Pacific', 'Oceania', 'Middle East', 'Africa', 'Central Asia and Caucasus'];

/**
 * The picture every card opens with: the photograph over a sunset sky (the
 * Global mosaic for Global), the site's dark overlay, the flag and the name.
 * A photo that fails tries the bundled copy, then shows the sky.
 */
export function Picture({ d, size = 'big', eager = false, chip, photo }: { d: Destination; size?: 'big' | 'tile'; eager?: boolean; chip?: string | null; photo?: string }) {
  const big = size === 'big';
  return (
    <div style={{ position: 'relative', aspectRatio: big ? '16 / 9' : '4 / 3', background: skyFor(d.id), overflow: 'hidden' }}>
      {hasMosaic(d.id) && !photo
        ? <PlaceMosaic id={d.id} />
        : (
          <img
            src={photo ?? pictureFor(d.id)}
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

function Card({ d, from, onOpen, onPeek, size, eager = false, photo }: { d: Destination; from: string | null; onOpen: (id: string) => void; onPeek?: (d: Destination) => void; size: 'big' | 'tile'; eager?: boolean; photo?: string }) {
  // Press and hold: a quick look at the price without leaving the store
  // (owner 2026-10-24, long-press preview); the tap that ends the hold does not open it.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peeked = useRef(false);
  const startY = useRef(0);
  const stop = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const big = size === 'big';
  const chip = big && d.kind === 'region' && d.countries > 1 && d.id !== 'global' ? `${d.countries} countries` : null;
  const priceText = from != null ? `From ${from}` : '';
  return (
    <button
      type="button"
      className="card-press"
      onClick={() => { if (peeked.current) { peeked.current = false; return; } onOpen(d.id); }}
      // Touch events, not pointer events: WKWebView cancels the pointer when its
      // own long press starts, so the hold is timed on the touch itself.
      onTouchStart={(e) => { peeked.current = false; startY.current = e.touches[0]?.clientY ?? 0; stop(); if (onPeek) timer.current = setTimeout(() => { timer.current = null; peeked.current = true; onPeek(d); }, 420); }}
      onTouchMove={(e) => { if (Math.abs((e.touches[0]?.clientY ?? 0) - startY.current) > 8) stop(); }}
      onTouchEnd={(e) => { stop(); if (peeked.current) e.preventDefault(); }}
      onTouchCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={from != null ? `${d.label}, from ${from}` : d.label}
      style={{ ...cardSurface(), textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', font: 'inherit', color: 'inherit', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <Picture d={d} size={size} eager={eager} chip={chip} photo={photo} />
      <div style={{ padding: big ? '14px 16px 16px' : '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: big ? 17 : 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: RC.ink, fontVariantNumeric: 'tabular-nums', minHeight: big ? 22 : 20 }}>{priceText}</div>
        {big && <div style={{ ...TYPE.small, color: RC.ink2 }}>{whatLine(d)}</div>}
      </div>
    </button>
  );
}

function SearchField({ value, onChange, placeholder = 'Search a country, city or region' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
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
        placeholder={placeholder}
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

export function StoreScreen({ onOpen, onMyEsim, onLogin, loggedIn, onQuiz }: { onOpen: (id: string, opts?: { power?: boolean }) => void; onMyEsim: () => void; onLogin: () => void; loggedIn: boolean; onQuiz?: () => void }) {
  const l = useLayout();
  const summary = useSummary();
  const apple = useAppleFrom(summary);
  const all = useDestinations();
  const [q, setQ] = useState('');
  // The Power plans card lists every place that sells Power, priced at its
  // cheapest Power plan (owner 2026-10-27: browse them all without searching);
  // a place opens on its Power plans.
  const [powerAsk, setPowerAsk] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const query = q.trim().toLowerCase();
  const [peek, setPeek] = useState<Destination | null>(null);
  const acct = useAccount();
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    // Signed out: the last account's trips go with it.
    if (!acct) { setVisited([]); return; }
    let alive = true;
    light.profile(acct.userId, acct.t).then((p) => { if (alive) setVisited(p.badges.map((b) => b.destination)); }).catch(() => {});
    return () => { alive = false; };
  }, [acct]);
  // Suggestions while typing: destinations whose name starts with it, then cities.
  const suggestions = useMemo(() => {
    if (query.length < 2) return [] as { key: string; label: string; sub: string; d: Destination }[];
    const byIso = new Map(all.filter((d) => d.kind === 'country').map((d) => [isoOf(d), d] as const));
    const out: { key: string; label: string; sub: string; d: Destination }[] = [];
    for (const d of all) if (fold(d.label).startsWith(fold(query))) out.push({ key: d.id, label: d.label, sub: d.kind === 'region' ? `${d.countries} countries` : 'Country', d });
    for (const [name, iso] of citiesFor(query)) { const d = byIso.get(iso); if (d && !out.some((o) => o.key === `${name}|${d.id}`)) out.push({ key: `${name}|${d.id}`, label: name, sub: d.label, d }); }
    return out.slice(0, 6);
  }, [all, query]);
  // Your next trip: countries near the ones you have been to, cheapest first.
  const nextTrips = useMemo(() => {
    if (!visited.length) return [] as Destination[];
    const been = new Set(visited);
    const regions = new Set(all.filter((d) => been.has(d.id)).map((d) => d.region).filter(Boolean));
    return all
      .filter((d) => d.kind === 'country' && !been.has(d.id) && regions.has(d.region))
      .sort((a, b) => (summary?.from?.[a.id] ?? 1e9) - (summary?.from?.[b.id] ?? 1e9))
      .slice(0, 4);
  }, [all, visited, summary]);
  // After the Power plans card, the place opens on its Power plans (passed
  // with the navigation: the screen mounts twice in the slide, a one-time note would be read by the wrong one).
  const open = (id: string) => { haptic('light'); onOpen(id, powerAsk ? { power: true } : undefined); };
  // The strip under the clock (App.tsx) takes the Power wash's top colour while that list is open.
  useEffect(() => {
    if (!powerAsk) return;
    document.documentElement.style.setProperty('--status-strip', POWER_TOP);
    return () => { document.documentElement.style.removeProperty('--status-strip'); };
  }, [powerAsk]);
  const showPower = (on: boolean) => { hapticSelection(); setPowerAsk(on); setQ(''); scroller.current?.scrollTo({ top: 0 }); };

  // The places that sell Power (an older site names none: every place but Global, unpriced).
  const powerFrom = summary?.power_from;
  const sellsPower = (d: Destination) => (powerFrom ? powerFrom[d.id] != null : d.id !== 'global');
  // Apple's price where StoreKit has answered for this destination (the plan
  // screen shows the same), else the catalogue's; on the Power list, its cheapest Power plan.
  const fromOf = (d: Destination): string | null => {
    if (powerAsk) { const p = powerFrom?.[d.id]; return p != null && summary ? money(p, summary.currency) : null; }
    const c = summary?.from?.[d.id];
    return apple[d.id] ?? (c != null && summary ? money(c, summary.currency) : null);
  };

  // On the Power list, the regions that sell Power, the store's order first.
  const featured = useMemo(() => {
    if (!powerAsk) return FEATURED.map((id) => all.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d) && matches(d!, query));
    const rank = (d: Destination) => (FEATURED.indexOf(d.id) + 1) || 99;
    return all.filter((d) => d.kind === 'region' && sellsPower(d) && matches(d, query)).sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sellsPower reads powerFrom
  }, [all, query, powerAsk, powerFrom]);
  const grouped = useMemo(() => {
    const countries = all.filter((d) => d.kind === 'country' && (powerAsk ? sellsPower(d) : !FEATURED.includes(d.id)) && matches(d, query));
    const by = new Map<string, Destination[]>();
    for (const d of countries) { const k = d.region || 'More places'; if (!by.has(k)) by.set(k, []); by.get(k)!.push(d); }
    for (const list of by.values()) list.sort((a, b) => a.label.localeCompare(b.label));
    return [...by.entries()].sort((a, b) => (REGION_ORDER.indexOf(a[0]) + 1 || 99) - (REGION_ORDER.indexOf(b[0]) + 1 || 99));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sellsPower reads powerFrom
  }, [all, query, powerAsk, powerFrom]);

  const nothing = all.length > 0 && featured.length === 0 && grouped.length === 0;
  const accountBtn: CSSProperties = {
    border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, borderRadius: RADIUS.pill, minHeight: TAP, padding: '0 18px',
    fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.orangeInk, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: powerAsk ? POWER_BG : undefined }}>
      <div ref={scroller} className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px))', paddingBottom: `calc(${TABBAR_CLEARANCE} + 24px)` }}>
        <div style={contentColumn(l)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: TAP }}>
            <img src={LOGO_SRC} alt="Ringo" style={{ height: l.isWide ? 34 : 30, width: 'auto', display: 'block' }} />
            <button type="button" className="press" onClick={loggedIn ? onMyEsim : onLogin} style={accountBtn}>
              {loggedIn ? 'My eSIM' : 'Sign in'}
            </button>
          </div>

          {powerAsk && (
            <button type="button" className="press" onClick={() => showPower(false)} style={{ ...accountBtn, marginTop: 16, color: RC.ink, fontWeight: 600 }}>
              All plans
            </button>
          )}
          <h1 style={{ margin: powerAsk ? '14px 0 0' : '20px 0 0', ...typeFor('display', l.size), color: RC.ink, textWrap: 'balance' } as CSSProperties}>
            {powerAsk ? 'Power plans' : 'Where are you going?'}
          </h1>
          <p style={{ margin: '8px 0 16px', ...TYPE.body, color: RC.ink2 }}>
            {powerAsk ? 'Unlimited data for a van, hotspot or laptop.' : 'Your eSIM is ready in minutes.'}
          </p>

          <div data-store-search style={l.isWide ? { maxWidth: 560 } : undefined}>
            <SearchField value={q} onChange={setQ} placeholder={powerAsk ? 'Where do you need Power?' : undefined} />
            {powerAsk && !q && !powerFrom && (
              <p role="status" style={{ margin: '8px 2px 0', ...TYPE.small, color: RC.ink2 }}>Pick a country or region to see its Power and Super User plans.</p>
            )}
            {!powerAsk && suggestions.length > 0 && (
              <div role="listbox" aria-label="Suggestions" style={{ marginTop: 8, ...cardSurface(), padding: 0, overflow: 'hidden' }}>
                {suggestions.map((sg, i) => (
                  <button key={sg.key} type="button" role="option" aria-selected={false} className="press" onClick={() => open(sg.d.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${RC.line}` : 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
                    <span aria-hidden style={{ fontSize: 20, width: 24, textAlign: 'center' }}>{sg.d.flag || '🌍'}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, color: RC.ink }}>{sg.label}</span>
                      <span style={{ display: 'block', fontFamily: 'var(--font)', fontSize: 13, color: RC.ink2 }}>{sg.sub}</span>
                    </span>
                    {fromOf(sg.d) && <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink2 }}>{`From ${fromOf(sg.d)}`}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!query && !powerAsk && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: l.cardGap }}>
              {onQuiz && (
                <button type="button" className="press" onClick={() => { hapticSelection(); onQuiz(); }}
                  style={{ ...cardSurface(), textAlign: 'left', cursor: 'pointer', padding: 16, border: `1.5px solid ${RC.line}`, fontFamily: 'var(--font)' }}>
                  <svg aria-hidden width="26" height="26" viewBox="0 0 24 24"><g fill={RC.orangeInk}><rect x="3" y="15" width="3.6" height="6" rx="1.2" /><rect x="8.6" y="11" width="3.6" height="10" rx="1.2" /><rect x="14.2" y="7" width="3.6" height="14" rx="1.2" /><rect x="19.4" y="3" width="1.6" height="18" rx=".8" opacity=".35" /></g></svg>
                  <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: RC.ink }}>How much data do I need?</div>
                  <div style={{ marginTop: 2, fontSize: 13, color: RC.ink2 }}>Four quick questions.</div>
                </button>
              )}
              <button type="button" className="press"
                onClick={() => showPower(true)}
                style={shortcutCard(dishPhoto, 'center top / cover')}>
                <span style={shortcutIcon}><svg aria-hidden width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M13.4 2.2c.4-.6-.3-1.3-.9-.9L4.6 12.2c-.4.5 0 1.3.6 1.3h5.3l-1.9 8.2c-.2.7.7 1.1 1.1.5l9.6-11.6c.4-.5 0-1.2-.6-1.2h-5.6l.3-7.2z" /></svg></span>
                <span style={{ display: 'block', marginTop: 12 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>Power plans</span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: 'rgba(255,255,255,0.92)' }}>Vans and hotspots.</span>
                </span>
              </button>
            </div>
          )}

          {!query && !powerAsk && nextTrips.length > 0 && (
            <section style={{ marginTop: l.sectionGap }}>
              <SectionHead title="Your next trip" sub="Close to where you have been." />
              <div style={tileGrid(l)}>
                {nextTrips.map((d) => <Card key={d.id} d={d} from={fromOf(d)} onOpen={open} onPeek={setPeek} size="tile" />)}
              </div>
            </section>
          )}

          {featured.length > 0 && (
            <section style={{ marginTop: l.sectionGap }}>
              {!query && <SectionHead title={powerAsk ? 'Regions' : 'Popular plans'} sub="Many countries, one eSIM." />}
              <div style={cardGrid(l)}>
                {featured.map((d, i) => (
                  <Card key={d.id} d={d} from={fromOf(d)} onOpen={open} onPeek={setPeek} size="big" eager={i < (l.isWide ? 2 : 1)} photo={powerAsk ? POWER_PHOTOS[d.id] : undefined} />
                ))}
              </div>
            </section>
          )}

          {grouped.map(([region, list]) => (
            <section key={region} style={{ marginTop: l.sectionGap }}>
              <SectionHead title={region} />
              <div style={tileGrid(l)}>
                {list.map((d) => <Card key={d.id} d={d} from={fromOf(d)} onOpen={open} onPeek={setPeek} size="tile" />)}
              </div>
            </section>
          ))}

          {nothing && (
            <div style={{ marginTop: l.sectionGap, textAlign: 'center' }}>
              <div style={{ ...TYPE.h3, color: RC.ink }}>Nothing matches “{q.trim()}”</div>
              <div style={{ marginTop: 6, ...TYPE.small, color: RC.ink2 }}>{powerAsk ? 'Try a country or region name.' : 'Try a country name, or Global for everywhere.'}</div>
            </div>
          )}
          {all.length === 0 && <Skeleton l={l} />}
        </div>
      </div>
      {peek && (
        <div role="dialog" aria-modal="true" aria-label={peek.label} onClick={() => setPeek(null)}
          style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(26,15,46,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ringoFadeIn 0.18s ease both' }}>
          <div onClick={(e) => e.stopPropagation()} className="rise" style={{ width: '100%', maxWidth: 360, ...cardSurface(), padding: 0, overflow: 'hidden' }}>
            <Picture d={peek} size="big" />
            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink }}>{fromOf(peek) ? `From ${fromOf(peek)}` : peek.label}</div>
              <div style={{ marginTop: 2, ...TYPE.small, color: RC.ink2 }}>{whatLine(peek)}</div>
              <button type="button" className="press" onClick={() => { const id = peek.id; setPeek(null); open(id); }}
                style={{ marginTop: 14, width: '100%', minHeight: 48, borderRadius: 14, border: 'none', background: '#F26122', color: '#fff', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>See plans</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
