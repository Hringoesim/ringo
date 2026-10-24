// PushControls: the ONE notification ask (PushSheet, shown by App.tsx once per
// device after the first purchase is delivered) and the two switches under
// Help (service alerts, offers). See src/lib/push.ts.
//
// PushPrompt is kept as a no-op export so an older import still compiles; it
// renders nothing. Nothing outside App.tsx raises the pre-prompt.
import { useEffect, useId, useRef, useState } from 'react';
import { RC, TYPE, SHADOW_CARD, skyFor, typeFor } from '../theme';
import { RingoButton } from './Button';
import { TextLink } from './ui';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { useLayout } from '../lib/layout';
import { usePush, askPermission, dismissPrompt, setPushPref, openPushSettings, pushAvailable } from '../lib/push';

/** Retired: the ask lives in PushSheet, shown by App.tsx only. Renders nothing. */
export function PushPrompt(): null {
  return null;
}

const BellIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" fill="#FF5724" />
    <path d="M10 20.5a2 2 0 004 0" stroke="#FF5724" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * The pre-prompt, styled like the site: a white photo card, a plain heading,
 * one line, a gradient button and a quiet "Not now". "Turn on" raises the iOS
 * dialog once; any answer closes the ask for good on this phone.
 */
export function PushSheet({ photo, place, onClose }: { photo?: string | null; place?: string; onClose: () => void }) {
  const l = useLayout();
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const lineId = useId();

  const notNow = () => { hapticSelection(); dismissPrompt(); onClose(); };
  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    const granted = await askPermission();
    if (granted) {
      hapticNotify('success');
      // Service alerts on after a yes; offers stay off until switched on in Help.
      void setPushPref('service', true);
    }
    onClose();
  };

  useEffect(() => {
    btnRef.current?.querySelector('button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { dismissPrompt(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(26,15,46,0.46)',
        display: 'flex', alignItems: l.isWide ? 'center' : 'flex-end', justifyContent: 'center',
        padding: l.isWide ? l.gutter : `0 ${l.gutter}px max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))`,
        animation: 'ringoFadeIn 0.24s ease both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) notNow(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={lineId}
        className="rise"
        style={{
          width: '100%', maxWidth: 480, background: RC.paper, borderRadius: 24,
          border: `1.5px solid ${RC.line}`, boxShadow: `${SHADOW_CARD}, 0 30px 60px -24px rgba(26,15,46,0.45)`,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: l.isCover ? '2 / 1' : '16 / 9', background: skyFor(place || 'ringo') }}>
          {photo && !broken && (
            <img src={photo} alt="" onError={() => setBroken(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 20, bottom: -26, width: 56, height: 56, borderRadius: '50%',
              background: RC.paper, boxShadow: '0 8px 22px -8px rgba(26,15,46,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <BellIcon />
          </div>
        </div>
        <div style={{ padding: `40px ${l.isWide ? 28 : 22}px 22px` }}>
          <h2 id={titleId} style={{ margin: 0, ...typeFor('h1', l.size), color: RC.ink }}>
            Know before your data runs out
          </h2>
          <p id={lineId} style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>
            We tell you when data runs low or your eSIM needs you. Nothing else unless you choose it.
          </p>
          <div ref={btnRef} style={{ marginTop: 22 }}>
            <RingoButton loading={busy} onClick={() => void turnOn()}>Turn on notifications</RingoButton>
          </div>
          <div style={{ marginTop: 18, marginBottom: 4, textAlign: 'center' }}>
            <TextLink onClick={notNow} disabled={busy} color={RC.ink2}>Not now</TextLink>
          </div>
        </div>
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
      style={{
        width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
        background: on ? RC.tick : RC.lineStrong, transition: 'background .2s',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px rgba(26,15,46,0.08)',
      }}
    >
      <span style={{ display: 'block', width: 27, height: 27, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: on ? 'translateX(20px)' : 'none', transition: 'transform .2s' }} />
    </button>
  );
}

function SwitchRow({ label, sub, on, onChange, last }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', minHeight: 64, boxSizing: 'border-box', borderBottom: last ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.h3, color: RC.ink }}>{label}</div>
        <div style={{ ...TYPE.small, color: RC.ink2, marginTop: 2 }}>{sub}</div>
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}

/**
 * Help > Notifications: service alerts on by default once allowed, offers off
 * until turned on. Once iOS has been refused, the switches open iOS Settings.
 */
export function PushSwitches() {
  const push = usePush();
  if (!pushAvailable()) return null;
  const allowed = push.permission === 'granted';
  return (
    <>
      {push.permission === 'denied' && (
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0, ...TYPE.small, color: RC.ink2 }}>
            Notifications are off for Ringo in your iPhone settings.
          </div>
          <RingoButton size="sm" variant="soft" full={false} onClick={() => void openPushSettings()}>Open Settings</RingoButton>
        </div>
      )}
      <SwitchRow label="Service alerts" sub="eSIM ready, data running low" on={allowed && push.prefs.service} onChange={(v) => void setPushPref('service', v)} />
      <SwitchRow label="Offers and Rewards" sub="Member prices and new levels" on={allowed && push.prefs.offers} onChange={(v) => void setPushPref('offers', v)} last />
    </>
  );
}
