// ComingNext — the capabilities Ringo does not sell yet, with a way to say
// "tell me when". Mirrors the waitlist the marketing site runs: a guest can
// register with an email alone, a signed-in user with one tap.
import { useState } from 'react';
import { RC, RADIUS } from '../theme';
import { RingoButton } from '../components/Button';
import { Input } from '../components/ui';
import { sbData } from '../lib/ringoSupabase';
import { haptic } from '../lib/haptics';
import { COMING_ITEMS } from '../data/coming';


export function ComingNext({ signedIn }: { signedIn: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const register = async (key: string) => {
    setErr('');
    // Signed in: one tap, we already know who they are. Guest: ask once.
    if (!signedIn && !openKey) { setOpenKey(key); return; }
    if (!signedIn && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr('Enter an email we can reach you on.');
      return;
    }
    setBusy(true);
    const r = await sbData.registerInterest(key, signedIn ? undefined : email);
    setBusy(false);
    if (!r.ok) { setErr('Could not save that. Try again in a moment.'); return; }
    haptic('light');
    setDone((d) => ({ ...d, [key]: true }));
    setOpenKey(null);
    setEmail('');
  };

  return (
    <div style={{ borderRadius: 18, background: RC.paper, border: `1px solid ${RC.line}`, overflow: 'hidden' }}>
      {COMING_ITEMS.map((it, i) => (
        <div key={it.key} style={{ padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${RC.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink }}>{it.title}</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.4 }}>{it.sub}</div>
            </div>
            {done[it.key] ? (
              <span
                style={{
                  fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3,
                  color: RC.inkStrong, whiteSpace: 'nowrap',
                }}
              >
                On the list
              </span>
            ) : (
              <button
                onClick={() => register(it.key)}
                disabled={busy}
                className="press"
                style={{
                  border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, cursor: busy ? 'default' : 'pointer',
                  borderRadius: RADIUS.sm, minHeight: 36, padding: '0 12px', whiteSpace: 'nowrap',
                  fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: RC.ink,
                }}
              >
                Notify me
              </button>
            )}
          </div>

          {openKey === it.key && (
            <div style={{ marginTop: 10 }}>
              <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" inputMode="email" />
              {err && (
                <div role="alert" style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12.5, color: '#B7341A' }}>{err}</div>
              )}
              <div style={{ marginTop: 10 }}>
                <RingoButton size="sm" loading={busy} onClick={() => register(it.key)}>Add me to the list</RingoButton>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
