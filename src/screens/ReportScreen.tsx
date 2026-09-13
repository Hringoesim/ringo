// ReportScreen — something is wrong with the eSIM. The site opens a case with
// the carrier partner and emails the traveller; the app only collects the
// reason and a sentence.
import { useState } from 'react';
import { RC, RADIUS } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel } from '../components/ui';
import { light, PROBLEM_REASONS } from '../api/light';
import { useAccount } from '../store/account';
import { hapticNotify, hapticSelection } from '../lib/haptics';

export function ReportScreen({ onBack }: { onBack: () => void }) {
  const acct = useAccount();
  const [reason, setReason] = useState(PROBLEM_REASONS[0].id);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!acct) return;
    if (message.trim().length < 10) { setErr('Tell us what happens. A sentence is enough.'); return; }
    setErr(null);
    setBusy(true);
    try {
      const r = await light.reportProblem(acct.userId, acct.t, { reason, message: message.trim(), device: 'iPhone (Ringo app)' });
      setDone(r.throttled ? 'We already have a case open for this eSIM today. We will write back by email.' : 'Case opened. We will write back by email, usually within one business day.');
      hapticNotify('success');
    } catch (e) {
      setErr((e as Error).message || 'Could not send. Please try again.');
      hapticNotify('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Report a problem" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        {done ? (
          <div className="rise" style={{ padding: 18, borderRadius: RADIUS.lg, background: 'rgba(31,138,91,0.10)', border: '1px solid rgba(31,138,91,0.24)', fontFamily: 'var(--font)', fontSize: 14, color: '#1F7A4E', lineHeight: 1.5, fontWeight: 600 }}>
            {done}
            <div style={{ marginTop: 14 }}><RingoButton size="sm" variant="soft" onClick={onBack}>Back to my eSIM</RingoButton></div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              First, the quick fixes: turn on Data Roaming for the Ringo line, restart the phone once, and keep your own SIM for calls. Still stuck? Tell us.
            </div>
            <div style={{ marginTop: 18 }}>
              <FieldLabel>What is wrong</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROBLEM_REASONS.map((r) => {
                  const on = r.id === reason;
                  return (
                    <button key={r.id} className="press" onClick={() => { hapticSelection(); setReason(r.id); }} style={{ textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderRadius: 14, background: RC.paper, border: `1.5px solid ${on ? RC.inkStrong : RC.line}`, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <FieldLabel>What happens</FieldLabel>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Where you are, what the phone shows, what you tried"
                rows={4}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: `1.5px solid ${RC.line}`, background: RC.paper, fontFamily: 'var(--font)', fontSize: 15, color: RC.ink, outline: 'none', resize: 'none' }}
              />
              {err && <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C' }}>{err}</div>}
            </div>
            <div style={{ marginTop: 18 }}>
              <RingoButton loading={busy} onClick={() => void send()}>Send</RingoButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
