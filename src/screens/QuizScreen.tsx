// QuizScreen: "How much data do I need?" (owner 2026-10-27), made to play.
// Four steps: where the trip goes (owner 2026-11-10: "it should ask where
// you go in easy steps", it used to ask the kind of trip and leave the place
// to the store afterwards), a trip length slider, tiles for what the trip
// needs with a live data meter that fills as they are picked, and work online
// or not; then a reveal with confetti and one plan for that place with its
// price (owner 2026-10-27: "the quiz should recommend a single plan", no
// coins; 2026-11-10: "it should list a plan immediately"). The plan rides to
// the plan screen (quizPick in lib/quiz.ts), which opens with that line picked.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { RC, TYPE, RADIUS, SITE_GRAD, cardSurface } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { Confetti } from '../components/Confetti';
import { hapticSelection, hapticNotify } from '../lib/haptics';
import { useLayout, contentColumn } from '../lib/layout';
import { recommend, lineFor, pickFor, setQuizPick, perDayOf, newQuizId, sendQuizAnswer, sendQuizPicked, USES, type Use } from '../lib/quiz';
import { planName } from '../lib/terms';
import { SearchField, Picture, matches } from './StoreScreen';
import { FEATURED } from '../data/destinations';
import europeOrbit from '../assets/quiz/europe-orbit.jpg'; // ISS photo iss066e116300, NASA, public domain
import { useDestinations } from '../store/destinations';
import { useAccount } from '../store/account';
import { light, money, type Catalog } from '../api/light';
import { t as tr, plural, fmtNumber, placeName } from '../lib/i18n';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICON: Record<Use, ReactNode> = {
  maps: <><path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z" {...S} /><circle cx="12" cy="10.5" r="2.2" {...S} /></>,
  social: <><rect x="4" y="4" width="16" height="16" rx="4.5" {...S} /><circle cx="12" cy="12" r="3.6" {...S} /><circle cx="16.8" cy="7.2" r=".9" fill="currentColor" /></>,
  calls: <><rect x="3" y="7" width="12" height="10" rx="2.5" {...S} /><path d="M15 10.5l6-3.5v10l-6-3.5" {...S} /></>,
  streaming: <><rect x="3" y="5" width="18" height="12" rx="2.5" {...S} /><path d="M10 8.5v5l4.5-2.5z" fill="currentColor" stroke="none" /><path d="M8 20h8" {...S} /></>,
  hotspot: <><path d="M5 9.5a10 10 0 0 1 14 0M8 12.5a5.6 5.6 0 0 1 8 0" {...S} /><circle cx="12" cy="16" r="1.6" fill="currentColor" /></>,
};
// More colour (owner 2026-10-27: "a bit more colourful, add pictures or
// items"): each place is a photo, each use its own hue.
// The regions (owner 2026-10-27): Europe from space, the others their
// landmark photos (Angkor Wat, Machu Picchu, Petra).
const REGION_PHOTO: Record<string, string> = { europe: europeOrbit };
const USE_HUE: Record<Use, string> = { maps: '#1FA971', social: '#E4407B', calls: '#2F7BF6', streaming: '#8B5CF6', hotspot: '#F08A24' };
// 1 month plus (owner 2026-10-27): any trip past 30 days, kept as 60.
const LONG = 60;
const QUICK_DAYS = [3, 7, 14, 30, LONG];

function DataMeter({ gbDay }: { gbDay: number }) {
  const pct = Math.min(100, (gbDay / 6) * 100);
  const label = gbDay < 0.6 ? tr('Light') : gbDay < 1.5 ? tr('Moderate') : gbDay < 4 ? tr('Heavy') : tr('Power user');
  return (
    <div aria-live="polite" style={{ ...cardSurface(), padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink2 }}>{tr('Your daily use')}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{tr('{gb} GB', { gb: fmtNumber(gbDay, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })}</span>
      </div>
      <div style={{ marginTop: 10, height: 12, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(pct, gbDay > 0 ? 6 : 0)}%`, height: '100%', borderRadius: RADIUS.pill, background: SITE_GRAD, transition: 'width .45s cubic-bezier(.3,.7,.4,1)' }} />
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink2 }}>{gbDay > 0 ? label : tr('Pick what you will use')}</div>
    </div>
  );
}

export function QuizScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const l = useLayout();
  const all = useDestinations();
  const [step, setStep] = useState(0);
  const [place, setPlace] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [days, setDays] = useState(7);
  const [uses, setUses] = useState<Use[]>([]);
  const [hop, setHop] = useState<Use | null>(null);
  const [work, setWork] = useState<boolean | null>(null);
  const done = step === 4 && work != null;
  const rec = useMemo(() => (done ? recommend({ days, uses, work: work! }) : null), [done, days, uses, work]);
  // Each finished quiz is one answer kept on the site (lib/quiz.ts sendQuizAnswer).
  const [quizId, setQuizId] = useState(newQuizId);
  useEffect(() => {
    if (!rec) return;
    sendQuizAnswer({ id: quizId, trip: null, days, uses, work: work!, gbDay: perDayOf(uses, work!), rec });
    if (place) sendQuizPicked(quizId, place);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per result
  }, [rec, quizId]);
  // Where to: the store's popular places until something is typed, then what
  // matches (the store's own search: names, cities, "usa"). Global is its own
  // monthly plan, so it is left out here.
  const query = q.trim().toLowerCase();
  const places = (query ? all.filter((d) => matches(d, query)) : FEATURED.map((id) => all.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => Boolean(d)))
    .filter((d) => d.id !== 'global').slice(0, 8);
  const dest = all.find((d) => d.id === place) ?? null;
  // The place's plans, asked for as soon as it is picked, so the result shows
  // the line and its price at once. A Power plan for a place with its own
  // Power Use card (Europe) is read from that card, as the plan screen does.
  const acct = useAccount();
  const memberKey = acct ? acct.userId : '';
  const [cat, setCat] = useState<Catalog | null>(null);
  const [powerCat, setPowerCat] = useState<Catalog | null>(null);
  useEffect(() => {
    setCat(null);
    if (!place) return;
    let alive = true;
    light.catalog(place, acct ? { userId: acct.userId, t: acct.t } : null).then((c) => { if (alive) setCat(c); }).catch(() => {});
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `acct` follows memberKey
  }, [place, memberKey]);
  const powerId = rec?.tab === 'power' ? cat?.power_destination : undefined;
  useEffect(() => {
    setPowerCat(null);
    if (!powerId) return;
    let alive = true;
    light.catalog(powerId, acct ? { userId: acct.userId, t: acct.t } : null).then((c) => { if (alive) setPowerCat(c); }).catch(() => {});
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `acct` follows memberKey
  }, [powerId, memberKey]);
  const shownCat = powerId ? powerCat : cat;
  const line = rec && shownCat ? lineFor(shownCat, rec) : null;
  const price = line ? money(line.billed_upfront_amount, line.currency) : null;

  const restart = () => { setQuizId(newQuizId()); setStep(0); setPlace(null); setQ(''); setDays(7); setUses([]); setWork(null); };
  const title = (t: string, sub?: string) => (<>
    <h2 className="rise" style={{ margin: '4px 0 0', ...TYPE.h1, color: RC.ink }}>{t}</h2>
    {sub && <p style={{ margin: '0 0 4px', ...TYPE.small, color: RC.ink2 }}>{sub}</p>}
  </>);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {done && <Confetti count={36} />}
      <RingoHeader title={tr('How much data?')} leading={<BackBtn onClick={step > 0 && !done ? () => setStep(step - 1) : onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${l.gutter}px 150px` }}>
        <div style={{ ...contentColumn(l), display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!done && (
            <div aria-label={tr('Step {n} of {total}', { n: step + 1, total: 4 })} style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: RADIUS.pill, background: i <= step ? SITE_GRAD : RC.line, transition: 'background .3s' }} />)}
            </div>
          )}

          {step === 0 && (<>
            {title(tr('Where are you going?'))}
            <SearchField value={q} onChange={setQ} />
            {/* The store's photo cards (owner 2026-11-10: "it needs to be with pictures and a clean UI"): the first popular place wide, the rest two across. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {places.map((d, i) => {
                const wide = !query && i === 0;
                return (
                  <button key={d.id} type="button" className="press" aria-pressed={place === d.id} aria-label={placeName(d.label, d.flag)}
                    onClick={() => { hapticNotify('success'); setPlace(d.id); window.setTimeout(() => setStep(1), 260); }}
                    style={{ gridColumn: wide ? '1 / -1' : undefined, display: 'block', padding: 0, border: 'none', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', textAlign: 'start', background: 'none', outline: place === d.id ? `3px solid ${RC.orangeInk}` : 'none', outlineOffset: 2 }}>
                    <Picture d={d} size={wide ? 'big' : 'tile'} eager={i < 3} photo={REGION_PHOTO[d.id]}
                      chip={wide && d.countries > 1 ? plural(d.countries, '{n} country', '{n} countries') : null} />
                  </button>
                );
              })}
            </div>
            {query && all.length > 0 && places.length === 0 && (
              <div style={{ ...TYPE.small, color: RC.ink2, textAlign: 'center' }}>{tr('Nothing matches “{q}”', { q: q.trim() })}</div>
            )}
          </>)}

          {step === 1 && (<>
            {title(tr('How long is your trip?'))}
            <div style={{ ...cardSurface(), padding: '22px 18px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800, lineHeight: 1, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{days > 30 ? `${fmtNumber(30)}+` : fmtNumber(days)}</div>
              <div style={{ marginTop: 4, ...TYPE.small, fontWeight: 700, color: RC.ink2 }}>{plural(days > 30 ? 31 : days, 'day', 'days')}</div>
              <input type="range" min={1} max={30} value={Math.min(days, 30)} aria-label={tr('Trip length in days')}
                onChange={(e) => { const v = Number(e.target.value); if (v !== days) hapticSelection(); setDays(v); }}
                style={{ width: '100%', marginTop: 18, accentColor: RC.orangeInk, height: 28 }} />
              <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {QUICK_DAYS.map((d) => (
                  <button key={d} type="button" className="press" onClick={() => { hapticSelection(); setDays(d); }}
                    style={{ padding: '8px 14px', borderRadius: RADIUS.pill, border: `1.5px solid ${days === d ? RC.orangeInk : RC.line}`, background: days === d ? '#FFF1E8' : '#fff', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink, cursor: 'pointer' }}>
                    {d === 7 ? tr('1 week') : d === 14 ? tr('2 weeks') : d === 30 ? tr('1 month') : d === LONG ? tr('1 month plus') : plural(d, '{n} day', '{n} days')}
                  </button>
                ))}
              </div>
            </div>
          </>)}

          {step === 2 && (<>
            {title(tr('What will you use it for?'), tr('Tap all that fit.'))}
            <DataMeter gbDay={perDayOf(uses, false)} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {USES.map((u) => {
                const on = uses.includes(u.id);
                return (
                  <button key={u.id} type="button" className="press" aria-pressed={on}
                    onClick={() => { hapticSelection(); setHop(u.id); setUses(on ? uses.filter((x) => x !== u.id) : [...uses, u.id]); }}
                    style={{ textAlign: 'start', cursor: 'pointer', padding: 14, borderRadius: 18, border: `2px solid ${on ? USE_HUE[u.id] : RC.line}`, background: on ? `${USE_HUE[u.id]}14` : '#fff', fontFamily: 'var(--font)' }}>
                    <span key={hop === u.id ? `h-${u.id}-${String(on)}` : u.id} className={hop === u.id ? 'hop' : undefined}
                      style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? USE_HUE[u.id] : `${USE_HUE[u.id]}1F`, color: on ? '#fff' : USE_HUE[u.id] }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>{ICON[u.id]}</svg>
                    </span>
                    <span style={{ display: 'block', marginTop: 10, fontSize: 16, fontWeight: 700, color: RC.ink }}>{tr(u.label)}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: RC.ink2 }}>{tr(u.sub)}</span>
                  </button>
                );
              })}
            </div>
          </>)}

          {step === 3 && (<>
            {title(tr('Will you work online?'), tr('Calls, uploads and a laptop add up.'))}
            <DataMeter gbDay={perDayOf(uses, work === true)} />
            {[{ v: true, label: tr('Yes, I will work'), sub: tr('Video meetings, files, a laptop') }, { v: false, label: tr('No, just the trip'), sub: tr('Holiday mode') }].map((o) => (
              <button key={String(o.v)} type="button" className="press" aria-pressed={work === o.v}
                onClick={() => { hapticNotify('success'); setWork(o.v); window.setTimeout(() => setStep(4), 260); }}
                style={{ width: '100%', textAlign: 'start', cursor: 'pointer', padding: '16px 18px', borderRadius: 18, border: `2px solid ${work === o.v ? RC.orangeInk : RC.line}`, background: work === o.v ? '#FFF1E8' : '#fff', fontFamily: 'var(--font)' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: RC.ink }}>{o.label}</div>
                <div style={{ marginTop: 2, fontSize: 14, color: RC.ink2 }}>{o.sub}</div>
              </button>
            ))}
          </>)}

          {rec && (<>
            <div className="rise" style={{ ...cardSurface(), padding: 0, overflow: 'hidden', textAlign: 'center' }}>
              {dest && <Picture d={dest} size="big" eager photo={REGION_PHOTO[dest.id]} />}
              <div style={{ padding: 22 }}>
              <div style={{ ...TYPE.small, fontWeight: 700, color: RC.orangeInk }}>{tr('Your plan')}</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, lineHeight: 1.1, color: RC.ink }}>{line ? planName(line) : rec.shown}</div>
              {price && <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.orangeInk, fontVariantNumeric: 'tabular-nums' }}>{price}</div>}
              {/* A place that sells no Unlimited shows its cheapest plan: the Unlimited promise is not made for it. */}
              {line?.tier !== 'data' && <p style={{ margin: '10px 0 0', ...TYPE.body, color: RC.ink2 }}>{rec.line}</p>}
              </div>
            </div>
            <button type="button" className="press" onClick={restart}
              style={{ alignSelf: 'center', border: 'none', background: 'none', padding: 8, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {tr('Take it again')}
            </button>
          </>)}
        </div>
      </div>
      {(step === 1 || step === 2 || rec) && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}` }}>
          {step === 1 && <RingoButton onClick={() => { hapticSelection(); setStep(2); }}>{tr('Next')}</RingoButton>}
          {step === 2 && <RingoButton onClick={() => { hapticSelection(); setStep(3); }} disabled={uses.length === 0}>{tr('Next')}</RingoButton>}
          {rec && place && <RingoButton onClick={() => { setQuizPick({ ...(line && !powerId ? pickFor(line) : rec), quizId }); onOpen(place); }}>{price ? tr('Continue, {price}', { price }) : tr('Continue')}</RingoButton>}
        </div>
      )}
    </div>
  );
}
