// QuizScreen: "How much data do I need?" (owner 2026-10-27), made to play
// (owner: "focus on the quiz that makes it interactive, and completing the
// quiz gives you coins"). Three steps: a trip length slider, tiles for what
// the trip needs with a live data meter that fills as they are picked, and
// work online or not; then a reveal with confetti and the plan type. Drawn in
// 3D (owner 2026-10-27: raised keys, a carved meter, a minted coin; the
// .q3d classes in index.css). A signed-in member earns the Data smart badge
// and 25 Ringo coins once per purchase (owner 2026-10-27: "once per purchase,
// it gives an incentive for people to come back"; /api/app-quiz). The answer
// rides to the plan screen (quizPick in lib/quiz.ts), which opens on that tab.
import { useEffect, useState, type ReactNode } from 'react';
import { RC, TYPE, RADIUS, SITE_GRAD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { Confetti } from '../components/Confetti';
import { hapticSelection, hapticNotify } from '../lib/haptics';
import { useLayout, contentColumn } from '../lib/layout';
import { recommend, setQuizPick, perDayOf, USES, type Use } from '../lib/quiz';
import { account } from '../store/account';
import { light, SITE } from '../api/light';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const ICON: Record<Use, ReactNode> = {
  maps: <><path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z" {...S} /><circle cx="12" cy="10.5" r="2.2" {...S} /></>,
  social: <><rect x="4" y="4" width="16" height="16" rx="4.5" {...S} /><circle cx="12" cy="12" r="3.6" {...S} /><circle cx="16.8" cy="7.2" r=".9" fill="currentColor" /></>,
  calls: <><rect x="3" y="7" width="12" height="10" rx="2.5" {...S} /><path d="M15 10.5l6-3.5v10l-6-3.5" {...S} /></>,
  streaming: <><rect x="3" y="5" width="18" height="12" rx="2.5" {...S} /><path d="M10 8.5v5l4.5-2.5z" fill="currentColor" stroke="none" /><path d="M8 20h8" {...S} /></>,
  hotspot: <><path d="M5 9.5a10 10 0 0 1 14 0M8 12.5a5.6 5.6 0 0 1 8 0" {...S} /><circle cx="12" cy="16" r="1.6" fill="currentColor" /></>,
};
const QUICK_DAYS = [3, 7, 14, 30];
const COINS = 25;

function DataMeter({ gbDay }: { gbDay: number }) {
  const pct = Math.min(100, (gbDay / 6) * 100);
  const label = gbDay < 0.6 ? 'Light' : gbDay < 1.5 ? 'Moderate' : gbDay < 4 ? 'Heavy' : 'Power user';
  return (
    <div aria-live="polite" className="q3d-card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink2 }}>Your daily use</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{`${gbDay.toFixed(1)} GB`}</span>
      </div>
      <div className="q3d-track" style={{ marginTop: 10, height: 14, borderRadius: RADIUS.pill, overflow: 'hidden' }}>
        <div className="q3d-fill" style={{ width: `${Math.max(pct, gbDay > 0 ? 6 : 0)}%`, height: '100%', borderRadius: RADIUS.pill, background: SITE_GRAD, transition: 'width .45s cubic-bezier(.3,.7,.4,1)' }} />
      </div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink2 }}>{gbDay > 0 ? label : 'Pick what you will use'}</div>
    </div>
  );
}

export function QuizScreen({ onBack, onBrowse }: { onBack: () => void; onBrowse: () => void }) {
  const l = useLayout();
  const [step, setStep] = useState(0);
  const [days, setDays] = useState(7);
  const [uses, setUses] = useState<Use[]>([]);
  const [hop, setHop] = useState<Use | null>(null);
  const [work, setWork] = useState<boolean | null>(null);
  const [coins, setCoins] = useState<'none' | 'earned' | 'later' | 'signin'>('none');
  const done = step === 3 && work != null;
  const rec = done ? recommend({ days, uses, work: work! }) : null;

  // The coins, when the result shows: the site pays once per purchase and
  // says what it paid (0 when this round was already paid: buy, then come back).
  useEffect(() => {
    if (!done) return;
    const acct = account.get();
    if (!acct) { setCoins('signin'); return; }
    void fetch(`${SITE}/api/app-quiz`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: acct.userId, t: acct.t }) })
      .then(async (r) => {
        if (!r.ok) return;
        const j = (await r.json().catch(() => null)) as { coins?: number } | null;
        if (j && Number(j.coins) > 0) {
          setCoins('earned');
          hapticNotify('success');
          void light.profile(acct.userId, acct.t).catch(() => {});
        } else setCoins('later');
      })
      .catch(() => {});
  }, [done]);

  const restart = () => { setStep(0); setDays(7); setUses([]); setWork(null); setCoins('none'); };
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
            <div aria-label={`Step ${step + 1} of 3`} style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: RADIUS.pill, background: i <= step ? SITE_GRAD : RC.line, transition: 'background .3s' }} />)}
            </div>
          )}

          {step === 0 && (<>
            {title('How long is your trip?')}
            <div className="q3d-card" style={{ padding: '22px 18px', textAlign: 'center' }}>
              <div className="q3d-num" style={{ fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 800, lineHeight: 1, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{days}</div>
              <div style={{ marginTop: 4, ...TYPE.small, fontWeight: 700, color: RC.ink2 }}>{days === 1 ? 'day' : 'days'}</div>
              <input type="range" min={1} max={30} value={days} aria-label="Trip length in days"
                onChange={(e) => { const v = Number(e.target.value); if (v !== days) hapticSelection(); setDays(v); }}
                style={{ width: '100%', marginTop: 18, accentColor: RC.orangeInk, height: 28 }} />
              <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {QUICK_DAYS.map((d) => (
                  <button key={d} type="button" className={`press q3d${days === d ? ' on' : ''}`} onClick={() => { hapticSelection(); setDays(d); }}
                    style={{ padding: '9px 14px', marginBottom: 4, borderRadius: RADIUS.pill, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: days === d ? '#fff' : RC.ink, cursor: 'pointer' }}>
                    {d === 7 ? '1 week' : d === 14 ? '2 weeks' : d === 30 ? '1 month' : `${d} days`}
                  </button>
                ))}
              </div>
            </div>
          </>)}

          {step === 1 && (<>
            {title('What will you use it for?', 'Tap all that fit.')}
            <DataMeter gbDay={perDayOf(uses, false)} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {USES.map((u) => {
                const on = uses.includes(u.id);
                return (
                  <button key={u.id} type="button" className={`press q3d${on ? ' on' : ''}`} aria-pressed={on}
                    onClick={() => { hapticSelection(); setHop(u.id); setUses(on ? uses.filter((x) => x !== u.id) : [...uses, u.id]); }}
                    style={{ textAlign: 'left', cursor: 'pointer', padding: 14, marginBottom: 5, borderRadius: 20, fontFamily: 'var(--font)' }}>
                    <span key={hop === u.id ? `h-${u.id}-${String(on)}` : u.id} className={`q3d-icon${hop === u.id ? ' hop' : ''}`}
                      style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RC.ink2 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>{ICON[u.id]}</svg>
                    </span>
                    <span className="q3d-title" style={{ display: 'block', marginTop: 10, fontSize: 16, fontWeight: 700, color: RC.ink }}>{u.label}</span>
                    <span className="q3d-sub" style={{ display: 'block', marginTop: 2, fontSize: 13, color: RC.ink2 }}>{u.sub}</span>
                  </button>
                );
              })}
            </div>
          </>)}

          {step === 2 && (<>
            {title('Will you work online?', 'Calls, uploads and a laptop add up.')}
            <DataMeter gbDay={perDayOf(uses, work === true)} />
            {[{ v: true, label: 'Yes, I will work', sub: 'Video meetings, files, a laptop' }, { v: false, label: 'No, just the trip', sub: 'Holiday mode' }].map((o) => (
              <button key={String(o.v)} type="button" className={`press q3d${work === o.v ? ' on' : ''}`} aria-pressed={work === o.v}
                onClick={() => { hapticNotify('success'); setWork(o.v); window.setTimeout(() => setStep(3), 260); }}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px 18px', marginBottom: 5, borderRadius: 20, fontFamily: 'var(--font)' }}>
                <div className="q3d-title" style={{ fontSize: 17, fontWeight: 700, color: RC.ink }}>{o.label}</div>
                <div className="q3d-sub" style={{ marginTop: 2, fontSize: 14, color: RC.ink2 }}>{o.sub}</div>
              </button>
            ))}
          </>)}

          {rec && (<>
            <div className="rise q3d-card" style={{ padding: 22, textAlign: 'center' }}>
              <div style={{ ...TYPE.small, fontWeight: 700, color: RC.orangeInk }}>Your plan</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, lineHeight: 1.1, color: RC.ink }}>{rec.title}</div>
              <p style={{ margin: '10px 0 0', ...TYPE.body, color: RC.ink2 }}>{rec.line}</p>
            </div>
            {coins === 'earned' && (
              <div className="rise q3d-card" role="status" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', perspective: 400 }}>
                <span className="q3d-coin" aria-hidden>+{COINS}</span>
                <span style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink }}>{`${COINS} Ringo coins on your account. Take the quiz again after your next eSIM for ${COINS} more.`}</span>
              </div>
            )}
            {coins === 'later' && (
              <p style={{ margin: 0, ...TYPE.small, color: RC.ink2, textAlign: 'center' }}>{`Quiz coins are paid once per eSIM you buy. Buy your next one and take it again for ${COINS} more.`}</p>
            )}
            {coins === 'signin' && (
              <p style={{ margin: 0, ...TYPE.small, color: RC.ink2, textAlign: 'center' }}>{`Sign in and take the quiz to earn ${COINS} Ringo coins.`}</p>
            )}
            <button type="button" className="press" onClick={restart}
              style={{ alignSelf: 'center', border: 'none', background: 'none', padding: 8, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Take it again
            </button>
          </>)}
        </div>
      </div>
      {(step < 2 || rec) && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}` }}>
          {step === 0 && <RingoButton onClick={() => { hapticSelection(); setStep(1); }}>Next</RingoButton>}
          {step === 1 && <RingoButton onClick={() => { hapticSelection(); setStep(2); }} disabled={uses.length === 0}>Next</RingoButton>}
          {rec && <RingoButton onClick={() => { setQuizPick(rec.tab, rec.gb); onBrowse(); }}>Pick my destination</RingoButton>}
        </div>
      )}
    </div>
  );
}
