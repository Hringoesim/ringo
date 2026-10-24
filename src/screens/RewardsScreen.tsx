// RewardsScreen: Ringo Rewards (owner 2026-10-23). Five levels earned by the
// destinations a member has booked, Bronze to Aurora, each with its own
// travel photograph; the member's avatar (their Ringo cowboy or their own
// photo) in their level's colour; and the travel badges. Laid out the way
// ringoesim.com lays out a page: a plain heading and one line, photo-led
// white cards, green ticks, no labels in boxes. Everything is read from
// /api/app-profile; the photo stays on the phone.
//
// 2026-10-24: no notification ask here, ever (the owner took it out of
// Rewards). A Ringo Pioneer gets the golden avatar, a gold "Ringo Pioneer"
// mark under the name and the Pioneer badge first among the travel badges.
// Wide screens (iPhone Duo inner display): member and level side by side,
// level cards in a grid instead of a sideways scroller.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RC, RADIUS, TYPE, typeFor, cardSurface, SITE_GRAD, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { RingoButton } from '../components/Button';
import { SaturnWorld } from '../components/SaturnWorld';
import { BackBtn, ScreenTitle, SectionHead, TickList, PioneerBadge, ErrorBox } from '../components/ui';
import { light, type Profile, type RewardLevel } from '../api/light';
import { useAccount } from '../store/account';
import { useLiveTick } from '../store/live';
import { useLayout, twoColumn, cardGrid, TABBAR_CLEARANCE, type Layout } from '../lib/layout';
import { RingoAvatar, AvatarPhotoControls } from '../components/Avatar';
import { BadgeGrid, BadgeEmpty, BadgeSkeleton } from '../components/profile/BadgeGrid';
import { TravelMap } from '../components/profile/TravelMap';
import { monthYear, levelColor, pioneerTitle } from '../components/profile/format';
import { isLead, isPioneer, placeFrom, fmt } from '../lib/waitlist';

type Rewards = NonNullable<Profile['rewards']>;
type Pioneer = NonNullable<Profile['pioneer']>;

const PHOTO = (id: string) => `${import.meta.env.BASE_URL}img/rewards/${id}.jpg`;
const destinations = (n: number) => `${n} ${n === 1 ? 'destination' : 'destinations'}`;
const PHOTO_IDS = new Set(['bronze', 'silver', 'gold', 'diamond', 'aurora']);

// A photograph with the level's name on it, the way the site's destination cards carry theirs.
export function LevelPhoto({ id, aspect, children, eager = false }: { id: string; aspect: string; children?: ReactNode; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div style={{ position: 'relative', aspectRatio: aspect, background: levelColor(id), overflow: 'hidden' }}>
      {PHOTO_IDS.has(id) && !broken && (
        <img src={PHOTO(id)} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setBroken(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff', textShadow: PHOTO_TEXT_SHADOW }}>{children}</div>
    </div>
  );
}

// A Pioneer keeps the title for good (owner 2026-10-23: "he gets permanent
// pioneer status"); it sits beside the Rewards level, never instead of it.
function Member({ l, userId, email, since, level, pioneer }: { l: Layout; userId: string; email: string; since: string | null; level: RewardLevel | null; pioneer: Pioneer | null }) {
  const month = monthYear(since);
  const size = l.isWide ? 104 : l.isCover ? 80 : 88;
  return (
    <section aria-label="Your membership" style={{ ...cardSurface(), padding: l.cardPad, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <RingoAvatar seed={email || userId} userId={userId} level={level?.id ?? null} size={size} pioneer={!!pioneer} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPE.h1, fontSize: l.isCover ? 20 : 22, color: RC.ink }}>{level ? `${level.name} member` : 'Ringo member'}</div>
          {pioneer && <PioneerBadge tone="gold" label={pioneerTitle(pioneer)} style={{ marginTop: 8, maxWidth: '100%', whiteSpace: 'normal' }} />}
          {month && <div style={{ marginTop: 8, ...TYPE.caption, color: RC.inkMute }}>Member since {month}</div>}
        </div>
      </div>
      {email && <div title={email} style={{ ...TYPE.small, color: RC.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
      <AvatarPhotoControls userId={userId} pioneer={!!pioneer} />
    </section>
  );
}

function Current({ l, rewards, credit }: { l: Layout; rewards: Rewards; credit?: Profile['credit'] }) {
  const { level, next, destinations: n, levels } = rewards;
  const shownId = level?.id || levels[0]?.id || 'bronze';
  const nextLevel = next ? levels.find((x) => x.id === next.id) : null;
  const from = level ? level.min : 0;
  const span = next ? Math.max(1, next.min - from) : 1;
  const pct = next ? Math.max(0, Math.min(100, ((n - from) / span) * 100)) : 100;
  return (
    <section aria-label="Your level" style={{ ...cardSurface(), overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <LevelPhoto id={shownId} aspect="16 / 9" eager>
        <div style={{ ...typeFor('hero', l.size) }}>{level ? level.name : 'Your first trip'}</div>
        <div style={{ marginTop: 4, ...TYPE.small, fontWeight: 700 }}>{destinations(n)} booked</div>
      </LevelPhoto>
      <div style={{ padding: l.cardPad }}>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={next ? `Progress to ${next.name}` : 'Top level'}
          style={{ height: 10, borderRadius: RADIUS.pill, background: RC.cream, border: `1px solid ${RC.line}`, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, next ? 4 : 100)}%`, height: '100%', borderRadius: RADIUS.pill, background: SITE_GRAD, transition: 'width .8s ease' }} />
        </div>
        <p style={{ margin: '12px 0 0', ...TYPE.body, color: RC.ink }}>
          {next
            ? <><b>{next.to_go === 1 ? 'One more destination' : `${next.to_go} more destinations`}</b> to {next.name}{nextLevel?.perks[0] ? `: ${lower(nextLevel.perks[0])}.` : '.'}</>
            : <b>You reached the top. Thank you for travelling with Ringo.</b>}
        </p>
        {credit && (
          <div aria-label="Ringo credit" style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${RC.line}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ ...TYPE.small, color: RC.ink2 }}>Ringo credit</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink }}>{`€${(credit.balance_cents / 100).toFixed(2)}`}</div>
            </div>
            {credit.pct > 0 && <div style={{ ...TYPE.small, fontWeight: 700, color: RC.ink2 }}>{`${credit.pct}% back on every plan`}</div>}
          </div>
        )}
      </div>
    </section>
  );
}

function lower(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }

function LevelCard({ l, level, here, reached, scroller }: { l: Layout; level: RewardLevel; here: boolean; reached: boolean; scroller: boolean }) {
  return (
    <article
      data-level={level.id}
      aria-current={here ? 'true' : undefined}
      style={{
        ...cardSurface(), overflow: 'hidden', display: 'flex', flexDirection: 'column',
        borderColor: here ? levelColor(level.id) : RC.line, borderWidth: here ? 2.5 : 1.5,
        ...(scroller ? { flex: `0 0 ${l.isCover ? 84 : 78}%`, scrollSnapAlign: 'start' } : {}),
      }}
    >
      <LevelPhoto id={level.id} aspect="16 / 9">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{level.name}</div>
        <div style={{ marginTop: 2, ...TYPE.small, fontWeight: 700 }}>From {destinations(level.min)}</div>
      </LevelPhoto>
      <div style={{ padding: '14px 16px 16px', flex: 1 }}>
        {(here || reached) && (
          <div style={{ marginBottom: 10, ...TYPE.small, fontWeight: 800, color: here ? RC.orangeInk : RC.success }}>
            {here ? 'Your level' : 'Reached'}
          </div>
        )}
        <TickList items={level.perks} size={15} gap={8} />
      </div>
    </article>
  );
}

export function Levels({ rewards }: { rewards: Rewards }) {
  const l = useLayout();
  const row = useRef<HTMLDivElement>(null);
  const current = rewards.level?.id;
  const scroller = !l.isWide;
  // Opens on the member's own level rather than always on Bronze.
  useEffect(() => {
    if (!scroller || !row.current) return;
    const el = row.current.querySelector<HTMLElement>(`[data-level="${current}"]`);
    if (el) row.current.scrollLeft = Math.max(0, el.offsetLeft - l.gutter);
  }, [current, scroller, l.gutter]);
  const cards = rewards.levels.map((lv) => (
    <LevelCard key={lv.id} l={l} level={lv} here={current === lv.id} reached={rewards.destinations >= lv.min} scroller={scroller} />
  ));
  if (!scroller) return <div style={{ ...cardGrid(l, { min: 200 }), alignItems: 'stretch' }}>{cards}</div>;
  return (
    <div
      ref={row}
      className="no-bar"
      role="region"
      aria-label="Rewards levels"
      style={{ position: 'relative', display: 'flex', gap: l.cardGap, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollPaddingInline: l.gutter, margin: `0 -${l.gutter}px`, padding: `2px ${l.gutter}px 8px` }}
    >
      {cards}
    </div>
  );
}

// Global's own reward: the month gets cheaper the longer it is kept.
function GlobalTenure({ l, rewards }: { l: Layout; rewards: Rewards }) {
  const months = rewards.global_months || 0;
  return (
    <section>
      <SectionHead
        title="Global gets cheaper"
        sub={months ? `You have kept Global ${months} ${months === 1 ? 'month' : 'months'}.` : 'The longer you keep Global, the less each month costs.'}
      />
      <div style={{ ...twoColumn(l, 1, 1), alignItems: 'stretch' }}>
        <div style={{ ...cardSurface(), overflow: 'hidden' }}>
          <PhotoBanner id="global" />
        </div>
        <RingoCard padding={l.cardPad}>
          <TickList
            items={(rewards.global_tenure || []).map((t) => (
              <><b style={{ color: RC.ink }}>{t.pct}% off</b> every month after {t.months} paid months{months >= t.months ? ', yours now' : ''}</>
            ))}
          />
        </RingoCard>
      </div>
    </section>
  );
}

// The site's Global photo (bundled), with the sunset sky behind it.
function PhotoBanner({ id }: { id: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div style={{ position: 'relative', aspectRatio: '16 / 9', height: '100%', minHeight: 140, background: SITE_GRAD }}>
      {!broken && <img src={`${import.meta.env.BASE_URL}img/destinations/${id}.jpg`} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, color: '#fff', textShadow: PHOTO_TEXT_SHADOW, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Global</div>
    </div>
  );
}

// The full Ringo service's waitlist (own number ported, every country; not
// launched), at the top of Rewards. Separate from Ringo Light, the eSIMs.
function WaitlistCard({ l, onOpen }: { l: Layout; onOpen: () => void }) {
  const acct = useAccount();
  const tick = useLiveTick();
  const [line, setLine] = useState<string>('Join the waitlist');
  const userId = acct?.userId, t = acct?.t;
  useEffect(() => {
    setLine('Join the waitlist');
    if (!userId || !t) return;
    let alive = true;
    light.dashboard(userId, t)
      .then((d) => {
        if (!alive) return;
        const u = d.user;
        if (!u || isLead(u.status)) { setLine('Join the waitlist'); return; }
        if (isPioneer(u.status)) { setLine("You're a Ringo Pioneer"); return; }
        const { ahead } = placeFrom(u);
        setLine(ahead == null ? "You're on the waitlist" : `You're #${fmt(ahead + 1)} in line`);
      })
      .catch(() => { /* the card still opens the waitlist */ });
    return () => { alive = false; };
  }, [userId, t, tick]);
  // The welcome screen's globe on the night sky, small, beside the promise.
  const globe = l.isWide ? 132 : l.isCover ? 92 : 108;
  return (
    <button
      type="button"
      className="card-press"
      onClick={onOpen}
      aria-label={`Ringo waitlist. ${line}`}
      style={{
        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', padding: `${l.cardPad}px ${l.cardPad}px ${l.cardPad}px ${l.cardPad - 4}px`,
        position: 'relative', overflow: 'hidden', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 14,
        background: 'radial-gradient(120% 90% at 20% 0%, #3B1F5E 0%, #1A0F2E 62%), #1A0F2E',
        boxShadow: '0 18px 36px -20px rgba(88,24,72,0.7)', font: 'inherit',
      }}
    >
      <span aria-hidden style={{ position: 'absolute', left: '-15%', right: '-15%', bottom: '-70%', height: '110%', borderRadius: '50%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,122,82,0.45) 0%, rgba(255,66,161,0.22) 42%, rgba(134,82,224,0) 72%)' }} />
      <span aria-hidden style={{ position: 'relative', flexShrink: 0, animation: 'ringoGlobeFloat 6s ease-in-out infinite' }}>
        <SaturnWorld size={globe} />
      </span>
      <span style={{ position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: l.isCover ? 19 : 21, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#FFFFFF' }}>Ringo, one number for every country</span>
        <span style={{ ...TYPE.small, color: 'rgba(255,255,255,0.86)' }}>Your own number on one plan that works everywhere.</span>
        <span style={{ alignSelf: 'flex-start', marginTop: 2, padding: '6px 12px', borderRadius: RADIUS.pill, background: '#FFFFFF', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 800, color: '#1A0F2E' }}>{line}</span>
      </span>
    </button>
  );
}

function SignedOut({ l, onLogin }: { l: Layout; onLogin: () => void }) {
  return (
    <section style={{ ...cardSurface(), overflow: 'hidden' }}>
      <LevelPhoto id="aurora" aspect={l.isWide ? '21 / 9' : '4 / 3'} eager>
        <div style={{ ...typeFor('hero', l.size) }}>Ringo Rewards</div>
      </LevelPhoto>
      <div style={{ padding: l.cardPad }}>
        <p style={{ margin: 0, ...TYPE.body, color: RC.ink2 }}>Every trip moves you up. Up to 15% off plans.</p>
        <div style={{ marginTop: 16 }}><RingoButton capped onClick={onLogin}>Sign in</RingoButton></div>
      </div>
    </section>
  );
}

export function RewardsScreen({ onBack, onBrowse, onLogin, onWaitlist }: { onBack?: () => void; onBrowse: () => void; onLogin: () => void; onWaitlist?: () => void }) {
  const l = useLayout();
  const acct = useAccount();
  const tick = useLiveTick();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const userId = acct?.userId, t = acct?.t;
  useEffect(() => {
    // A different account (or signing out) never shows the last one's rewards.
    setProfile(null);
    setErr(null);
  }, [userId]);
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
  const pioneer = profile?.pioneer ?? null;
  const tabRoot = !onBack;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {onBack && <RingoHeader title="Rewards" leading={<BackBtn onClick={onBack} />} />}
      <div
        className="no-bar"
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: `${tabRoot ? 'max(54px, calc(env(safe-area-inset-top, 0px) + 16px))' : '4px'} ${l.gutter}px calc(${TABBAR_CLEARANCE} + 24px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: l.sectionGap }}>
          {tabRoot && <ScreenTitle style={{ marginBottom: -12 }}>Rewards</ScreenTitle>}
          {onWaitlist && <WaitlistCard l={l} onOpen={onWaitlist} />}
          {!acct ? (
            <SignedOut l={l} onLogin={onLogin} />
          ) : (
            <>
              <div style={{ ...twoColumn(l, 1, 1), alignItems: 'stretch' }}>
                <Member l={l} userId={acct.userId} email={profile?.email || acct.email || ''} since={profile?.member_since ?? null} level={rewards?.level ?? null} pioneer={pioneer} />
                {rewards
                  ? <Current l={l} rewards={rewards} credit={profile?.credit} />
                  : !err && <div aria-hidden style={{ minHeight: 260, borderRadius: RADIUS.card, background: RC.cream }} />}
              </div>
              {err && !profile && <ErrorBox>{err}</ErrorBox>}

              {/* Where they have travelled comes first (owner 2026-10-23). */}
              {!(err && !profile) && (
                <section>
                  <SectionHead
                    title="Where you've been"
                    sub={badges.length ? destinations(badges.length) : pioneer ? 'Your Pioneer badge, and a photo for every trip.' : undefined}
                  />
                  {!profile ? <BadgeSkeleton /> : badges.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
                      {pioneer && <BadgeGrid badges={[]} pioneer={pioneer} />}
                      <BadgeEmpty onBrowse={onBrowse} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
                      <TravelMap badges={badges} />
                      <BadgeGrid badges={badges} pioneer={pioneer} />
                    </div>
                  )}
                </section>
              )}

              {rewards && rewards.levels.length > 0 && (
                <section>
                  <SectionHead title="Your rewards" sub="Book more destinations to move up." />
                  <Levels rewards={rewards} />
                </section>
              )}
              {rewards?.global_tenure && rewards.global_tenure.length > 0 && <GlobalTenure l={l} rewards={rewards} />}
              {badges.length > 0 && <RingoButton variant="soft" capped onClick={onBrowse}>Book your next destination</RingoButton>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
