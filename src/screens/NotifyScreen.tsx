// NotifyScreen: the notifications step of onboarding (owner 2026-11-02: the
// first promo push reached 4 of 16 phones, because offers were off nearly
// everywhere). Shown once per phone, after signing up and picking a
// traveller, before the tabs; a member from before the step sees it once at
// launch (src/lib/push.ts onboardDue). One warm explanation, the offers
// switch (on by default, visible and changeable: App Store guideline 4.5.4),
// one button that raises the iOS dialog, a quiet "Not now". Service alerts
// are always on once notifications are allowed.
import { useEffect, useId, useState } from 'react';
import { RC, TYPE, SHADOW_CARD } from '../theme';
import { RingoButton } from '../components/Button';
import { TextLink } from '../components/ui';
import { Toggle } from '../components/PushControls';
import { RingoWordmark } from '../components/Wordmark';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { useLayout, contentColumn } from '../lib/layout';
import { usePush, completeOnboard, markOnboarded } from '../lib/push';
import { t } from '../lib/i18n';

const BellIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z" fill="#FF5724" />
    <path d="M10 20.5a2 2 0 004 0" stroke="#FF5724" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function NotifyScreen({ onDone }: { onDone: () => void }) {
  const l = useLayout();
  const push = usePush();
  const [offers, setOffers] = useState(true);
  const [busy, setBusy] = useState(false);
  const labelId = useId();
  // Shown is shown: whatever happens next (the app closed mid-step), the
  // step never comes back on this phone.
  useEffect(() => { markOnboarded(); }, []);

  const granted = push.permission === 'granted';
  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await completeOnboard(offers);
    if (ok) hapticNotify('success');
    onDone();
  };
  const notNow = () => { hapticSelection(); markOnboarded(); onDone(); };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: RC.paper }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `calc(env(safe-area-inset-top, 0px) + 28px) ${l.gutter}px 180px` }}>
        <div style={{ ...contentColumn(l) }}>
          <div className="rise" style={{ marginBottom: 28 }}><RingoWordmark size={24} /></div>
          <div
            aria-hidden
            className="rise"
            style={{
              width: 72, height: 72, borderRadius: '50%', background: RC.paper, boxShadow: SHADOW_CARD,
              border: `1.5px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
            }}
          >
            <BellIcon />
          </div>
          <h1 className="rise" style={{ margin: 0, ...TYPE.h1, fontSize: 32, color: RC.ink }}>{t('Let Ringo keep you posted')}</h1>
          <p className="rise" style={{ margin: '10px 0 26px', ...TYPE.body, color: RC.ink2 }}>
            {t('A heads up when your data runs low and the moment your plan is active, so you never go dark on a trip.')}
          </p>
          <div
            className="rise"
            style={{
              background: RC.paper, borderRadius: 20, border: `1.5px solid ${RC.line}`, boxShadow: SHADOW_CARD,
              padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id={labelId} style={{ ...TYPE.h3, color: RC.ink }}>{t('Occasional offers and travel tips')}</div>
              <div style={{ ...TYPE.small, color: RC.ink2, marginTop: 3 }}>{t('Member prices and a tip now and then. Change it any time under Help.')}</div>
            </div>
            <Toggle on={offers} onChange={setOffers} label={t('Occasional offers and travel tips')} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}` }}>
        <div style={{ ...contentColumn(l) }}>
          <RingoButton loading={busy} onClick={() => void turnOn()}>{granted ? t('Continue') : t('Turn on notifications')}</RingoButton>
          {!granted && (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <TextLink onClick={notNow} disabled={busy} color={RC.ink2}>{t('Not now')}</TextLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
