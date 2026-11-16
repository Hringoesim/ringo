// AppNudge: one small card over the store and My eSIM (owner 2026-11-12:
// "toggle people to turn on notifications and to update the app"). It shows
// at most one thing: a newer version on the App Store first (lib/appUpdate),
// else notifications that are off for a signed-in member (lib/push). The
// button does the one thing: the App Store, the iOS dialog, or iOS Settings
// once iOS has been refused. The update card stays until the phone is
// updated (owner 2026-11-12: "if you are on an old version they need to
// update it"); "Not now" puts the notifications card away for 30 days.
import { useState, type CSSProperties } from 'react';
import { RC, TYPE, cardSurface } from '../theme';
import { RingoButton } from './Button';
import { TextLink } from './ui';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { usePush, pushNudgeDue, askPermission, openPushSettings } from '../lib/push';
import { useUpdateAvailable, APP_STORE_URL } from '../lib/appUpdate';
import { openExternal } from '../lib/browser';
import { useAccount } from '../store/account';
import { t } from '../lib/i18n';

const NOTIFY_LATER_KEY = 'ringo_nudge_notify_later_v1';
const NOTIFY_LATER_MS = 30 * 86400000;

function notifyPutAway(): boolean {
  try { return Date.now() - Number(localStorage.getItem(NOTIFY_LATER_KEY) || 0) < NOTIFY_LATER_MS; } catch { return false; }
}

// In development only: ?nudge=update, ?nudge=notify or ?nudge=settings shows the card in a browser.
const preview = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('nudge') : null;

const UpdateIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" stroke="#FF5724" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" fill="#FF5724" />
    <path d="M10 20.5a2 2 0 004 0" stroke="#FF5724" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function AppNudge({ style }: { style?: CSSProperties }) {
  const version = useUpdateAvailable();
  const push = usePush();
  const acct = useAccount();
  const [busy, setBusy] = useState(false);
  // Counts each "Not now", so the card goes at once.
  const [, setPutAway] = useState(0);

  const update = preview === 'update' || Boolean(version);
  const refused = preview === 'settings' || push.permission === 'denied';
  const notify = !update && (preview === 'notify' || preview === 'settings' || (Boolean(acct) && pushNudgeDue() && !notifyPutAway()));
  if (!update && !notify) return null;

  const later = () => {
    hapticSelection();
    try { localStorage.setItem(NOTIFY_LATER_KEY, String(Date.now())); } catch { /* ignore */ }
    setPutAway((n) => n + 1);
  };
  const act = async () => {
    if (busy) return;
    if (update) { void openExternal(APP_STORE_URL); return; }
    if (refused) { void openPushSettings(); return; }
    setBusy(true);
    if (await askPermission()) hapticNotify('success');
    setBusy(false);
  };

  return (
    <section aria-label={update ? t('A new version of Ringo is ready') : t('Notifications are off')} style={{ ...cardSurface(), padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start', ...style }}>
      <span aria-hidden style={{ width: 40, height: 40, borderRadius: '50%', background: RC.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {update ? <UpdateIcon /> : <BellIcon />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.h3, color: RC.ink }}>{update ? t('A new version of Ringo is ready') : t('Notifications are off')}</div>
        <div style={{ ...TYPE.small, color: RC.ink2, marginTop: 2 }}>
          {update ? t('Update for the latest fixes and features.') : t('Know when your eSIM is ready and when data runs low.')}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <RingoButton size="sm" full={false} loading={busy} onClick={() => void act()}>
            {update ? t('Update') : refused ? t('Open Settings') : t('Turn on notifications')}
          </RingoButton>
          {!update && <TextLink onClick={later} disabled={busy} color={RC.ink2}>{t('Not now')}</TextLink>}
        </div>
      </div>
    </section>
  );
}
