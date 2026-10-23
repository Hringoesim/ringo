// WelcomeScreen: the start of the app for a new member (owner 2026-10-23:
// notifications are asked at the start, in onboarding, as people sign up and
// join the program). Shown once per account on this phone, straight after
// signing in or creating the account (or at the first launch of this version
// for someone already signed in). It enrols them in Ringo Rewards (every
// account is a member; levels come from /api/app-profile) and asks for
// notifications there. One yes covers service alerts and Rewards updates and
// offers (owner 2026-10-23: "we want to have people click yes on this"); the
// screen says so in plain words above the button, which is the explicit
// consent App Store guideline 4.5.4 asks for, and Help has the switch to
// turn offers off again.
import { useEffect, useState } from 'react';
import { RC } from '../theme';
import { RingoButton } from '../components/Button';
import { TextLink } from '../components/ui';
import { light, type Profile } from '../api/light';
import { useAccount } from '../store/account';
import { Levels } from './RewardsScreen';
import { askPermission, setPushPref, usePush, pushAvailable } from '../lib/push';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { markWelcomeSeen } from '../lib/welcome';

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const acct = useAccount();
  const push = usePush();
  const [rewards, setRewards] = useState<Profile['rewards'] | null>(null);
  const [pioneer, setPioneer] = useState<Profile['pioneer'] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!acct) return;
    let alive = true;
    light.profile(acct.userId, acct.t).then((p) => { if (alive) { setRewards(p.rewards ?? null); setPioneer(p.pioneer ?? null); } }).catch(() => {});
    return () => { alive = false; };
  }, [acct]);

  const finish = () => {
    if (acct) markWelcomeSeen(acct.userId);
    onDone();
  };

  // Answers the tap at once; only the iOS dialog is waited for, never the
  // network (the site hears about the token in the background).
  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    hapticSelection();
    const granted = push.permission === 'granted' || (await askPermission());
    if (granted) {
      hapticNotify('success');
      void setPushPref('offers', true);
    }
    finish();
  };

  const askable = pushAvailable() && push.permission !== 'denied';
  const level = rewards?.level;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: 'calc(env(safe-area-inset-top) + 28px) 20px 24px' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.8, lineHeight: 1.1 }}>
          Welcome to Ringo Rewards
        </h1>
        {level && <p style={{ margin: '8px 0 0', fontFamily: 'var(--font)', fontSize: 15, color: RC.inkMute, lineHeight: 1.5 }}>You're {level.name}.</p>}

        {pioneer && <PioneerCard pioneer={pioneer} />}

        {askable && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: RC.gradSoft }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: RC.ink, letterSpacing: -0.3 }}>Stay in the loop</div>
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {['Your eSIM is ready', 'Data running low', 'New Rewards level', 'Member prices and offers'].map((t) => (
                <li key={t} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontFamily: 'var(--font)', fontSize: 14.5, color: RC.ink, lineHeight: 1.4 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ marginTop: 2, flexShrink: 0 }}><path d="M3 8.5l3.2 3L13 4.5" stroke="hsl(142,60%,42%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.45 }}>Turn offers off any time in Help.</div>
          </div>
        )}

        {rewards && <div style={{ marginTop: 22 }}><Levels rewards={rewards} /></div>}
      </div>

      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom) + 16px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {askable ? (
          <>
            <RingoButton disabled={busy} onClick={() => void turnOn()}>{busy ? 'Turning on…' : 'Yes, keep me updated'}</RingoButton>
            <TextLink onClick={() => { hapticSelection(); finish(); }}>Not now</TextLink>
          </>
        ) : (
          <RingoButton onClick={finish}>Start exploring</RingoButton>
        )}
      </div>
    </div>
  );
}

// A Pioneer's own reward, in the words the website's dashboard uses for it
// (owner 2026-10-23: "also pioneer here, they get a special reward"). The
// terms are the ones already sold: founding pricing locked for a backing or a
// referral spot, the launch credit for a Global plan. Never the Pioneer number.
function PioneerCard({ pioneer }: { pioneer: NonNullable<Profile['pioneer']> }) {
  const line = pioneer.kind === 'global'
    ? `€${pioneer.credit_eur || 5} off your first Ringo bill.`
    : pioneer.kind === 'promoter'
      ? 'Founding pricing locked in.'
      : 'Founding pricing locked in.';
  return (
    <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: RC.grad, color: '#fff', boxShadow: '0 12px 30px -14px rgba(249,60,31,0.6)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>You're a Ringo {pioneer.tier}</div>
      <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 14.5, lineHeight: 1.5 }}>{line}</div>
    </div>
  );
}
