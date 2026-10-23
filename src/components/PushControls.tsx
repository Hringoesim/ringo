// PushControls — the one-line pre-prompt after a purchase, and the two
// switches under Help (service alerts, offers). See src/lib/push.ts.
import { useState } from 'react';
import { RC, RADIUS } from '../theme';
import { RingoButton } from './Button';
import { hapticSelection } from '../lib/haptics';
import { usePush, shouldPrompt, askPermission, dismissPrompt, setPushPref, openPushSettings, pushAvailable } from '../lib/push';

/** After a purchase: one line, then the iOS dialog only if they say yes. */
export function PushPrompt() {
  const push = usePush();
  const [busy, setBusy] = useState(false);
  if (!pushAvailable() || push.permission !== 'prompt' || !shouldPrompt()) return null;
  return (
    <div className="rise" style={{ marginTop: 18, padding: 14, borderRadius: RADIUS.sm, background: RC.gradSoft, textAlign: 'left' }}>
      <div style={{ fontFamily: 'var(--font)', fontSize: 14, color: RC.ink, lineHeight: 1.45 }}>
        Get notified when your eSIM is ready.
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <RingoButton size="sm" full={false} disabled={busy} onClick={() => { setBusy(true); void askPermission().finally(() => setBusy(false)); }}>Turn on</RingoButton>
        <RingoButton size="sm" variant="ghost" full={false} onClick={() => { hapticSelection(); dismissPrompt(); }}>Not now</RingoButton>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="press"
      onClick={() => { hapticSelection(); onChange(!on); }}
      style={{ width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer', padding: 2, background: on ? RC.success : RC.line, transition: 'background .2s', flexShrink: 0 }}
    >
      <span style={{ display: 'block', width: 27, height: 27, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: on ? 'translateX(20px)' : 'none', transition: 'transform .2s' }} />
    </button>
  );
}

function SwitchRow({ label, sub, on, onChange, last }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: last ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink }}>{label}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>{sub}</div>
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}

/** Help > Notifications: service alerts on by default, offers off until turned on. */
export function PushSwitches() {
  const push = usePush();
  if (!pushAvailable()) return null;
  const allowed = push.permission === 'granted';
  return (
    <>
      {push.permission === 'denied' && (
        <button className="press" onClick={() => void openPushSettings()} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', borderBottom: `1px solid ${RC.line}`, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.45 }}>
          Notifications are off for Ringo. <span style={{ color: RC.ink, fontWeight: 600, textDecoration: 'underline' }}>Turn them on in Settings</span>
        </button>
      )}
      <SwitchRow label="Service alerts" sub="eSIM ready, data running low" on={allowed && push.prefs.service} onChange={(v) => void setPushPref('service', v)} />
      <SwitchRow label="Offers and Rewards" sub="Member prices and offers" on={allowed && push.prefs.offers} onChange={(v) => void setPushPref('offers', v)} last />
    </>
  );
}
