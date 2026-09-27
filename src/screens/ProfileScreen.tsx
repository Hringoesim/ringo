// ProfileScreen: who is signed in and where their eSIMs have taken them
// (owner 2026-09-17: "a profile with badges of where he or she has
// travelled"). From the top: the account (initial, address, since when),
// Ringo status on the plum night sky (the tier, the way to the next one and
// the whole ladder), the counts once there is something to count, and one
// photo tile per destination connected in. Everything comes from
// ringoesim.com (/api/app-profile); nothing is stored on the phone but what
// the account already holds. The status ladder is recognition and access
// only, never a discount, credit or free data. Deleting the account lives in
// Help.
import { useEffect, useState } from 'react';
import { RC, RADIUS, TAP } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { RingoButton } from '../components/Button';
import { BackBtn, SectionTitle } from '../components/ui';
import { light, type Profile } from '../api/light';
import { useAccount } from '../store/account';
import { useLiveTick } from '../store/live';
import { IdentityCard } from '../components/profile/IdentityCard';
import { StatusCard } from '../components/profile/StatusCard';
import { BadgeGrid, BadgeEmpty, BadgeSkeleton } from '../components/profile/BadgeGrid';

function Stats({ stats }: { stats: Profile['stats'] }) {
  // Only what there is: a zero says nothing, and three zeros hide the row.
  const items = [
    { n: stats.destinations, l: stats.destinations === 1 ? 'destination' : 'destinations' },
    { n: stats.plans, l: stats.plans === 1 ? 'eSIM plan' : 'eSIM plans' },
    { n: stats.countries_reachable, l: 'countries covered' },
  ].filter((s) => s.n > 0);
  if (!items.length) return null;
  return (
    <RingoCard padding={0} style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((s, i) => (
        <div key={s.l} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: i ? `1px solid ${RC.line}` : 'none' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>{s.n}</div>
          <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>{s.l}</div>
        </div>
      ))}
    </RingoCard>
  );
}

function StoreLink({ onClick }: { onClick: () => void }) {
  return (
    <button className="press" onClick={onClick} style={{ width: '100%', minHeight: TAP + 12, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: RC.paper, border: `1px solid ${RC.line}`, borderRadius: RADIUS.control, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink, textAlign: 'left' }}>
      <span>Browse destinations</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 2l6 6-6 6" stroke={RC.inkStrong} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function ProfileScreen({ onBack, onBrowse, onLogin }: { onBack: () => void; onBrowse: () => void; onLogin: () => void }) {
  const acct = useAccount();
  const tick = useLiveTick();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const userId = acct?.userId, t = acct?.t;
  // Asks again every time the app comes back to the foreground. The last
  // profile stays on screen while the fresh one loads, and a failed refresh
  // keeps it rather than blanking the page.
  useEffect(() => {
    if (!userId || !t) return;
    let alive = true;
    light.profile(userId, t)
      .then((p) => { if (alive) { setProfile(p); setErr(null); } })
      .catch((e) => { if (alive) setErr((e as Error).message || 'Could not load your profile.'); });
    return () => { alive = false; };
  }, [userId, t, tick]);

  const badges = profile?.badges || [];
  const email = profile?.email || acct?.email || '';
  const tier = profile?.loyalty?.tier;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Profile" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 40px' }}>
        {/* A grid, not a flex column: its rows never shrink below their content. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, alignContent: 'start' }}>
        {!acct ? (
          <RingoCard>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>Your travel badges live here</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>Sign in to see every destination your Ringo eSIMs have taken you to.</div>
            <div style={{ marginTop: 14 }}><RingoButton onClick={onLogin}>Sign in</RingoButton></div>
          </RingoCard>
        ) : (
          <>
            <IdentityCard email={email} memberSince={profile?.member_since ?? null} tierId={tier?.id ?? null} tierName={tier?.name ?? null} />

            {profile?.loyalty ? <StatusCard loyalty={profile.loyalty} />
              : !profile && !err ? <div aria-hidden style={{ height: 236, borderRadius: RADIUS.card, background: RC.cream, border: `1px solid ${RC.line}` }} /> : null}

            {profile && <Stats stats={profile.stats} />}

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
                <SectionTitle>{badges.length ? `Travel badges · ${badges.length}` : 'Travel badges'}</SectionTitle>
                {badges.length > 0 && <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>Date first connected</div>}
              </div>
              {err && !profile ? (
                <RingoCard><div role="alert" style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: RC.error, fontWeight: 600 }}>{err}</div></RingoCard>
              ) : !profile ? (
                <BadgeSkeleton />
              ) : badges.length === 0 ? (
                <BadgeEmpty onBrowse={onBrowse} />
              ) : (
                <BadgeGrid badges={badges} />
              )}
            </div>

            {badges.length > 0 && <StoreLink onClick={onBrowse} />}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
