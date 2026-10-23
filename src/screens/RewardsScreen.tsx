// RewardsScreen: Ringo Rewards (owner 2026-10-23). Five levels earned by the
// destinations a member has booked, Bronze to Aurora, each with its own
// travel photograph; the member's avatar (their Ringo cowboy or their own
// photo) in their level's colour; and the travel badges. Laid out the way
// ringoesim.com lays out a page: a plain heading and one line, photo-led
// white cards, green ticks, no labels in boxes. Everything is read from
// /api/app-profile; the photo stays on the phone.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RC, RADIUS, SHADOW_CARD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { RingoButton } from '../components/Button';
import { BackBtn } from '../components/ui';
import { light, type Profile, type RewardLevel } from '../api/light';
import { useAccount } from '../store/account';
import { useLiveTick } from '../store/live';
import { RingoAvatar, AvatarPhotoControls } from '../components/Avatar';
import { BadgeGrid, BadgeEmpty, BadgeSkeleton } from '../components/profile/BadgeGrid';
import { TravelMap } from '../components/profile/TravelMap';
import { monthYear, levelColor } from '../components/profile/format';

const PHOTO = (id: string) => `${import.meta.env.BASE_URL}img/rewards/${id}.jpg`;
const destinations = (n: number) => `${n} ${n === 1 ? 'destination' : 'destinations'}`;

function Heading({ title, line }: { title: string; line?: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.2 }}>{title}</h2>
      {line && <p style={{ margin: '4px 0 0', fontFamily: 'var(--font)', fontSize: 14.5, color: RC.inkMute, lineHeight: 1.5 }}>{line}</p>}
    </div>
  );
}

// A photograph with the level's name on it, the way the site's destination cards carry theirs.
function LevelPhoto({ level, height, children }: { level: RewardLevel; height: number; children?: ReactNode }) {
  return (
    <div style={{ position: 'relative', height, background: levelColor(level.id) }}>
      <img src={PHOTO(level.id)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0) 35%, rgba(20,10,30,0.72) 100%)' }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 12, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{children}</div>
    </div>
  );
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontFamily: 'var(--font)', fontSize: 14, color: RC.ink, lineHeight: 1.45 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ marginTop: 2, flexShrink: 0 }}><path d="M3 8.5l3.2 3L13 4.5" stroke="hsl(142,60%,42%)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span>{children}</span>
    </li>
  );
}

// A Pioneer keeps the title for good (owner 2026-10-23: "he gets permanent
// pioneer status"); it sits beside the Rewards level, never instead of it.
function Member({ userId, email, since, level, pioneer }: { userId: string; email: string; since: string | null; level: RewardLevel | null; pioneer?: Profile['pioneer'] }) {
  const month = monthYear(since);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <RingoAvatar seed={email || userId} userId={userId} level={level?.id ?? null} size={80} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {pioneer && <div style={{ marginBottom: 2, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 800, color: RC.inkStrong }}>Ringo {pioneer.tier}</div>}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: RC.ink, letterSpacing: -0.4 }}>{level ? `${level.name} member` : 'Ringo member'}</div>
        <div title={email} style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}{month ? ` · since ${month}` : ''}</div>
        <div style={{ marginTop: 6 }}><AvatarPhotoControls userId={userId} /></div>
      </div>
    </div>
  );
}

function Current({ rewards }: { rewards: NonNullable<Profile['rewards']> }) {
  const { level, next, destinations: n, levels } = rewards;
  const shown = level || levels[0];
  const nextLevel = next ? levels.find((l) => l.id === next.id) : null;
  const from = level ? level.min : 0;
  const pct = next ? Math.max(0, Math.min(100, ((n - from) / (next.min - from)) * 100)) : 100;
  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <LevelPhoto level={shown} height={180}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.05 }}>{level ? level.name : 'Your first trip'}</div>
        <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600 }}>{destinations(n)} booked</div>
      </LevelPhoto>
      <div style={{ padding: 16 }}>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={next ? `Progress to ${next.name}` : 'Top level'}
          style={{ height: 8, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, next ? 4 : 100)}%`, height: '100%', borderRadius: RADIUS.pill, background: RC.grad, transition: 'width .8s ease' }} />
        </div>
        <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 14.5, color: RC.ink, lineHeight: 1.5 }}>
          {next
            ? <><b>{next.to_go === 1 ? 'One more destination' : `${next.to_go} more destinations`}</b> to {next.name}{nextLevel?.perks[0] ? `: ${lower(nextLevel.perks[0])}.` : '.'}</>
            : <b>You reached the top. Thank you for travelling with Ringo.</b>}
        </div>
      </div>
    </div>
  );
}

function lower(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }

const cardStyle = { background: RC.paper, borderRadius: 24, border: `1.5px solid ${RC.line}`, boxShadow: SHADOW_CARD } as const;

export function Levels({ rewards }: { rewards: NonNullable<Profile['rewards']> }) {
  // Opens on the member's own level rather than always on Bronze.
  const row = useRef<HTMLDivElement>(null);
  const current = rewards.level?.id;
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>(`[data-level="${current}"]`);
    if (row.current && el) row.current.scrollLeft = el.offsetLeft - 20;
  }, [current]);
  return (
    <div ref={row} className="no-bar" style={{ position: 'relative', display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingInline: 20, margin: '0 -20px', padding: '2px 20px 6px' }}>
      {rewards.levels.map((l) => {
        const here = rewards.level?.id === l.id;
        const reached = rewards.destinations >= l.min;
        return (
          <article key={l.id} data-level={l.id} style={{ ...cardStyle, flex: '0 0 76%', scrollSnapAlign: 'start', overflow: 'hidden', borderColor: here ? levelColor(l.id) : RC.line }}>
            <LevelPhoto level={l} height={130}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: -0.6 }}>{l.name}</div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600 }}>From {destinations(l.min)}</div>
            </LevelPhoto>
            <div style={{ padding: '14px 16px 16px' }}>
              {(here || reached) && <div style={{ marginBottom: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 800, color: here ? RC.inkStrong : 'hsl(142,60%,36%)' }}>{here ? 'Your level' : 'Reached'}</div>}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
                {l.perks.map((p) => <Tick key={p}>{p}</Tick>)}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// Global's own reward: the month gets cheaper the longer it is kept.
function GlobalTenure({ rewards }: { rewards: NonNullable<Profile['rewards']> }) {
  const months = rewards.global_months || 0;
  return (
    <>
      <Heading title="Global gets cheaper" line={months ? `You have kept Global ${months} ${months === 1 ? 'month' : 'months'}.` : 'The longer you keep Global, the less each month costs.'} />
      <RingoCard>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {(rewards.global_tenure || []).map((t) => (
            <Tick key={t.months}><b>{t.pct}% off</b> every month after {t.months} paid months{months >= t.months ? ', yours now' : ''}</Tick>
          ))}
        </ul>
      </RingoCard>
    </>
  );
}

export function RewardsScreen({ onBack, onBrowse, onLogin }: { onBack?: () => void; onBrowse: () => void; onLogin: () => void }) {
  const acct = useAccount();
  const tick = useLiveTick();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const userId = acct?.userId, t = acct?.t;
  useEffect(() => {
    if (!userId || !t) return;
    let alive = true;
    light.profile(userId, t)
      .then((p) => { if (alive) { setProfile(p); setErr(null); } })
      .catch((e) => { if (alive) setErr((e as Error).message || 'Could not load your rewards.'); });
    return () => { alive = false; };
  }, [userId, t, tick]);

  const rewards = profile?.rewards;
  const badges = profile?.badges || [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Rewards" leading={onBack ? <BackBtn onClick={onBack} /> : null} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 130px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, alignContent: 'start' }}>
          {!acct ? (
            <>
              <div style={{ ...cardStyle, overflow: 'hidden' }}>
                <LevelPhoto level={{ id: 'aurora', name: 'Aurora', min: 10, discount_pct: 15, free_esims_per_year: 1, perks: [] }} height={190}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -0.8 }}>Ringo Rewards</div>
                </LevelPhoto>
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 15, color: RC.ink, lineHeight: 1.5 }}>Every trip moves you up. Up to 15% off plans.</div>
                  <div style={{ marginTop: 14 }}><RingoButton onClick={onLogin}>Sign in</RingoButton></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Member userId={acct.userId} email={profile?.email || acct.email || ''} since={profile?.member_since ?? null} level={rewards?.level ?? null} pioneer={profile?.pioneer ?? null} />
              {err && !profile && <RingoCard><div role="alert" style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: RC.error, fontWeight: 600 }}>{err}</div></RingoCard>}
              {/* Where they have travelled comes first (owner 2026-10-23). */}
              <Heading title="Where you've been" line={badges.length ? destinations(badges.length) : undefined} />
              {err && !profile ? null : !profile ? <BadgeSkeleton /> : badges.length === 0 ? <BadgeEmpty onBrowse={onBrowse} /> : (
                <>
                  <TravelMap badges={badges} />
                  <BadgeGrid badges={badges} />
                </>
              )}

              {rewards ? <Current rewards={rewards} /> : !err && <div aria-hidden style={{ height: 260, borderRadius: 24, background: RC.cream }} />}

              {rewards && (
                <>
                  <Heading title="Your rewards" />
                  <Levels rewards={rewards} />
                  {rewards.global_tenure && rewards.global_tenure.length > 0 && <GlobalTenure rewards={rewards} />}
                </>
              )}
              {badges.length > 0 && <RingoButton variant="soft" onClick={onBrowse}>Book your next destination</RingoButton>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
