// NotifyPrimer — a custom "why" screen shown BEFORE the iOS notification dialog
// (raises accept rates). Simple + transparent: one clear reason, a teased alert,
// two honest choices.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoButton } from '../components/Button';
import { LOGO_SRC } from '../assets';
import { requestNotifications } from '../lib/notify';
import { haptic, hapticNotify } from '../lib/haptics';

export function NotifyPrimer({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const allow = async () => {
    if (busy) return;
    haptic('medium');
    setBusy(true);
    await requestNotifications();
    hapticNotify('success');
    onDone();
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: RC.bg }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 26px 0', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: RC.gradSoft, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.7 21a2 2 0 01-3.4 0" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ marginTop: 22, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.8, lineHeight: 1.12 }}>
          Never miss a connection.
        </div>
        <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 15, color: RC.inkMute, lineHeight: 1.55, maxWidth: 300 }}>
          Turn on alerts and we'll ping you the moment you land — so you're online before you even leave the plane.
        </div>

        {/* teased notification — slides in */}
        <div
          style={{
            marginTop: 28, width: '100%', maxWidth: 340, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 18, background: RC.paper, border: `1px solid ${RC.line}`,
            boxShadow: '0 16px 34px -18px rgba(34,26,20,0.3)', textAlign: 'left',
            animation: 'ringoNotifIn 0.6s cubic-bezier(0.34,1.4,0.64,1) both',
          }}
        >
          <img src={LOGO_SRC} alt="" style={{ height: 22, width: 22, objectFit: 'contain', borderRadius: 6 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, color: RC.ink }}>Welcome to Japan 🇯🇵</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>You're connected — data is live. Enjoy the trip!</div>
          </div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 11, color: RC.inkMute, alignSelf: 'flex-start' }}>now</div>
        </div>
      </div>

      <div style={{ padding: '16px 26px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <RingoButton disabled={busy} onClick={allow}>{busy ? 'Just a sec…' : 'Turn on alerts'}</RingoButton>
        <button
          onClick={onDone}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.inkMute }}
        >
          Not now
        </button>
      </div>
      <style>{`@keyframes ringoNotifIn{from{opacity:0;transform:translateY(-16px) scale(0.96)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
