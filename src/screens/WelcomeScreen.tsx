// WelcomeScreen: the Ringo Rewards welcome for a new member, shown once per
// account on this phone, straight after signing in or creating the account
// (or at the first launch of this version for someone already signed in).
// Every account is a member; levels come from /api/app-profile.
//
// 2026-10-24: the notification ask is no longer here (owner: it "comes
// twice" and "should not be part of the Rewards page"). The app asks once,
// on its own sheet, outside Rewards; this screen only welcomes, shows a
// Pioneer their golden avatar and reward, and the five levels, then one
// "Start exploring" button.
import { useEffect, useState } from 'react';
import { RC, TYPE, typeFor, cardSurface, GRAD_PREMIUM } from '../theme';
import { RingoButton } from '../components/Button';
import { Wordmark } from '../components/ui';
import { light, type Profile } from '../api/light';
import { useAccount } from '../store/account';
import { useLayout, twoColumn, actionWidth, type Layout } from '../lib/layout';
import { RingoAvatar } from '../components/Avatar';
import { pioneerTitle, pioneerPerk } from '../components/profile/format';
import { hapticSelection } from '../lib/haptics';
import { markWelcomeSeen } from '../lib/welcome';
import { Levels, LevelPhoto } from './RewardsScreen';

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const l = useLayout();
  const acct = useAccount();
  const [profile, setProfile] = useState<Profile | null>(null);
  const userId = acct?.userId, t = acct?.t;

  useEffect(() => {
    if (!userId || !t) return;
    let alive = true;
    light.profile(userId, t).then((p) => { if (alive) setProfile(p); }).catch(() => { /* the welcome works without it */ });
    return () => { alive = false; };
  }, [userId, t]);

  const finish = () => {
    hapticSelection();
    if (userId) markWelcomeSeen(userId);
    onDone();
  };

  const rewards = profile?.rewards ?? null;
  const pioneer = profile?.pioneer ?? null;
  const level = rewards?.level ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: `max(54px, calc(env(safe-area-inset-top, 0px) + 16px)) ${l.gutter}px 24px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: l.sectionGap }}>
          <div>
            <Wordmark />
            <h1 style={{ margin: '16px 0 0', ...typeFor('display', l.size), color: RC.ink }}>Welcome to Ringo Rewards</h1>
            <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>
              {level ? `You're ${level.name}. Every destination moves you up.` : 'Every destination you book moves you up.'}
            </p>
          </div>

          <div style={pioneer ? { ...twoColumn(l, 1, 1), alignItems: 'stretch' } : undefined}>
            <section style={{ ...cardSurface(), overflow: 'hidden' }}>
              <LevelPhoto id={level?.id || 'bronze'} aspect={l.isWide ? (pioneer ? '4 / 3' : '21 / 9') : '16 / 9'} eager>
                <div style={{ ...typeFor('hero', l.size) }}>{level ? level.name : 'Your first trip'}</div>
                <div style={{ marginTop: 4, ...TYPE.small, fontWeight: 700 }}>Up to 15% off plans</div>
              </LevelPhoto>
            </section>
            {pioneer ? <PioneerCard l={l} pioneer={pioneer} seed={profile?.email || acct?.email || userId || 'ringo'} userId={userId ?? null} level={level?.id ?? null} /> : null}
          </div>

          {rewards && rewards.levels.length > 0 && <Levels rewards={rewards} />}
        </div>
      </div>

      <div style={{ padding: `12px ${l.gutter}px calc(env(safe-area-inset-bottom, 0px) + 16px)` }}>
        <div style={actionWidth(l)}>
          <RingoButton onClick={finish}>Start exploring</RingoButton>
        </div>
      </div>
    </div>
  );
}

// A Pioneer's own reward, in the words the website's dashboard uses for it,
// next to their golden avatar. The terms are the ones already sold: founding
// pricing locked for a backing or a referral spot, the launch credit for a
// Global plan. Never the Pioneer number.
function PioneerCard({ l, pioneer, seed, userId, level }: { l: Layout; pioneer: NonNullable<Profile['pioneer']>; seed: string; userId: string | null; level: string | null }) {
  return (
    <section
      aria-label={pioneerTitle(pioneer)}
      style={{
        borderRadius: 24, padding: l.cardPad, background: GRAD_PREMIUM, color: '#fff', boxShadow: '0 12px 30px -14px rgba(26,15,46,0.6)',
        display: 'flex', flexDirection: l.isWide ? 'column' : 'row', alignItems: l.isWide ? 'flex-start' : 'center', justifyContent: 'center', gap: 16,
      }}
    >
      <RingoAvatar seed={seed} userId={userId} level={level} size={l.isWide ? 104 : 80} pioneer />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...TYPE.h1, fontSize: l.isCover ? 20 : 22, color: '#fff' }}>You're a {pioneerTitle(pioneer)}</div>
        <div style={{ marginTop: 6, ...TYPE.small, fontSize: 16, color: 'rgba(255,255,255,0.86)' }}>{pioneerPerk(pioneer)}. Your golden avatar is yours for good.</div>
      </div>
    </section>
  );
}
