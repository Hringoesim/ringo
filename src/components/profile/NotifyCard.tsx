// NotifyCard: on the profile, until notifications are on (owner 2026-10-28:
// "on profile we want them to turn on notifications"). The one place besides
// the pre-prompt after a first purchase and the switches under Help where a
// member can turn them on. Asked: the iOS dialog. Refused before: iOS
// Settings, which is the only place iOS lets it change. Hidden once allowed,
// and off the iPhone app (the web preview has no notifications).
import { useState } from 'react';
import { RC, TYPE, cardSurface } from '../../theme';
import { RingoButton } from '../Button';
import { usePush, askPermission, openPushSettings, pushAvailable } from '../../lib/push';
import { hapticNotify } from '../../lib/haptics';
import type { Layout } from '../../lib/layout';
import { t } from '../../lib/i18n';

const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" fill="#FF5724" />
    <path d="M10 20.5a2 2 0 004 0" stroke="#FF5724" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function NotifyCard({ l }: { l: Layout }) {
  const push = usePush();
  const [busy, setBusy] = useState(false);
  if (!pushAvailable() || !push.known || push.permission === 'granted') return null;
  const denied = push.permission === 'denied';
  const turnOn = async () => {
    if (denied) { await openPushSettings(); return; }
    setBusy(true);
    const granted = await askPermission();
    setBusy(false);
    if (granted) hapticNotify('success');
  };
  return (
    <section style={{ ...cardSurface(), padding: l.isWide ? 22 : 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div aria-hidden style={{ width: 44, height: 44, borderRadius: '50%', background: RC.cream, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <BellIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, ...TYPE.h3, color: RC.ink }}>{t('Know before your data runs out')}</h2>
          <p style={{ margin: '4px 0 0', ...TYPE.small, color: RC.ink2 }}>
            {denied
              ? t('Notifications are off for Ringo in your iPhone settings.')
              : t('We tell you when data runs low or your eSIM needs you. Nothing else unless you choose it.')}
          </p>
        </div>
      </div>
      <RingoButton loading={busy} onClick={() => void turnOn()}>{denied ? t('Open Settings') : t('Turn on notifications')}</RingoButton>
    </section>
  );
}
