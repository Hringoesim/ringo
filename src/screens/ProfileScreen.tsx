// ProfileScreen — who is logged in and where their eSIMs have taken them
// (owner 2026-09-17: "a profile with badges of where he or she has
// travelled"). A badge is a destination the account held a paid eSIM for:
// the country's flag or the region, how many plans, since when. Badges come
// from ringoesim.com (/api/app-profile), which reads the account's eSIM
// rows; nothing is stored on the phone but what the account already holds.
import { useEffect, useState } from 'react';
import { RC, RADIUS } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { RingoButton } from '../components/Button';
import { BackBtn, SectionTitle } from '../components/ui';
import { light, type Profile, type TravelBadge } from '../api/light';
import { useAccount } from '../store/account';
import { pictureFor, destinationById } from '../data/destinations';

const REGION_MARK: Record<string, string> = { europe: '🇪🇺', asia: '🌏', latam: '🌎', 'middle-east': '🕌', global: '🌍' };

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function Badge({ b }: { b: TravelBadge }) {
  const listed = Boolean(destinationById(b.destination));
  const mark = b.flag || REGION_MARK[b.destination] || '🌐';
  return (
    <div style={{ position: 'relative', borderRadius: RADIUS.lg, overflow: 'hidden', background: RC.cream, aspectRatio: '1 / 1.15', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      {listed && <img src={pictureFor(b.destination)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,8,16,0) 30%, rgba(10,8,16,0.82) 100%)' }} />
      <div style={{ position: 'absolute', top: 10, left: 10, width: 40, height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }} aria-hidden>{mark}</div>
      {b.active && <div style={{ position: 'absolute', top: 14, right: 10, padding: '3px 8px', borderRadius: 999, background: RC.grad, color: '#fff', fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3 }}>ACTIVE</div>}
      <div style={{ position: 'relative', padding: '10px 12px 12px', color: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>{b.label}</div>
        <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 12, opacity: 0.85 }}>
          {b.plans === 1 ? '1 plan' : `${b.plans} plans`}{b.first_at ? ` · since ${when(b.first_at)}` : ''}
        </div>
      </div>
    </div>
  );
}

export function ProfileScreen({ onBack, onBrowse, onLogin }: { onBack: () => void; onBrowse: () => void; onLogin: () => void }) {
  const acct = useAccount();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const userId = acct?.userId, t = acct?.t;
  useEffect(() => {
    if (!userId || !t) return;
    let alive = true;
    light.profile(userId, t).then((p) => { if (alive) setProfile(p); }).catch((e) => { if (alive) setErr((e as Error).message || 'Could not load your profile.'); });
    return () => { alive = false; };
  }, [userId, t]);

  const badges = profile?.badges || [];
  const initial = (profile?.email || acct?.email || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Profile" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
        {!acct ? (
          <RingoCard>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>Your travel badges live here</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>Log in to see every destination your Ringo eSIMs have taken you to.</div>
            <div style={{ marginTop: 14 }}><RingoButton onClick={onLogin}>Log in</RingoButton></div>
          </RingoCard>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0 18px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: RC.grad, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }} aria-hidden>{initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: RC.ink, letterSpacing: -0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email || acct.email}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute }}>{profile?.member_since ? `Ringo traveller since ${when(profile.member_since)}` : 'Ringo traveller'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
              {[
                { n: profile?.stats.destinations ?? '–', l: 'destinations' },
                { n: profile?.stats.plans ?? '–', l: 'eSIM plans' },
                { n: profile?.stats.countries_reachable ?? '–', l: 'countries covered' },
              ].map((s) => (
                <RingoCard key={s.l} style={{ padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.ink, letterSpacing: -0.6 }}>{s.n}</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute }}>{s.l}</div>
                </RingoCard>
              ))}
            </div>

            <SectionTitle>Travel badges</SectionTitle>
            {err ? (
              <RingoCard><div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: '#A12C2C', fontWeight: 600 }}>{err}</div></RingoCard>
            ) : !profile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[0, 1].map((i) => <div key={i} style={{ borderRadius: RADIUS.lg, background: RC.cream, aspectRatio: '1 / 1.15' }} />)}
              </div>
            ) : badges.length === 0 ? (
              <RingoCard>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: RC.ink, letterSpacing: -0.3 }}>No badges yet</div>
                <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>Your first eSIM earns the first one. Every destination you connect in gets its own badge.</div>
                <div style={{ marginTop: 14 }}><RingoButton onClick={onBrowse}>Browse eSIMs</RingoButton></div>
              </RingoCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {badges.map((b) => <Badge key={b.destination} b={b} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
