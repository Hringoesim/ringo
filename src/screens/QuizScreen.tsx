// QuizScreen: "How much data do I need?" (owner 2026-10-27), made to play.
// Four steps: the kind of trip (Backpacker, Beach holiday, Multi country),
// a trip length slider, tiles for what the trip needs with a live data meter
// that fills as they are picked, and work online or not; then a reveal with
// confetti and one plan (owner 2026-10-27: "the quiz should recommend a
// single plan", no coins). The plan rides to the plan screen (quizPick in
// lib/quiz.ts), which opens with that line picked; a multi country trip
// picks a region plan right on the result.
import { useState, type ReactNode } from 'react';
import { RC, TYPE, RADIUS, SITE_GRAD, cardSurface } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { Confetti } from '../components/Confetti';
import { hapticSelection, hapticNotify } from '../lib/haptics';
import { useLayout, contentColumn } from '../lib/layout';
import { recommend, setQuizPick, perDayOf, USES, TRIPS, type Use, type Trip } from '../lib/quiz';
import { FEATURED, bundledPictureFor, pictureFor, skyFor } from '../data/destinations';
import tent from '../assets/landmarks3d/tent.png';
import beach from '../assets/landmarks3d/beach.png';
import plane from '../assets/landmarks3d/plane.png';
import { useDestinations } from '../store/destinations';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICON: Record<Use, ReactNode> = {
  maps: <><path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z" {...S} /><circle cx="12" cy="10.5" r="2.2" {...S} /></>,
  social: <><rect x="4" y="4" width="16" height="16" rx="4.5" {...S} /><circle cx="12" cy="12" r="3.6" {...S} /><circle cx="16.8" cy="7.2" r=".9" fill="currentColor" /></>,
  calls: <><rect x="3" y="7" width="12" height="10" rx="2.5" {...S} /><path d="M15 10.5l6-3.5v10l-6-3.5" {...S} /></>,
  streaming: <><rect x="3" y="5" width="18" height="12" rx="2.5" {...S} /><path d="M10 8.5v5l4.5-2.5z" fill="currentColor" stroke="none" /><path d="M8 20h8" {...S} /></>,
  hotspot: <><path d="M5 9.5a10 10 0 0 1 14 0M8 12.5a5.6 5.6 0 0 1 8 0" {...S} /><circle cx="12" cy="16" r="1.6" fill="currentColor" /></>,
};
// More colour (owner 2026-10-27: "a bit more colourful, add pictures or
// items"): each trip type is a photo with a 3D item, each use its own hue.
const TRIP_LOOK: Record<Trip, { photo: string; item: string }> = {
  backpacker: { photo: bundledPictureFor('vietnam') ?? pictureFor('vietnam'), item: tent },
  beach: { photo: pictureFor('seychelles'), item: beach },
  multi: { photo: bundledPictureFor('europe') ?? pictureFor('europe'), item: plane },
};
const USE_HUE: Record<Use, string> = { maps: '#1FA971', social: '#E4407B', calls: '#2F7BF6', streaming: '#8B5CF6', hotspot: '#F08A24' };
const QUICK_DAYS = [3, 7, 14, 30];

function DataMeter({ gbDay }: { gbDay: number }) {
  const pct = Math.min(100, (gbDay / 6) * 100);
  const label = gbDay < 0.6 ? 'Light' : gbDay < 1.5 ? 'Moderate' : gbDay < 4 ? 'Heavy' : 'Power user';
  return (
    <div aria-live="polite" style={{ ...cardSurface(), padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink2 }}>Your daily use</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{`${gbDay.toFixed(1)} GB`}</span>
      </div>
      <div style={{ marginTop: 10, height: 12, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(pct, gbDay > 0 ? 6 : 0)}%`, height: '100%', borderRadius: RADIUS.pill, background: SITE_GRAD, transition: 'width .45s cubic-bezier(.3,.7,.4,1)' }} />
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink2 }}>{gbDay > 0 ? label : 'Pick what you will use'}</div>
    </div>
  );
}

export function QuizScreen({ onBack, onBrowse, onOpen }: { onBack: () => void; onBrowse: () => void; onOpen: (id: string) => void }) {
  const l = useLayout();
  const all = useDestinations();
  const [step, setStep] = useState(0);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState(7);
  const [uses, setUses] = useState<Use[]>([]);
  const [hop, setHop] = useState<Use | null>(null);
  const [work, setWork] = useState<boolean | null>(null);
  const done = step === 4 && work != null;
  const rec = done ? recommend({ days, uses, work: work! }) : null;
  // A multi country trip picks a region plan (owner 2026-10-27), the store's
  // order; Global is its own monthly plan, so it is left out here.
  const regions = FEATURED.map((id) => all.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => Boolean(d) && d!.kind === 'region' && d!.countries > 1 && d!.id !== 'global');

  const restart = () => { setStep(0); setTrip(null); setDays(7); setUses([]); setWork(null); };
  const title = (t: string, sub?: string) => (<>
    <h2 className="rise" style={{ margin: '4px 0 0', ...TYPE.h1, color: RC.ink }}>{t}</h2>
    {sub && <p style={{ margin: '0 0 4px', ...TYPE.small, color: RC.ink2 }}>{sub}</p>}
  </>);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {done && <Confetti count={36} />}
      <RingoHeader title="How much data?" leading={<BackBtn onClick={step > 0 && !done ? () => setStep(step - 1) : onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${l.gutter}px 150px` }}>
        <div style={{ ...contentColumn(l), display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!done && (
            <div aria-label={`Step ${step + 1} of 4`} style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: RADIUS.pill, background: i <= step ? SITE_GRAD : RC.line, transition: 'background .3s' }} />)}
            </div>
          )}

          {step === 0 && (<>
            {title('What kind of trip?')}
            {TRIPS.map((t) => {
              const on = trip === t.id;
              return (
                <button key={t.id} type="button" className="press" aria-pressed={on}
                  onClick={() => { hapticNotify('success'); setTrip(t.id); setDays(t.days); setUses(t.uses); window.setTimeout(() => setStep(1), 260); }}
                  style={{ position: 'relative', width: '100%', minHeight: 112, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', gap: 12, textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: 20, border: `3px solid ${on ? RC.orangeInk : 'transparent'}`, background: skyFor(t.id), fontFamily: 'var(--font)' }}>
                  <img src={TRIP_LOOK[t.id].photo} alt="" aria-hidden decoding="async" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,40,0.05) 20%, rgba(20,10,40,0.72) 100%)' }} />
                  <span style={{ position: 'relative', flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 19, fontWeight: 800, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}>{t.label}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: 'rgba(255,255,255,0.92)' }}>{t.sub}</span>
                  </span>
                  <img className={on ? 'hop' : undefined} src={TRIP_LOOK[t.id].item} alt="" aria-hidden style={{ position: 'relative', width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))' }} />
                </button>
              );
            })}
          </>)}

          {step === 1 && (<>
            {title('How long is your trip?')}
            <div style={{ ...cardSurface(), padding: '22px 18px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800, lineHeight: 1, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{days}</div>
              <div style={{ marginTop: 4, ...TYPE.small, fontWeight: 700, color: RC.ink2 }}>{days === 1 ? 'day' : 'days'}</div>
              <input type="range" min={1} max={30} value={days} aria-label="Trip length in days"
                onChange={(e) => { const v = Number(e.target.value); if (v !== days) hapticSelection(); setDays(v); }}
                style={{ width: '100%', marginTop: 18, accentColor: RC.orangeInk, height: 28 }} />
              <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {QUICK_DAYS.map((d) => (
                  <button key={d} type="button" className="press" onClick={() => { hapticSelection(); setDays(d); }}
                    style={{ padding: '8px 14px', borderRadius: RADIUS.pill, border: `1.5px solid ${days === d ? RC.orangeInk : RC.line}`, background: days === d ? '#FFF1E8' : '#fff', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink, cursor: 'pointer' }}>
                    {d === 7 ? '1 week' : d === 14 ? '2 weeks' : d === 30 ? '1 month' : `${d} days`}
                  </button>
                ))}
              </div>
            </div>
          </>)}

          {step === 2 && (<>
            {title('What will you use it for?', 'Tap all that fit.')}
            <DataMeter gbDay={perDayOf(uses, false)} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {USES.map((u) => {
                const on = uses.includes(u.id);
                return (
                  <button key={u.id} type="button" className="press" aria-pressed={on}
                    onClick={() => { hapticSelection(); setHop(u.id); setUses(on ? uses.filter((x) => x !== u.id) : [...uses, u.id]); }}
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 18, border: `2px solid ${on ? USE_HUE[u.id] : RC.line}`, background: on ? `${USE_HUE[u.id]}14` : '#fff', fontFamily: 'var(--font)' }}>
                    <span key={hop === u.id ? `h-${u.id}-${String(on)}` : u.id} className={hop === u.id ? 'hop' : undefined}
                      style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? USE_HUE[u.id] : `${USE_HUE[u.id]}1F`, color: on ? '#fff' : USE_HUE[u.id] }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>{ICON[u.id]}</svg>
                    </span>
                    <span style={{ display: 'block', marginTop: 10, fontSize: 16, fontWeight: 700, color: RC.ink }}>{u.label}</span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 13, color: RC.ink2 }}>{u.sub}</span>
                  </button>
                );
              })}
            </div>
          </>)}

          {step === 3 && (<>
            {title('Will you work online?', 'Calls, uploads and a laptop add up.')}
            <DataMeter gbDay={perDayOf(uses, work === true)} />
            {[{ v: true, label: 'Yes, I will work', sub: 'Video meetings, files, a laptop' }, { v: false, label: 'No, just the trip', sub: 'Holiday mode' }].map((o) => (
              <button key={String(o.v)} type="button" className="press" aria-pressed={work === o.v}
                onClick={() => { hapticNotify('success'); setWork(o.v); window.setTimeout(() => setStep(4), 260); }}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px 18px', borderRadius: 18, border: `2px solid ${work === o.v ? RC.orangeInk : RC.line}`, background: work === o.v ? '#FFF1E8' : '#fff', fontFamily: 'var(--font)' }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: RC.ink }}>{o.label}</div>
                <div style={{ marginTop: 2, fontSize: 14, color: RC.ink2 }}>{o.sub}</div>
              </button>
            ))}
          </>)}

          {rec && (<>
            <div className="rise" style={{ ...cardSurface(), padding: 22, textAlign: 'center' }}>
              {trip && <img className="hop" src={TRIP_LOOK[trip].item} alt="" aria-hidden style={{ display: 'block', margin: '0 auto 6px', width: 72, height: 72, objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.18))' }} />}
              <div style={{ ...TYPE.small, fontWeight: 700, color: RC.orangeInk }}>Your plan</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, lineHeight: 1.1, color: RC.ink }}>{rec.title}</div>
              <p style={{ margin: '10px 0 0', ...TYPE.body, color: RC.ink2 }}>{rec.line}</p>
            </div>
            {trip === 'multi' && regions.length > 0 && (<>
              <div style={{ marginTop: 4, ...TYPE.body, fontWeight: 700, color: RC.ink }}>Pick your region</div>
              {regions.map((d) => (
                <button key={d.id} type="button" className="press" onClick={() => { hapticSelection(); setQuizPick(rec); onOpen(d.id); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', cursor: 'pointer', padding: 10, borderRadius: 18, border: `2px solid ${RC.line}`, background: '#fff', fontFamily: 'var(--font)' }}>
                  <span aria-hidden style={{ flex: 'none', width: 64, height: 48, borderRadius: 12, overflow: 'hidden', background: skyFor(d.id) }}>
                    <img src={bundledPictureFor(d.id) ?? pictureFor(d.id)} alt="" decoding="async" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </span>
                  <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: RC.ink }}>{d.label}</span>
                  <span style={{ paddingRight: 8, fontSize: 14, color: RC.ink2 }}>{`${d.countries} countries`}</span>
                </button>
              ))}
            </>)}
            <button type="button" className="press" onClick={restart}
              style={{ alignSelf: 'center', border: 'none', background: 'none', padding: 8, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Take it again
            </button>
          </>)}
        </div>
      </div>
      {(step === 1 || step === 2 || rec) && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}` }}>
          {step === 1 && <RingoButton onClick={() => { hapticSelection(); setStep(2); }}>Next</RingoButton>}
          {step === 2 && <RingoButton onClick={() => { hapticSelection(); setStep(3); }} disabled={uses.length === 0}>Next</RingoButton>}
          {rec && <RingoButton onClick={() => { setQuizPick(rec); onBrowse(); }}>Pick my destination</RingoButton>}
        </div>
      )}
    </div>
  );
}
