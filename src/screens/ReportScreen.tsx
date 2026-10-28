// ReportScreen: something is wrong with the eSIM. The site opens a case with
// the carrier partner and emails the traveller; the app only collects the
// reason and a sentence. A centred readable column on wide screens.
import { useState } from 'react';
import { RC, RADIUS, TYPE, hexA, typeFor } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, ErrorBox, FieldLabel, SuccessBox, TickList } from '../components/ui';
import { light, PROBLEM_REASONS } from '../api/light';
import { useAccount } from '../store/account';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { useLayout, readColumn } from '../lib/layout';
import { t, i18n } from '../lib/i18n';

export function ReportScreen({ onBack }: { onBack: () => void }) {
  const acct = useAccount();
  const l = useLayout();
  const [reason, setReason] = useState(PROBLEM_REASONS[0].id);
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (busy) return;
    if (!acct) { setErr(t('Sign in with the email you bought the eSIM with, then send this again.')); hapticNotify('error'); return; }
    if (message.trim().length < 10) { setErr(t('Tell us what happens. A sentence is enough.')); return; }
    setErr(null);
    setBusy(true);
    try {
      const r = await light.reportProblem(acct.userId, acct.t, { reason, message: message.trim(), device: i18n.get() === 'en' ? 'iPhone (Ringo app)' : `iPhone (Ringo app, ${i18n.get()})` });
      setDone(r.throttled ? t('We already have a case open for this eSIM today. We will write back by email.') : t('Case opened. We will write back by email, usually within one business day.'));
      hapticNotify('success');
    } catch (e) {
      setErr((e as Error).message || t('Could not send. Please try again.'));
      hapticNotify('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title={t('Report a problem')} leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(48px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={readColumn(l)}>
          {done ? (
            <div className="rise" style={{ paddingTop: 8 }}>
              <SuccessBox style={{ fontSize: 17, lineHeight: 1.5, padding: '16px 18px' }}>{done}</SuccessBox>
              <div style={{ marginTop: 16 }}><RingoButton variant="secondary" onClick={onBack}>{t('Back to my eSIM')}</RingoButton></div>
            </div>
          ) : (
            <>
              <h2 style={{ margin: "4px 0 0", ...typeFor("display", l.size), color: RC.ink }}>{t('Try these first')}</h2>
              <TickList
                style={{ marginTop: 14 }}
                items={[t('Turn on Data Roaming for the Ringo line'), t('Restart the phone once'), t('Keep your own SIM on for calls')]}
              />

              <fieldset style={{ margin: '28px 0 0', padding: 0, border: 'none' }}>
                <legend style={{ padding: 0, marginBottom: 10, ...typeFor('h1', l.size), color: RC.ink }}>{t('What is wrong?')}</legend>
                <div role="radiogroup" aria-label={t('What is wrong?')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PROBLEM_REASONS.map((r) => {
                    const on = r.id === reason;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className="press"
                        onClick={() => { hapticSelection(); setReason(r.id); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start', cursor: 'pointer',
                          minHeight: 56, padding: '12px 16px', borderRadius: RADIUS.control, boxSizing: 'border-box',
                          background: on ? hexA('#FF5724', 0.06) : RC.paper,
                          border: `1.5px solid ${on ? RC.inkStrong : RC.lineStrong}`,
                          ...TYPE.body, fontWeight: on ? 600 : 500, color: RC.ink,
                        }}
                      >
                        <span aria-hidden style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box', border: `2px solid ${on ? RC.inkStrong : RC.inkDeco}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: RC.inkStrong }} />}
                        </span>
                        <span style={{ minWidth: 0 }}>{t(r.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div style={{ marginTop: 24 }}>
                <FieldLabel htmlFor="report-message">{t('What happens')}</FieldLabel>
                <textarea
                  id="report-message"
                  className="ringo-input"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); if (err) setErr(null); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={t('Where you are, what the phone shows, what you tried')}
                  rows={5}
                  aria-invalid={err ? true : undefined}
                  style={{
                    width: '100%', padding: 14, boxSizing: 'border-box', borderRadius: RADIUS.control,
                    border: `1.5px solid ${err ? RC.error : focused ? RC.inkStrong : RC.lineStrong}`,
                    boxShadow: focused ? `0 0 0 3px ${hexA('#FF5724', 0.14)}` : 'none',
                    background: RC.paper, fontFamily: 'var(--font)', fontSize: 17, lineHeight: 1.45, fontWeight: 500,
                    color: RC.ink, outline: 'none', resize: 'none', transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
                  }}
                />
                {err && <ErrorBox style={{ marginTop: 10 }}>{err}</ErrorBox>}
              </div>
              <div style={{ marginTop: 20 }}>
                <RingoButton loading={busy} onClick={() => void send()}>{t('Send')}</RingoButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
