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
import { RC, TYPE, RADIUS, TAP, typeFor, cardSurface, SITE_GRAD, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW, hexA } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, ErrorBox, PioneerBadge } from '../components/ui';
import { light, type ProfileAnswers, type WaitlistDashboard, type WaitlistUser } from '../api/light';
import { useAccount } from '../store/account';
import { useLayout, contentColumn, twoColumn, type Layout } from '../lib/layout';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { countryByIso, isoArray, isoOrEmpty, searchCountries, type Country } from '../lib/countries';
import { PROFILE_QUESTIONS, PLACES_PER_REFERRAL, fmt, isLead, isPioneer, placeFrom, referralLink } from '../lib/waitlist';

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

const HERO = `${import.meta.env.BASE_URL}img/destinations/global.jpg`;

/** Saved answers split into the options shown and anything else (kept and re-sent unchanged). */
function split(saved: unknown, known: string[]): { picked: string[]; other: string[] } {
  const arr = Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  return { picked: known.filter((k) => arr.includes(k)), other: arr.filter((x) => !known.includes(x)) };
}

// ── Small pieces ────────────────────────────────────────────────────────────

function Hero({ l, children }: { l: Layout; children?: ReactNode }) {
  const [broken, setBroken] = useState(false);
  return (
    <section style={{ ...cardSurface(), overflow: 'hidden' }}>
      <div style={{ position: 'relative', aspectRatio: l.isWide ? '16 / 9' : '4 / 3', background: SITE_GRAD }}>
        {!broken && (
          <img src={HERO} alt="" loading="eager" decoding="async" onError={() => setBroken(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
        <h2 style={{ position: 'absolute', left: l.cardPad, right: l.cardPad, bottom: 16, margin: 0, color: '#fff', textShadow: PHOTO_TEXT_SHADOW, ...typeFor('hero', l.isWide ? 'phone' : l.size) }}>
          Ringo: your number, every country
        </h2>
      </div>
      <div style={{ padding: l.cardPad, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, ...TYPE.body, color: RC.ink }}>
          Port your own number onto one plan that works in every country. We are building it now, and the waitlist is free.
        </p>
        <p style={{ margin: 0, ...TYPE.small, color: RC.ink2 }}>
          Ringo Light, the data eSIMs you buy in this app, is what funds it.
        </p>
        {children}
      </div>
    </section>
  );
}

function Card({ l, children, style = {}, label }: { l: Layout; children: ReactNode; style?: CSSProperties; label?: string }) {
  return <section aria-label={label} style={{ ...cardSurface(), padding: l.cardPad, ...style }}>{children}</section>;
}

function PlaceCard({ l, user, liveAnswers }: { l: Layout; user: WaitlistUser; liveAnswers: number }) {
  const { ahead, behind } = placeFrom(user, liveAnswers);
  return (
    <Card l={l} label="Your place in line">
      <h2 style={{ margin: 0, ...TYPE.h2, color: RC.ink }}>You're on the waitlist</h2>
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

function PioneerCard({ l, status }: { l: Layout; status: string }) {
  return (
    <Card l={l} label="Your Pioneer status">
      <PioneerBadge tone="gold" label={status === 'promoter_pioneer' ? 'Ringo Pioneer, promoter' : 'Ringo Pioneer'} />
      <h2 style={{ margin: '12px 0 0', ...TYPE.h2, color: RC.ink }}>You're a Ringo Pioneer</h2>
      <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>Thank you for backing Ringo. Your status is on your account for good.</p>
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
  useEffect(() => {
    const payload: ProfileAnswers = {
      name: name || null,
      phone_country: phone || null,
      extra_phone_countries: extra,
      no_second_number: noSecond,
      travel_countries: travel,
      travel_regions: [...regions, ...regionsOther],
      top_values: [...values, ...valuesOther],
    };
    const sig = JSON.stringify(payload);
    const picks = JSON.stringify([phone, extra, noSecond, travel, regions, values]);
    if (auto.current.first) { auto.current = { first: false, sig, picks }; return; }
    if (sig === auto.current.sig) return;
    const delay = picks === auto.current.picks ? AUTOSAVE_TEXT_MS : 0;
    const timer = window.setTimeout(() => {
      auto.current = { first: false, sig, picks };
      queue(payload);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [name, phone, extra, noSecond, travel, regions, values, regionsOther, valuesOther, queue]);

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
        <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>Each answer moves you up {PLACES_PER_REFERRAL} places.</p>
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
      <Hero l={l}>
        <p style={{ margin: '4px 0 0', ...TYPE.small, color: RC.ink2 }}>Sign in to join the waitlist and see your place in line.</p>
        <div style={{ marginTop: 6 }}><RingoButton capped onClick={onLogin}>Sign in</RingoButton></div>
      </Hero>
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
      <Hero l={l}>
        <div style={{ marginTop: 6 }}><RingoButton capped loading={joining} onClick={() => void join()}>Join the waitlist</RingoButton></div>
        {joinErr && <ErrorBox>{joinErr}</ErrorBox>}
      </Hero>
    );
  } else if (user) {
    left = (
      <>
        <Hero l={l} />
        {pioneer ? <PioneerCard l={l} status={String(status)} /> : <PlaceCard l={l} user={user} liveAnswers={answers} />}
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
