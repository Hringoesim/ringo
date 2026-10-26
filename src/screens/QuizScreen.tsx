// QuizScreen: "How much data do I need?" (owner 2026-10-27). Three taps,
// then a plan type: a data plan with the size to pick, Unlimited, or a Power
// plan (vans, hotspots, a secure connection). The pick rides to the plan
// screen (quizPick in lib/quiz.ts), which opens on that tab.
import { useState } from 'react';
import { RC, TYPE, RADIUS, cardSurface } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { hapticSelection, hapticNotify } from '../lib/haptics';
import { useLayout, contentColumn } from '../lib/layout';
import { recommend, setQuizPick, USES, LENGTHS, type Use } from '../lib/quiz';

export function QuizScreen({ onBack, onBrowse }: { onBack: () => void; onBrowse: () => void }) {
  const l = useLayout();
  const [step, setStep] = useState(0);
  const [days, setDays] = useState<number | null>(null);
  const [uses, setUses] = useState<Use[]>([]);
  const [work, setWork] = useState<boolean | null>(null);
  const done = step === 3 && days != null && work != null;
  const rec = done ? recommend({ days: days!, uses, work: work! }) : null;

  const option = (label: string, on: boolean, onClick: () => void, sub?: string) => (
    <button key={label} type="button" className="press" aria-pressed={on} onClick={() => { hapticSelection(); onClick(); }}
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '16px 18px', borderRadius: 18, border: `2px solid ${on ? RC.orangeInk : RC.line}`, background: on ? '#FFF1E8' : '#fff', fontFamily: 'var(--font)' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: RC.ink }}>{label}</div>
      {sub && <div style={{ marginTop: 2, fontSize: 14, color: RC.ink2 }}>{sub}</div>}
    </button>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="How much data?" leading={<BackBtn onClick={step > 0 && !done ? () => setStep(step - 1) : onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${l.gutter}px 140px` }}>
        <div style={{ ...contentColumn(l), display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!done && (
            <div aria-hidden style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: RADIUS.pill, background: i <= step ? RC.orangeInk : RC.line }} />)}
            </div>
          )}
          {step === 0 && (<>
            <h2 style={{ margin: '4px 0 8px', ...TYPE.h1, color: RC.ink }}>How long is your trip?</h2>
            {LENGTHS.map((x) => option(x.label, days === x.days, () => { setDays(x.days); setStep(1); }))}
          </>)}
          {step === 1 && (<>
            <h2 style={{ margin: '4px 0 8px', ...TYPE.h1, color: RC.ink }}>What will you use it for?</h2>
            <p style={{ margin: '0 0 6px', ...TYPE.small, color: RC.ink2 }}>Pick all that fit.</p>
            {USES.map((u) => option(u.label, uses.includes(u.id), () => setUses(uses.includes(u.id) ? uses.filter((x) => x !== u.id) : [...uses, u.id]), u.sub))}
          </>)}
          {step === 2 && (<>
            <h2 style={{ margin: '4px 0 8px', ...TYPE.h1, color: RC.ink }}>Will you work online?</h2>
            {option('Yes, calls and laptop work', work === true, () => { setWork(true); setStep(3); hapticNotify('success'); })}
            {option('No, just the trip', work === false, () => { setWork(false); setStep(3); hapticNotify('success'); })}
          </>)}
          {rec && (
            <div className="rise" style={{ ...cardSurface(), padding: 22 }}>
              <div style={{ ...TYPE.small, fontWeight: 700, color: RC.orangeInk }}>Your plan</div>
              <div style={{ marginTop: 6, ...TYPE.h1, fontSize: 30, color: RC.ink }}>{rec.title}</div>
              <p style={{ margin: '10px 0 0', ...TYPE.body, color: RC.ink2 }}>{rec.line}</p>
              <button type="button" className="press" onClick={() => { setStep(0); setDays(null); setUses([]); setWork(null); }}
                style={{ marginTop: 14, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink2, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Start again
              </button>
            </div>
          )}
        </div>
      </div>
      {(step === 1 || rec) && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}` }}>
          {step === 1
            ? <RingoButton onClick={() => setStep(2)} disabled={uses.length === 0}>Next</RingoButton>
            : <RingoButton onClick={() => { if (rec) setQuizPick(rec.tab); onBrowse(); }}>Pick my destination</RingoButton>}
        </div>
      )}
    </div>
  );
}
