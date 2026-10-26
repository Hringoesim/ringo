// WaitlistScreen: the full Ringo service (owner 2026-10-24: "On the app the
// signup to Ringo's waitlist global number portability and the survey this
// needs to be there too"). One plan with your own number ported onto it,
// working in every country: not launched, the waitlist is free. Ringo Light
// (the data eSIMs this app sells) is named as what funds it and never mixed
// in with the waitlist itself.
//
// States: signed out (explain, sign in), lead (Join the waitlist), on the
// waitlist (place in line, share link, survey), Pioneer (their status instead
// of the place, then share and survey).
//
// The survey is the website's (src/App.jsx DashboardProfile), stored values
// verbatim. /api/profile keeps a stored value only when NULL is sent: an
// empty array OVERWRITES. So the form is always filled from /api/dashboard
// first and every save carries the full current state of every field.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { RC, TYPE, RADIUS, TAP, typeFor, cardSurface, SITE_GRAD, hexA } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { SaturnWorld } from '../components/SaturnWorld';
import { BackBtn, ErrorBox, PioneerBadge } from '../components/ui';
import { light, type ProfileAnswers, type WaitlistDashboard, type WaitlistUser } from '../api/light';
import { useAccount } from '../store/account';
import { useLayout, contentColumn, twoColumn, type Layout } from '../lib/layout';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { countryByIso, isoArray, isoOrEmpty, searchCountries, type Country } from '../lib/countries';
import { PROFILE_QUESTIONS, PLACES_PER_REFERRAL, PLACES_PER_ANSWER, firstNameOf, fmt, isLead, isPioneer, placeFrom, referralLink } from '../lib/waitlist';

// ── The survey's options, byte-identical to the website ─────────────────────
const TOP_VALUES = [
  'Call & text with my number like I do at home',
  'Group my international phone numbers in one plan',
  'A local number where I live or travel',
  'Unlimited data abroad included',
  'Getting my bank & app codes',
  'One fixed monthly price, no roaming surprises',
];
const TRAVEL_REGIONS = ['Europe', 'North America', 'Asia', 'Latin America', 'Africa', 'Middle East', 'Australia'];
const MAX_VALUES = 3;
const AUTOSAVE_TEXT_MS = 1200;

/** Saved answers split into the options shown and anything else (kept and re-sent unchanged). */
function split(saved: unknown, known: string[]): { picked: string[]; other: string[] } {
  const arr = Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  return { picked: known.filter((k) => arr.includes(k)), other: arr.filter((x) => !known.includes(x)) };
}

// ── Small pieces ────────────────────────────────────────────────────────────

// The hero: the welcome screen's illustrated globe, floating on the plum
// night sky with a sunset horizon (owner 2026-10-24: "needs a better globe"),
// a "Your number" chip riding on it, and the promise in white.
const STARS = Array.from({ length: 34 }, (_, i) => {
  // Deterministic positions so the sky does not reshuffle on every render.
  const r = (n: number) => { const x = Math.sin(i * 97.13 + n * 13.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * 100, y: r(2) * 62, s: r(3) < 0.18 ? 2.4 : r(3) < 0.55 ? 1.6 : 1.1, o: 0.35 + r(4) * 0.55 };
});

function NumberChip() {
  return (
    <div aria-hidden style={{
      position: 'absolute', right: '-10%', top: '2%', display: 'flex', alignItems: 'center', gap: 7,
      padding: '7px 12px 7px 8px', borderRadius: RADIUS.pill, background: '#FFFFFF',
      boxShadow: '0 10px 24px -10px rgba(26,15,46,0.6)', animation: 'ringoGlobeFloat 6s ease-in-out infinite reverse',
    }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#f26122,#ff42a1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" fill="#fff" /></svg>
      </span>
      <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 800, color: '#1A0F2E', whiteSpace: 'nowrap' }}>Your number</span>
    </div>
  );
}

function Hero({ l, children, signedOut = false }: { l: Layout; children?: ReactNode; signedOut?: boolean }) {
  const size = l.isWide ? 280 : l.isCover ? 190 : 220;
  return (
    <section style={{
      position: 'relative', overflow: 'hidden', borderRadius: 28,
      background: 'radial-gradient(120% 70% at 50% 0%, #3B1F5E 0%, #1A0F2E 58%), #1A0F2E',
      boxShadow: '0 22px 44px -22px rgba(88,24,72,0.7)',
    }}>
      {/* Stars, then the sunset horizon rising behind the globe. */}
      <div aria-hidden style={{ position: 'absolute', inset: 0 }}>
        {STARS.map((st, i) => (
          <span key={i} style={{ position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: '50%', background: '#FFF6EC', opacity: st.o }} />
        ))}
        <div style={{ position: 'absolute', left: '-20%', right: '-20%', bottom: '-38%', height: '78%', borderRadius: '50%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,122,82,0.55) 0%, rgba(255,66,161,0.28) 42%, rgba(134,82,224,0) 72%)' }} />
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: `${l.isCover ? 22 : 28}px ${l.cardPad + 4}px ${l.cardPad + 8}px` }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <div aria-hidden style={{ position: 'absolute', left: '50%', bottom: -10, transform: 'translateX(-50%)', width: size * 0.62, height: 20, borderRadius: '50%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(10,4,20,0.55) 0%, rgba(10,4,20,0) 70%)', animation: 'ringoGlobeFloat 6s ease-in-out infinite reverse' }} />
          <div style={{ animation: 'ringoGlobeIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div style={{ animation: 'ringoGlobeFloat 6s ease-in-out infinite' }}>
              <SaturnWorld size={size} satellite />
            </div>
          </div>
          <NumberChip />
        </div>
        <h2 style={{ margin: '22px 0 0', color: '#FFFFFF', textWrap: 'balance', ...typeFor('hero', l.isWide ? 'phone' : l.size) }}>
          Ringo: your number, every country
        </h2>
        <p style={{ margin: '10px 0 0', ...TYPE.body, color: 'rgba(255,255,255,0.9)', maxWidth: 460 }}>
          Port your own number onto one plan that works in every country. We are building it now, and the waitlist is free.
        </p>
        {signedOut && <p style={{ margin: '8px 0 0', ...TYPE.small, color: 'rgba(255,255,255,0.82)' }}>Sign in to join the waitlist and see your place in line.</p>}
        {children && <div style={{ width: '100%', maxWidth: 420, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
      </div>
    </section>
  );
}

// What the full service is, in three ticks, and what funds it.
function Promise({ l }: { l: Layout }) {
  return (
    <section style={{ ...cardSurface(), padding: l.cardPad }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {['Keep your own number, moved to Ringo', 'One plan that works in every country', 'Free to join, nothing to pay'].map((t) => (
          <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', ...TYPE.body, color: RC.ink }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ marginTop: 4, flexShrink: 0 }}><path d="M3 8.5l3.2 3L13 4.5" stroke="hsl(142,60%,42%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: '14px 0 0', ...TYPE.small, color: RC.ink2 }}>Ringo Light, the data eSIMs you buy in this app, is what funds it.</p>
    </section>
  );
}

function Card({ l, children, style = {}, label }: { l: Layout; children: ReactNode; style?: CSSProperties; label?: string }) {
  return <section aria-label={label} style={{ ...cardSurface(), padding: l.cardPad, ...style }}>{children}</section>;
}

function PlaceCard({ l, user, liveAnswers }: { l: Layout; user: WaitlistUser; liveAnswers: number }) {
  const { ahead, behind } = placeFrom(user, liveAnswers);
  const first = firstNameOf(user);
  return (
    <Card l={l} label="Your place in line">
      <h2 style={{ margin: 0, ...TYPE.h2, color: RC.ink }}>{first ? `Welcome, ${first}! You're on the waitlist` : "Welcome! You're on the waitlist"}</h2>
      {ahead == null ? (
        <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>You're in line for Ringo.</p>
      ) : ahead === 0 ? (
        <p style={{ margin: '12px 0 0', ...TYPE.bodyStrong, color: RC.ink }}>You're at the front of the line.</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div aria-live="polite" style={{ fontFamily: 'var(--font-display)', fontSize: l.isCover ? 44 : 52, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(ahead)}
          </div>
          <div style={{ marginTop: 6, ...TYPE.body, color: RC.ink2 }}>{ahead === 1 ? 'person ahead of you' : 'people ahead of you'}</div>
        </div>
      )}
      {behind != null && behind > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${RC.line}`, ...TYPE.small, color: RC.ink2 }}>
          <b style={{ color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{fmt(behind)}</b> behind you
        </div>
      )}
    </Card>
  );
}

function PioneerCard({ l, user, status }: { l: Layout; user: WaitlistUser; status: string }) {
  const first = firstNameOf(user);
  return (
    <Card l={l} label="Your Pioneer status">
      <PioneerBadge tone="gold" label={status === 'promoter_pioneer' ? 'Ringo Pioneer, promoter' : 'Ringo Pioneer'} />
      {/* The welcome is for backers only, a paid deposit (owner 2026-10-26: "only on
          backers for now not on global plan users"). A Global plan never sets this
          status; a Pioneer spot earned by referrals keeps the plain card. */}
      {status === 'pioneer_active' ? (
        <>
          <h2 style={{ margin: '12px 0 0', ...TYPE.h2, color: RC.ink }}>{first ? `Welcome back, Pioneer ${first}!` : 'Welcome back, Pioneer!'}</h2>
          <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>You're a Ringo Pioneer and already ahead of the line. Thank you for backing Ringo. Your status is on your account for good.</p>
        </>
      ) : (
        <>
          <h2 style={{ margin: '12px 0 0', ...TYPE.h2, color: RC.ink }}>You're a Ringo Pioneer</h2>
          <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>Your Pioneer status is on your account for good.</p>
        </>
      )}
    </Card>
  );
}

function ShareCard({ l, code }: { l: Layout; code: string | null | undefined }) {
  const link = referralLink(code);
  const [note, setNote] = useState<string | null>(null);
  if (!link) return null;
  const share = async () => {
    hapticSelection();
    setNote(null);
    const data = { title: 'Ringo', text: 'Join me on the Ringo waitlist: your own number, in every country.', url: link };
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); return; } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    try { await navigator.clipboard.writeText(link); setNote('Link copied'); } catch { setNote('Copy the link above to share it.'); }
  };
  return (
    <Card l={l} label="Share your link">
      <h2 style={{ margin: 0, ...TYPE.h2, color: RC.ink }}>Move up the line</h2>
      <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>Every friend who joins moves you up {PLACES_PER_REFERRAL} places.</p>
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: RADIUS.control, background: RC.cream, border: `1px solid ${RC.line}`, ...TYPE.small, fontWeight: 600, color: RC.ink, overflowWrap: 'anywhere', userSelect: 'text', WebkitUserSelect: 'text' }}>
        {link.replace(/^https:\/\//, '')}
      </div>
      <div style={{ marginTop: 12 }}><RingoButton variant="secondary" onClick={() => void share()}>Share your link</RingoButton></div>
      {note && <div role="status" style={{ marginTop: 8, ...TYPE.small, color: RC.ink2 }}>{note}</div>}
    </Card>
  );
}

function Chip({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="press"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: TAP, padding: '10px 16px', boxSizing: 'border-box', borderRadius: RADIUS.control, cursor: disabled ? 'default' : 'pointer',
        border: `1.5px solid ${selected ? RC.ink : RC.lineStrong}`, background: selected ? RC.ink : RC.paper,
        color: selected ? RC.paper : disabled ? RC.inkMute : RC.ink, textAlign: 'left',
        fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, lineHeight: 1.3, letterSpacing: 0,
        display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%',
        transition: 'background .15s ease, color .15s ease, border-color .15s ease',
      }}
    >
      {selected && (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
          <path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span style={{ minWidth: 0 }}>{children}</span>
    </button>
  );
}

function Question({ n, title, help, answered, children }: { n: number; title: string; help?: string; answered: boolean; children: ReactNode }) {
  return (
    <div style={{ padding: '18px 0', borderTop: n === 1 ? 'none' : `1px solid ${RC.line}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <h3 style={{ flex: 1, margin: 0, ...TYPE.h3, color: RC.ink }}>{title}</h3>
        {answered && (
          <span role="img" aria-label="Answered" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: RC.successSoft, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8.5l3.2 3L13 4.5" stroke={RC.success} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </div>
      {help && <p style={{ margin: '4px 0 0', ...TYPE.small, color: RC.ink2 }}>{help}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder, onFocus, onBlur, autoFocus, label }: { value: string; onChange: (v: string) => void; placeholder: string; onFocus?: () => void; onBlur?: () => void; autoFocus?: boolean; label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => { setFocused(true); onFocus?.(); }}
      onBlur={() => { setFocused(false); onBlur?.(); }}
      placeholder={placeholder}
      aria-label={label}
      autoFocus={autoFocus}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      className="ringo-input"
      style={{
        width: '100%', height: 50, padding: '0 14px', boxSizing: 'border-box', borderRadius: RADIUS.control, background: RC.paper,
        border: `1.5px solid ${focused ? RC.inkStrong : RC.lineStrong}`, boxShadow: focused ? `0 0 0 3px ${hexA('#FF5724', 0.14)}` : 'none',
        outline: 'none', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 500, color: RC.ink,
      }}
    />
  );
}

/** The scrolling list of countries under a search field. Taps never blur the field first. */
function CountryList({ items, onPick, selected }: { items: Country[]; onPick: (c: Country) => void; selected?: string }) {
  if (!items.length) return <div style={{ marginTop: 8, padding: '12px 4px', ...TYPE.small, color: RC.ink2 }}>No country matches that.</div>;
  return (
    <div
      role="listbox"
      onPointerDown={(e) => e.preventDefault()}
      style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto', borderRadius: RADIUS.control, border: `1.5px solid ${RC.line}`, background: RC.paper, WebkitOverflowScrolling: 'touch' }}
    >
      {items.map((c, i) => (
        <button
          key={c.iso}
          type="button"
          role="option"
          aria-selected={selected === c.iso}
          onClick={() => onPick(c)}
          style={{
            width: '100%', minHeight: TAP + 4, padding: '10px 14px', boxSizing: 'border-box', border: 'none', cursor: 'pointer',
            borderBottom: i === items.length - 1 ? 'none' : `1px solid ${RC.line}`, background: selected === c.iso ? RC.cream : 'transparent',
            display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          }}
        >
          <span aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>{c.flag}</span>
          <span style={{ flex: 1, minWidth: 0, ...TYPE.body, fontSize: 16, color: RC.ink }}>{c.name}</span>
          <span style={{ ...TYPE.small, color: RC.ink2, fontVariantNumeric: 'tabular-nums' }}>{c.dial}</span>
        </button>
      ))}
    </div>
  );
}

function CountrySingle({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const picked = countryByIso(value);
  const items = useMemo(() => (open ? searchCountries(q) : []), [open, q]);
  return (
    <div>
      <button
        type="button"
        className="press"
        aria-expanded={open}
        onClick={() => { hapticSelection(); setOpen((o) => !o); setQ(''); }}
        style={{
          width: '100%', minHeight: 54, padding: '10px 14px', boxSizing: 'border-box', borderRadius: RADIUS.control, cursor: 'pointer',
          border: `1.5px solid ${open ? RC.inkStrong : RC.lineStrong}`, background: RC.paper, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        {picked ? (
          <>
            <span aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>{picked.flag}</span>
            <span style={{ flex: 1, minWidth: 0, ...TYPE.body, fontWeight: 600, color: RC.ink }}>{picked.name}</span>
            <span style={{ ...TYPE.small, color: RC.ink2 }}>{picked.dial}</span>
          </>
        ) : (
          <span style={{ flex: 1, ...TYPE.body, color: RC.inkMute }}>Select your country</span>
        )}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
          <path d="M3.5 6l4.5 4.5L12.5 6" stroke={RC.inkDeco} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <SearchField value={q} onChange={setQ} placeholder="Search countries or dial codes" label="Search countries" />
          <CountryList items={items} selected={value} onPick={(c) => { hapticSelection(); onChange(c.iso); setOpen(false); setQ(''); }} />
        </div>
      )}
    </div>
  );
}

function CountryMulti({ value, onChange, exclude, placeholder, browse, label }: { value: string[]; onChange: (next: string[]) => void; exclude: string; placeholder: string; browse: boolean; label: string }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const skip = useMemo(() => [...value, ...(exclude ? [exclude] : [])], [value, exclude]);
  const show = focused && (q.trim() !== '' || browse);
  const items = useMemo(() => (show ? searchCountries(q, skip) : []), [show, q, skip]);
  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {value.map((iso) => {
            const c = countryByIso(iso);
            return (
              <button
                key={iso}
                type="button"
                className="press"
                aria-label={`Remove ${c?.name || iso}`}
                onClick={() => { hapticSelection(); onChange(value.filter((x) => x !== iso)); }}
                style={{
                  minHeight: TAP, padding: '8px 12px 8px 14px', boxSizing: 'border-box', borderRadius: RADIUS.control, cursor: 'pointer',
                  border: `1.5px solid ${RC.ink}`, background: RC.ink, color: RC.paper, display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600,
                }}
              >
                <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{c?.flag}</span>
                {c?.name || iso}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ marginLeft: 2 }}>
                  <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
      <SearchField value={q} onChange={setQ} placeholder={placeholder} label={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      {show && (
        <CountryList
          items={items}
          onPick={(c) => { hapticSelection(); onChange([...value, c.iso]); setQ(''); }}
        />
      )}
    </div>
  );
}

// ── The survey ──────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function Survey({ l, user, userId, t, onAnswered }: { l: Layout; user: WaitlistUser; userId: string; t: string; onAnswered: (n: number) => void }) {
  // Filled from the saved row, so every save re-sends what is already stored.
  const init = useMemo(() => {
    const main = isoOrEmpty(user.phone_country);
    return {
      main,
      name: user.name || '',
      extra: isoArray(user.extra_phone_countries).filter((x) => x !== main),
      noSecond: user.no_second_number === true,
      travel: isoArray(user.travel_countries),
      regions: split(user.travel_regions, TRAVEL_REGIONS),
      values: split(user.top_values, TOP_VALUES),
    };
  // The form is keyed on the user id by its parent; it fills once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [phone, setPhone] = useState(init.main);
  const [name, setName] = useState(init.name);
  const [extra, setExtra] = useState<string[]>(init.extra);
  const [noSecond, setNoSecond] = useState(init.noSecond);
  const [travel, setTravel] = useState<string[]>(init.travel);
  const [regions, setRegions] = useState<string[]>(init.regions.picked);
  const [values, setValues] = useState<string[]>(init.values.picked);
  // Answers the app does not show as options (an older option, free text
  // typed on the website): kept and sent back unchanged.
  const regionsOther = init.regions.other;
  const valuesOther = init.values.other;

  const answered = {
    phone: !!phone,
    values: values.length + valuesOther.length > 0,
    extra: extra.length > 0 || noSecond,
    regions: regions.length + regionsOther.length > 0,
    travel: travel.length > 0,
    name: !!name.trim(),
  };
  const count = Object.values(answered).filter(Boolean).length;
  useEffect(() => { onAnswered(count); }, [count, onAnswered]);

  // ── Autosave: picks at once, typing after a 1.2 s pause; one request in
  // flight at a time, and only the newest waiting payload is kept.
  const [save, setSave] = useState<SaveState>('idle');
  const sendRef = useRef<{ sending: boolean; next: ProfileAnswers | null; last: ProfileAnswers | null }>({ sending: false, next: null, last: null });
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const queue = useCallback((payload: ProfileAnswers) => {
    const s = sendRef.current;
    s.next = payload;
    if (s.sending) return;
    s.sending = true;
    setSave('saving');
    void (async () => {
      let failed = false;
      while (s.next) {
        const body = s.next;
        s.next = null;
        s.last = body;
        try {
          const r = await light.saveProfile({ user_id: userId, t, ...body });
          failed = !r || r.ok === false;
        } catch {
          failed = true;
        }
      }
      s.sending = false;
      if (alive.current) setSave(failed ? 'error' : 'saved');
      if (failed) hapticNotify('error');
    })();
  }, [userId, t]);
  const retry = () => { const last = sendRef.current.last; if (last) queue(last); };

  const auto = useRef<{ first: boolean; sig: string; picks: string }>({ first: true, sig: '', picks: '' });
  const current = useMemo<ProfileAnswers>(() => ({
    name: name || null,
    phone_country: phone || null,
    extra_phone_countries: extra,
    no_second_number: noSecond,
    travel_countries: travel,
    travel_regions: [...regions, ...regionsOther],
    top_values: [...values, ...valuesOther],
  }), [name, phone, extra, noSecond, travel, regions, values, regionsOther, valuesOther]);
  // The Save button: everything on the form, now, without waiting for the
  // typing pause. Autosave keeps running; this is the tap people look for.
  const [tapped, setTapped] = useState(false);
  const saveNow = () => {
    hapticSelection();
    setTapped(true);
    auto.current = { ...auto.current, first: false, sig: JSON.stringify(current) };
    queue(current);
  };
  useEffect(() => {
    if (tapped && save === 'saved') { hapticNotify('success'); setTapped(false); }
    if (tapped && save === 'error') setTapped(false);
  }, [tapped, save]);
  useEffect(() => {
    const payload = current;
    const sig = JSON.stringify(payload);
    const picks = JSON.stringify([phone, extra, noSecond, travel, regions, values]);
    if (auto.current.first) { auto.current = { first: false, sig, picks }; return; }
    if (sig === auto.current.sig) return;
    const delay = picks === auto.current.picks ? AUTOSAVE_TEXT_MS : 0;
    const timer = window.setTimeout(() => {
      auto.current = { first: false, sig, picks };
      queue(payload);
    }, delay);
    pendingSave.current = { sig, payload };
    return () => window.clearTimeout(timer);
  }, [current, phone, extra, noSecond, travel, regions, values, queue]);
  // Leaving inside the typing pause still saves what was typed.
  const pendingSave = useRef<{ sig: string; payload: ProfileAnswers } | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  useEffect(() => () => {
    const p = pendingSave.current;
    if (p && p.sig !== auto.current.sig) queueRef.current(p.payload);
  }, []);

  const toggle = (list: string[], item: string, max?: number) => {
    if (list.includes(item)) return list.filter((x) => x !== item);
    if (max != null && list.length >= max) return list;
    return [...list, item];
  };
  const pickMain = (iso: string) => {
    setPhone(iso);
    setExtra((cur) => (cur.includes(iso) ? cur.filter((x) => x !== iso) : cur));
  };

  const done = count >= PROFILE_QUESTIONS;
  const pct = Math.round((count / PROFILE_QUESTIONS) * 100);
  const valuesFull = values.length >= MAX_VALUES;

  return (
    <section aria-label="Help us build it around you">
      <div style={{ ...cardSurface(), padding: `${l.cardPad + 2}px ${l.cardPad}px ${l.cardPad - 6}px` }}>
        <h2 style={{ margin: 0, ...typeFor('h1', l.size), color: RC.ink }}>Help us build it around you</h2>
        <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>Each answer moves you up {PLACES_PER_ANSWER} places.</p>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <span style={{ ...TYPE.bodyStrong, fontSize: 16, color: done ? RC.success : RC.ink }}>{done ? 'Profile complete' : `${count} of ${PROFILE_QUESTIONS} answered`}</span>
            <span aria-live="polite" style={{ ...TYPE.caption, color: save === 'error' ? RC.error : RC.inkMute }}>
              {save === 'saving' ? 'Saving' : save === 'saved' ? 'Saved' : ''}
            </span>
          </div>
          <div role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            style={{ height: 8, borderRadius: RADIUS.pill, background: RC.cream, border: `1px solid ${RC.line}`, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: RADIUS.pill, background: SITE_GRAD, transition: 'width .5s ease' }} />
          </div>
          {save === 'error' && (
            <div role="alert" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...TYPE.small, color: RC.error }}>
              <span>Could not save, try again.</span>
              <button type="button" className="press" onClick={retry}
                style={{ minHeight: TAP, padding: '0 14px', borderRadius: RADIUS.control, border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, color: RC.ink, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Try again
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 6 }}>
          <Question n={1} title="Main country phone plan" help="The country your main number is from." answered={answered.phone}>
            <CountrySingle value={phone} onChange={pickMain} />
          </Question>

          <Question n={2} title="What matters most in a phone plan?" help="Pick up to 3." answered={answered.values}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TOP_VALUES.map((v) => {
                const on = values.includes(v);
                return <Chip key={v} selected={on} disabled={!on && valuesFull} onClick={() => { hapticSelection(); setValues((cur) => toggle(cur, v, MAX_VALUES)); }}>{v}</Chip>;
              })}
            </div>
          </Question>

          <Question n={3} title="Which other countries do you have a number in?" help="Any second line or local number you hold, or say it's just the one." answered={answered.extra}>
            <CountryMulti
              value={extra}
              exclude={phone}
              browse
              label="Other countries you have a number in"
              placeholder="Search and add countries"
              onChange={(next) => { setExtra(next); if (next.length) setNoSecond(false); }}
            />
            <button
              type="button"
              className="press"
              role="checkbox"
              aria-checked={noSecond}
              onClick={() => { hapticSelection(); setNoSecond((on) => { const next = !on; if (next) setExtra([]); return next; }); }}
              style={{ marginTop: 10, width: '100%', minHeight: TAP + 4, padding: '10px 4px', boxSizing: 'border-box', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
            >
              <span aria-hidden style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 7, border: `2px solid ${noSecond ? RC.ink : RC.lineStrong}`, background: noSecond ? RC.ink : RC.paper, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {noSecond && <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3L13 4.5" stroke={RC.paper} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
              <span style={{ ...TYPE.body, fontSize: 16, color: RC.ink }}>I only have my main number</span>
            </button>
          </Question>

          <Question n={4} title="Which regions do you travel most?" help="Select any." answered={answered.regions}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TRAVEL_REGIONS.map((r) => (
                <Chip key={r} selected={regions.includes(r)} onClick={() => { hapticSelection(); setRegions((cur) => toggle(cur, r)); }}>{r}</Chip>
              ))}
            </div>
          </Question>

          <Question n={5} title="Which countries do you travel to most?" help="Places abroad you keep going back to." answered={answered.travel}>
            <CountryMulti
              value={travel}
              exclude={phone}
              browse={false}
              label="Countries you travel to most"
              placeholder="Type a country to add it"
              onChange={setTravel}
            />
          </Question>

          <Question n={6} title="Name" answered={answered.name}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              aria-label="Name"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="done"
              className="ringo-input"
              style={{ width: '100%', height: 54, padding: '0 16px', boxSizing: 'border-box', borderRadius: RADIUS.control, background: RC.paper, border: `1.5px solid ${RC.lineStrong}`, outline: 'none', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 500, color: RC.ink }}
            />
          </Question>
        </div>
        <div style={{ padding: '6px 0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <RingoButton loading={save === 'saving' && tapped} onClick={saveNow}>Save answers</RingoButton>
          <div aria-live="polite" style={{ minHeight: 18, textAlign: 'center', ...TYPE.caption, color: save === 'error' ? RC.error : RC.inkMute }}>
            {save === 'saved' ? 'Your answers are saved' : save === 'error' ? 'Could not save, try again.' : ''}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── The screen ──────────────────────────────────────────────────────────────

export function WaitlistScreen({ onBack, onLogin, onBrowse }: { onBack: () => void; onLogin: () => void; onBrowse: () => void }) {
  const l = useLayout();
  const acct = useAccount();
  const userId = acct?.userId, t = acct?.t;
  const [data, setData] = useState<WaitlistDashboard | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setData(null);
    setLoadErr(null);
    setLive(null);
  }, [userId]);
  useEffect(() => {
    if (!userId || !t) return;
    let on = true;
    light.dashboard(userId, t)
      .then((d) => { if (on) { setData(d); setLoadErr(null); } })
      .catch((e) => { if (on) setLoadErr((e as Error).message || 'Could not load your place in line.'); });
    return () => { on = false; };
  }, [userId, t, nonce]);

  const onAnswered = useCallback((n: number) => setLive(n), []);

  const join = async () => {
    if (!userId || !t || joining) return;
    setJoining(true);
    setJoinErr(null);
    try {
      const r = await light.joinWaitlist(userId, acct?.email || data?.user.email || '', t);
      if (!r || r.ok === false) throw new Error('not ok');
      hapticNotify('success');
      setNonce((n) => n + 1);
    } catch {
      hapticNotify('error');
      setJoinErr('Could not join just now. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const user = data?.user ?? null;
  const status = user?.status ?? null;
  const lead = !!user && isLead(status);
  const pioneer = !!user && isPioneer(status);
  const saved = typeof user?.profile_answers === 'number' ? user.profile_answers : 0;
  const answers = live ?? saved;

  let left: ReactNode = null;
  let right: ReactNode = null;
  if (!acct) {
    left = (
      <>
        <Hero l={l} signedOut>
          <RingoButton variant="onDark" onClick={onLogin}>Sign in</RingoButton>
        </Hero>
        <Promise l={l} />
      </>
    );
  } else if (!data) {
    left = (
      <>
        <Hero l={l} />
        {loadErr ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ErrorBox>{loadErr}</ErrorBox>
            <RingoButton variant="secondary" capped onClick={() => setNonce((n) => n + 1)}>Try again</RingoButton>
          </div>
        ) : (
          <div aria-hidden style={{ minHeight: 160, borderRadius: RADIUS.card, background: RC.cream }} />
        )}
      </>
    );
  } else if (lead) {
    left = (
      <>
        <Hero l={l}>
          <RingoButton variant="onDark" loading={joining} onClick={() => void join()}>Join the waitlist</RingoButton>
          {joinErr && <ErrorBox>{joinErr}</ErrorBox>}
        </Hero>
        <Promise l={l} />
      </>
    );
  } else if (user) {
    left = (
      <>
        <Hero l={l} />
        {pioneer ? <PioneerCard l={l} user={user} status={String(status)} /> : <PlaceCard l={l} user={user} liveAnswers={answers} />}
        <ShareCard l={l} code={user.referral_code} />
      </>
    );
    right = userId && t ? <Survey key={userId} l={l} user={user} userId={userId} t={t} onAnswered={onAnswered} /> : null;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Ringo waitlist" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ ...contentColumn(l), paddingTop: 4, paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ ...twoColumn(l, 1, 1.15), gap: l.isWide ? 24 : l.cardGap + 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap + 4, minWidth: 0 }}>{left}</div>
            {right && <div style={{ minWidth: 0 }}>{right}</div>}
          </div>
          <div style={{ marginTop: l.sectionGap }}>
            <RingoButton variant="soft" capped onClick={onBrowse}>Shop Ringo Light eSIMs</RingoButton>
          </div>
        </div>
      </div>
    </div>
  );
}
