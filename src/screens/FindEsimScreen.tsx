// FindEsimScreen — "I bought an eSIM, show it here" by email (the App Store
// route is "Restore purchases" on My eSIM). The website identifies
// a customer by email: /api/lead returns the signup row and its token for
// the address, the same handle the dashboard link carries. With it the app
// shows the plan and what is left on it; the installable profile itself
// stays behind the purchase (see EsimScreen) or the install email.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { light } from '../api/light';
import { account } from '../store/account';
import { hapticNotify } from '../lib/haptics';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function FindEsimScreen({ onBack, onFound }: { onBack: () => void; onFound: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const find = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter the email you bought with.'); return; }
    setErr(null);
    setBusy(true);
    try {
      const r = await light.lead(e);
      if (!r.id || !r.t) throw new Error('no handle');
      account.set({ userId: r.id, t: r.t, email: e, purchaseRef: null });
      hapticNotify('success');
      onFound();
    } catch {
      setErr('Could not look that up right now. Check the address and your connection, then try again.');
      hapticNotify('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Find my eSIM" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.15 }}>
          Which email did you buy with?
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          We will show the plan on it, how much data is left, and send the install link again if you need it.
        </div>
        <div style={{ marginTop: 22 }}>
          <FieldLabel>Email</FieldLabel>
          <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" inputMode="email" />
          {err && <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C', lineHeight: 1.45 }}>{err}</div>}
        </div>
        <div style={{ marginTop: 22 }}>
          <RingoButton loading={busy} onClick={() => void find()}>Show my eSIM</RingoButton>
        </div>
      </div>
    </div>
  );
}
