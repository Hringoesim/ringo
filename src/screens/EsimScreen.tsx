// EsimScreen: "My eSIM". The plan this phone's owner bought, what is left on
// it, the install button, allowance top-ups, and the two things support gets
// asked for: the install email again and reporting a problem. Everything is
// read from ringoesim.com against the owner's token; the app keeps no copy.
//
// Layout follows the live width (useLayout), never the device: one column on
// a phone and the Duo cover display, plan card and usage side by side on the
// Duo inner display and anything 600pt or wider.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { RC, RADIUS, READ_MAX, TYPE, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW, cardSurface, typeFor } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, ErrorBox, IconButton, PhotoCard, PioneerBadge, SectionHead, SuccessBox, TextLink } from '../components/ui';
import { PlaceMosaic } from '../components/PlaceMosaic';
import { bundledPictureFor, destinationById, hasMosaic, pictureFor, skyFor } from '../data/destinations';
import { light, money, SITE, type Profile, type SubscriptionRead, type TopUp, type Usage } from '../api/light';
import { UsageSection } from '../components/UsageCard';
import { useAccount, account, pendingPurchase } from '../store/account';
import { openInSheet } from '../lib/browser';
import { iapAvailable, loadProducts, purchase, finish, restoreTransactions, manageSubscriptions, type IapProduct, type SignedOffer } from '../lib/iap';
import { haptic, hapticNotify } from '../lib/haptics';
import { useLiveTick } from '../store/live';
import { useLayout, twoColumn, TABBAR_CLEARANCE, type Layout } from '../lib/layout';

const SUNSET_PHOTO = `${SITE}/img/dashboard-sunset.jpg`;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; }
}
function fmtGb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB` : `${Math.round(mb)} MB`;
}
// The carrier's package states, in the traveller's words. A package sits
// "not active" until the eSIM first connects at the destination; that is
// the normal state of a plan bought before the trip, not a problem.
function statusWord(pkg: string | null | undefined, sub: string): string {
  const p = String(pkg || '').toLowerCase();
  if (p === 'active') return 'Active';
  if (p === 'not_active' || p === 'non_active' || p === 'queued') return 'Ready to use';
  if (p === 'terminated' || p === 'expired') return 'Ended';
  if (p) return p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ');
  if (sub === 'completed') return 'Ready to use';
  const s = sub.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Pioneer = NonNullable<Profile['pioneer']>;

export function EsimScreen({ onBack, onInstall, onLogin, onStore, onReport, onProfile }: {
  onBack?: () => void;
  onProfile: () => void;
  onInstall: (install: { apple_url: string; lpa: string }, label: string) => void;
  onLogin: () => void;
  onStore: () => void;
  onReport: () => void;
}) {
  const acct = useAccount();
  const l = useLayout();
  const [data, setData] = useState<SubscriptionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);
  const [topping, setTopping] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<Map<string, IapProduct>>(new Map());
  const [restoring, setRestoring] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [usageAll, setUsageAll] = useState<Usage | null>(null);
  const [pioneer, setPioneer] = useState<Pioneer | null>(null);
  // Ringo Rewards: Global's cheaper month, offered once the site has signed it.
  const [globalOffer, setGlobalOffer] = useState<{ pct: number; productId: string; offer: SignedOffer } | null>(null);
  const [applying, setApplying] = useState(false);
  // Whether the eSIM was attached at the last read: the extras (usage,
  // Rewards offer, Apple prices) are fetched once it is, not on every poll.
  const wasAttached = useRef(false);

  // Usage history, the signed Rewards offer and Apple's top-up prices. Only
  // worth asking for once the eSIM exists; a failure here never blanks the plan.
  const loadExtras = useCallback(async (d: SubscriptionRead, freshPrices: boolean) => {
    if (!acct) return;
    void light.usage(acct.userId, acct.t).then(setUsageAll).catch(() => {});
    const rg = d.rewards_global;
    if (rg?.product_id && iapAvailable()) {
      light.rewardsOffer(acct.userId, acct.t, rg.product_id)
        .then((o) => setGlobalOffer(o.available && o.offer ? { pct: o.pct || rg.pct, productId: rg.product_id!, offer: o.offer } : null))
        .catch(() => setGlobalOffer(null));
    } else setGlobalOffer(null);
    const ids = (d.top_ups || []).map((t) => t.apple_product_id).filter((x): x is string => Boolean(x));
    if (ids.length) setTopProducts(await loadProducts(ids, { fresh: freshPrices }));
  }, [acct]);

  // `extras: false` is the light poll while the eSIM is being issued: the
  // subscription only, unless it has just become attached.
  const load = useCallback(async (quiet = false, freshPrices = false, extras = true) => {
    if (!acct) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const d = await light.subscription(acct.userId, acct.t, { usage: true, install: acct.purchaseRef });
      setData(d);
      setErr(null);
      const attached = Boolean(d.subscription?.esim_attached);
      const justAttached = attached && !wasAttached.current;
      wasAttached.current = attached;
      if (attached && (extras || justAttached)) await loadExtras(d, freshPrices);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) { account.forget(); setData(null); }
      else setErr('Could not reach Ringo. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [acct, loadExtras]);

  useEffect(() => { wasAttached.current = false; void load(); }, [load]);

  // The Pioneer mark sits on the plan card. One small read per account.
  useEffect(() => {
    setPioneer(null);
    if (!acct) return;
    let live = true;
    light.profile(acct.userId, acct.t).then((p) => { if (live) setPioneer(p.pioneer || null); }).catch(() => {});
    return () => { live = false; };
  }, [acct]);

  // Back in the foreground: the eSIM, its data left and its top-ups again,
  // quietly, so nothing shown is older than the last return to the app.
  const tick = useLiveTick();
  const openedAt = useRef(tick);
  useEffect(() => { if (tick !== openedAt.current) void load(true, true); }, [tick, load]);

  // While the eSIM is still being issued, ask again every few seconds (the
  // subscription only).
  const issuing = Boolean(data?.subscription && !data.subscription.esim_attached);
  useEffect(() => {
    if (!issuing) return;
    const t = window.setInterval(() => void load(true, false, false), 4000);
    return () => window.clearInterval(t);
  }, [issuing, load]);

  const resend = async () => {
    if (!acct) return;
    haptic('light');
    try {
      const r = await light.resendInstall(acct.userId, acct.t);
      setResent(r.throttled ? `Already sent. Try again in ${Math.ceil((r.retry_after_seconds || 60) / 60)} min.` : `Sent to ${r.sent_to || 'your email'}.`);
      hapticNotify('success');
    } catch {
      setResent('Could not send right now.');
    }
    setTimeout(() => setResent(null), 4000);
  };

  // A top-up is an App Store consumable: Apple's sheet, then the signed
  // transaction goes to the site, which lands the data on this eSIM.
  const topUp = async (t: TopUp) => {
    if (!acct || !data?.destination || !t.apple_product_id) return;
    if (!iapAvailable()) { setErr('Top-ups are bought in the Ringo iPhone app.'); return; }
    const email = acct.email || '';
    if (!email) { setErr('Sign in with the email this eSIM was bought with before adding data.'); return; }
    setErr(null);
    setTopping(t.plan);
    haptic('medium');
    const ctx = pendingPurchase.set(t.apple_product_id, { plan: t.plan, destination: data.destination.id, data_gb: null, email });
    try {
      const out = await purchase(t.apple_product_id, acct.userId);
      if (out.state === 'purchased') {
        const r = await light.appPurchase({ signedTransaction: out.jws, plan: t.plan, destination: data.destination.id, email });
        await finish(out.transactionId);
        pendingPurchase.clear(t.apple_product_id, ctx.startedAt);
        hapticNotify('success');
        setNote(r.environment === 'Sandbox' ? 'Sandbox top-up recorded.' : 'Allowance top-up added to your eSIM.');
        setTimeout(() => setNote(null), 5000);
        void load(true);
      } else if (out.state === 'pending') {
        setNote('Waiting for approval (Ask to Buy). The data lands once it is approved.');
      } else {
        pendingPurchase.clear(t.apple_product_id, ctx.startedAt);
      }
    } catch (e) {
      setErr((e as Error).message || 'Could not complete the top-up.');
    } finally {
      setTopping(null);
    }
  };

  // The cheaper Global month: Apple's sheet confirms it, and it applies from
  // the next renewal of the same subscription. The transaction is reported to
  // ringoesim.com before it is finished, like every other purchase path. It
  // stays in the same subscription (same original transaction), so the
  // restore-style report is used: it ties the transaction to the owner's
  // plan and can never start a second eSIM.
  const applyGlobalOffer = async () => {
    if (!acct || !globalOffer || applying) return;
    setApplying(true);
    setErr(null);
    haptic('medium');
    try {
      const out = await purchase(globalOffer.productId, acct.userId, globalOffer.offer);
      if (out.state === 'purchased') {
        try { await light.restorePurchase(out.jws); } catch { /* App Store Server Notifications still carry it */ }
        await finish(out.transactionId);
        hapticNotify('success');
        setNote(`Done. Your Global month is ${globalOffer.pct}% cheaper from your next renewal.`);
        setGlobalOffer(null);
        setTimeout(() => setNote(null), 6000);
      } else if (out.state === 'pending') {
        setNote('Waiting for approval (Ask to Buy). Your lower price applies once it is approved.');
      }
    } catch (e) {
      setErr((e as Error).message || 'Could not apply your Rewards price.');
    } finally {
      setApplying(false);
    }
  };

  // "Restore purchases": every transaction this Apple ID made in the app,
  // newest first, until the site recognises one and names its owner.
  const restore = async () => {
    if (restoring) return;
    if (!iapAvailable()) { setNote('Restore works in the Ringo iPhone app.'); return; }
    setRestoring(true);
    haptic('light');
    try {
      const txs = await restoreTransactions();
      let found = false;
      for (const t of txs) {
        try {
          const r = await light.restorePurchase(t.jws);
          if (r.user_id && r.t) { account.set({ userId: r.user_id, t: r.t, email: r.email ?? null, purchaseRef: `apple:${r.transaction_id}` }); found = true; break; }
        } catch { /* next one */ }
      }
      setNote(found ? 'Your purchases are back.' : txs.length ? 'No Ringo eSIM found for this Apple ID yet. If you just bought one, open the plan again.' : 'No purchases found for this Apple ID.');
      if (found) void load();
    } catch {
      setNote('Could not reach the App Store. Try again.');
    } finally {
      setRestoring(false);
      setTimeout(() => setNote(null), 6000);
    }
  };

  // The profile (travel badges, Ringo status) sits one tap from the eSIM, top right, once there is an account.
  const profileBtn = acct ? (
    <IconButton onClick={onProfile} label="Your profile">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="8.5" r="4" stroke={RC.inkStrong} strokeWidth="2" /><path d="M4.5 20c.9-3.6 3.8-5.5 7.5-5.5s6.6 1.9 7.5 5.5" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" /></svg>
    </IconButton>
  ) : null;
  const header = <RingoHeader title="My eSIM" leading={onBack ? <BackBtn onClick={onBack} /> : null} trailing={profileBtn} />;
  const scroller = { flex: 1, overflowY: 'auto' as const, padding: `4px ${l.gutter}px calc(${TABBAR_CLEARANCE} + 24px)` };

  if (!acct) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {header}
        <div className="no-bar" style={scroller}>
          <Empty
            l={l}
            title="No eSIM on this phone yet"
            sub="Buy a plan and it appears here."
            primary={{ label: 'Sign in', onClick: onLogin }}
            secondary={{ label: restoring ? 'Restoring…' : 'Restore purchases', onClick: () => void restore(), loading: restoring }}
            tertiary={{ label: 'Browse plans', onClick: onStore }}
            note={note}
          />
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const destId = data?.destination?.id || null;
  const dest = destId ? destinationById(destId) : null;
  const usage = data?.usage && !('unavailable' in data.usage) ? data.usage : null;
  const ended = sub?.current_cycle_ends_at ? Date.parse(sub.current_cycle_ends_at) < Date.now() : false;
  const place = data?.destination?.label || sub?.plan_label || 'Your eSIM';
  const unlimited = Boolean(sub && (sub.plan.startsWith('ul_') || usage?.unlimited));

  const hasUsage = Boolean(sub?.esim_attached && usageAll && (usageAll.esims.length || usageAll.daily.length));
  // Without a second column, a wide screen gets one readable column, not a stretched phone row.
  const single = { display: 'flex', flexDirection: 'column' as const, gap: l.cardGap, width: '100%', maxWidth: l.isWide ? READ_MAX + 80 : undefined, marginLeft: 'auto', marginRight: 'auto' };
  const planCard = sub ? (
    <div style={{ ...cardSurface(), overflow: 'hidden' }}>
      <PlanPicture id={destId} place={place} flag={dest?.flag || null} wide={l.isWide} />
      <div style={{ padding: l.isWide ? '18px 22px 22px' : '16px 16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, ...TYPE.h3, color: RC.ink }}>{sub.plan_label}</h2>
          {pioneer && <PioneerBadge tone="gold" label="Ringo Pioneer" />}
        </div>
        <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>
          {!sub.esim_attached
            ? 'Your eSIM is being prepared. Usually under a minute.'
            : ended
              ? `Your period ended ${fmtDate(sub.current_cycle_ends_at)}. Top up below to keep using the same eSIM.`
              : sub.current_cycle_ends_at ? `Valid until ${fmtDate(sub.current_cycle_ends_at)}` : 'Active'}
        </p>

        {!sub.esim_attached && (
          <div aria-hidden style={{ marginTop: 14, height: 8, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', borderRadius: RADIUS.pill, background: RC.grad, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />
          </div>
        )}

        {sub.esim_attached && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: `repeat(${sub.cycles_total > 1 ? 3 : 2}, minmax(0, 1fr))`, gap: 8 }}>
            <Stat label="Data left" value={unlimited ? 'Unlimited' : usage && usage.data_remaining_mb != null ? fmtGb(usage.data_remaining_mb) : '…'} />
            {sub.cycles_total > 1 && <Stat label="Months" value={`${sub.cycles_used} of ${sub.cycles_total}`} />}
            <Stat label="Status" value={statusWord(usage?.package_status, sub.status)} />
          </div>
        )}

        {sub.esim_attached && (
          <div style={{ marginTop: 16 }}>
            {data?.install ? (
              <RingoButton onClick={() => { haptic('medium'); onInstall(data.install!, place); }}>Install on this iPhone</RingoButton>
            ) : (
              <div style={{ padding: 16, borderRadius: RADIUS.md, background: RC.cream }}>
                <div style={{ ...TYPE.h3, color: RC.ink }}>Install from your email</div>
                <p style={{ margin: '4px 0 0', ...TYPE.small, color: RC.ink2 }}>
                  The install link is in the email we sent{acct.email ? <> to <strong style={{ color: RC.ink, overflowWrap: 'anywhere' }}>{acct.email}</strong></> : ''}. Open it on this iPhone.
                </p>
                <div style={{ marginTop: 12 }}>
                  <RingoButton size="sm" variant="secondary" onClick={() => void resend()}>{resent || 'Send the install email again'}</RingoButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const offerCard = sub?.esim_attached && globalOffer ? (
    <PhotoCard
      id="rewards-global"
      photo={`${import.meta.env.BASE_URL}img/rewards/gold.jpg`}
      name={`Your Global month is ${globalOffer.pct}% cheaper`}
      aspect={l.isWide ? '16 / 9' : '2 / 1'}
      what="A Ringo Rewards thank you for staying with Global. It applies from your next renewal."
      style={{ marginTop: 0 }}
    >
      <div style={{ marginTop: 10 }}>
        <RingoButton loading={applying} disabled={applying} onClick={() => void applyGlobalOffer()}>Apply my lower price</RingoButton>
      </div>
    </PhotoCard>
  ) : null;

  const topUps = sub?.esim_attached && data?.top_ups && data.top_ups.length > 0 ? (
    <section>
      <SectionHead title="Allowance top-up" sub="More data on this same eSIM." />
      <RingoCard padding={0} clip>
        {data.top_ups.map((t, i) => {
          const ready = !iapAvailable() || Boolean(t.apple_product_id && topProducts.has(t.apple_product_id));
          const price = (t.apple_product_id && topProducts.get(t.apple_product_id)?.displayPrice) || (iapAvailable() ? '…' : money(t.amount, t.currency));
          return (
            <button
              key={t.plan}
              className="press"
              onClick={() => void topUp(t)}
              disabled={topping != null || !ready}
              aria-label={`Allowance top-up, valid ${t.validity_days} days, ${price}`}
              style={{ width: '100%', minHeight: 64, textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', borderBottom: i === data.top_ups!.length - 1 ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12, opacity: topping != null && topping !== t.plan ? 0.5 : 1 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...TYPE.h3, color: RC.ink }}>Allowance top-up</div>
                <div style={{ ...TYPE.small, color: RC.ink2 }}>Valid {t.validity_days} days</div>
              </div>
              <div style={{ ...TYPE.bodyStrong, color: RC.orangeInk, fontVariantNumeric: 'tabular-nums' }}>{topping === t.plan ? 'Adding…' : price}</div>
            </button>
          );
        })}
      </RingoCard>
    </section>
  ) : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {header}
      <div className="no-bar" style={scroller}>
        {loading && !data && (
          <div role="status" aria-label="Loading your eSIM" style={{ ...twoColumn(l) }}>
            <div style={{ height: l.isWide ? 380 : 300, borderRadius: RADIUS.card, border: `1.5px solid ${RC.line}`, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />
            {l.isWide && <div style={{ height: 380, borderRadius: RADIUS.card, border: `1.5px solid ${RC.line}`, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />}
          </div>
        )}

        {/* A failed first read is not "no plan": say so, and offer a retry. */}
        {!loading && !data && err && (
          <Empty
            l={l}
            title="Could not reach Ringo"
            sub="Your eSIM is fine. We just could not load it. Check your connection and try again."
            primary={{ label: 'Try again', onClick: () => void load() }}
            tertiary={{ label: 'Report a problem', onClick: onReport }}
          />
        )}

        {!loading && data && !sub && (
          <Empty
            l={l}
            title="No plan on this account yet"
            sub={<>{acct.email && <span style={{ display: 'block', color: RC.ink, fontWeight: 600, overflowWrap: 'anywhere' }}>{acct.email}</span>}<span style={{ display: 'block', marginTop: 6 }}>If you just paid, give it a minute.</span></>}
            primary={{ label: 'Browse plans', onClick: onStore }}
            secondary={{ label: restoring ? 'Restoring…' : 'Restore purchases', onClick: () => void restore(), loading: restoring }}
            tertiary={{ label: 'Sign in with another account', onClick: onLogin }}
            note={note}
          />
        )}

        {sub && (
          <>
            <div style={hasUsage ? twoColumn(l, 1, 1) : single}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
                {planCard}
                {offerCard}
              </div>
              {hasUsage && usageAll && (
                <UsageSection usage={usageAll} currentDestination={destId} liveRemaining={usage?.data_remaining_mb ?? null} />
              )}
            </div>

            {(note || err) && (
              <div style={{ marginTop: l.cardGap, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {note && <SuccessBox>{note}</SuccessBox>}
                {err && <ErrorBox>{err}</ErrorBox>}
              </div>
            )}

            {/* No margin shorthand in `single`: React swapping it for marginTop
                between renders wiped the section gap. Under a two column block the Help
                list takes the same full width, so its edges line up. */}
            <div style={{ ...(topUps && sub.esim_attached ? twoColumn(l, 1, 1) : hasUsage ? { display: 'flex', flexDirection: 'column' as const, gap: l.cardGap } : single), marginTop: l.sectionGap }}>
              {topUps}
              {sub.esim_attached && (
                <section>
                  <SectionHead title="Help" sub="Setup, problems and purchases." />
                  <RingoCard padding={0} clip>
                    {data?.install && <LinkRow label={resent || 'Send the install email again'} onClick={() => void resend()} />}
                    <LinkRow label="Setup guide" onClick={() => void openInSheet(`${SITE}/esim-setup.html`)} />
                    <LinkRow label="Report a problem" onClick={onReport} />
                    {(sub.cycles_total > 1 || /_1m$/.test(String(sub.plan))) && <LinkRow label="Manage subscription" onClick={() => void manageSubscriptions()} />}
                    <LinkRow label={restoring ? 'Restoring…' : 'Restore purchases'} onClick={() => void restore()} last />
                  </RingoCard>
                </section>
              )}
            </div>

            <div style={{ marginTop: l.sectionGap, textAlign: 'center' }}>
              <TextLink onClick={onLogin}>Not your eSIM? Sign in with another email</TextLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// The photo at the top of the plan card: the site's Global mosaic, the
// bundled destination photo, the site photo, or a sunset sky if all fail.
function PlanPicture({ id, place, flag, wide }: { id: string | null; place: string; flag: string | null; wide: boolean }) {
  const [src, setSrc] = useState<string | null>(id ? bundledPictureFor(id) || pictureFor(id) : null);
  useEffect(() => { setSrc(id ? bundledPictureFor(id) || pictureFor(id) : null); }, [id]);
  const fail = () => {
    if (id && src && src !== pictureFor(id)) setSrc(pictureFor(id));
    else setSrc(null);
  };
  return (
    <div style={{ position: 'relative', aspectRatio: wide ? '16 / 9' : '2 / 1', background: skyFor(id || place), overflow: 'hidden' }}>
      {id && hasMosaic(id)
        ? <PlaceMosaic id={id} />
        : src && <img src={src} alt="" onError={fail} decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', textShadow: PHOTO_TEXT_SHADOW }}>
        {flag && <span aria-hidden style={{ fontSize: 26, lineHeight: 1 }}>{flag}</span>}
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: wide ? 28 : 24, lineHeight: 1.15, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>{place}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, padding: '12px 12px', borderRadius: RADIUS.sm, background: RC.cream }}>
      <div style={{ ...TYPE.caption, color: RC.inkMute }}>{label}</div>
      <div style={{ marginTop: 2, ...TYPE.bodyStrong, fontWeight: 800, color: RC.ink, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
}

/** A row in a list card: 17 label, optional 15 line under it, a chevron. Also used by Help. */
export function LinkRow({ label, sub, onClick, last }: { label: string; sub?: string; onClick: () => void; last?: boolean }) {
  return (
    <button className="press" onClick={onClick} style={{ width: '100%', minHeight: 56, textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', borderBottom: last ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 17, lineHeight: 1.3, fontWeight: 600, color: RC.ink }}>{label}</div>
        {sub && <div style={{ ...TYPE.small, color: RC.ink2 }}>{sub}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 3l5 5-5 5" stroke={RC.inkDeco} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

type Action = { label: string; onClick: () => void; loading?: boolean };

// An empty or error state: a sunset photo, a plain heading, one line, the
// actions. A centred readable column on wide screens.
function Empty({ l, title, sub, primary, secondary, tertiary, note }: { l: Layout; title: string; sub: ReactNode; primary: Action; secondary?: Action; tertiary?: Action; note?: string | null }) {
  return (
    <div style={{ width: '100%', maxWidth: READ_MAX, margin: '0 auto', padding: '8px 0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: RADIUS.card, overflow: 'hidden', background: skyFor('empty'), border: `1.5px solid ${RC.line}` }}>
        <img src={SUNSET_PHOTO} alt="" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <h2 style={{ margin: '22px 0 0', ...typeFor('h1', l.size), color: RC.ink }}>{title}</h2>
      <div style={{ marginTop: 8, ...TYPE.body, color: RC.ink2 }}>{sub}</div>
      <div style={{ marginTop: 22, width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <RingoButton onClick={primary.onClick} loading={primary.loading}>{primary.label}</RingoButton>
        {secondary && <RingoButton variant="secondary" onClick={secondary.onClick} loading={secondary.loading}>{secondary.label}</RingoButton>}
        {tertiary && (
          <div style={{ marginTop: 10 }}>
            <TextLink onClick={tertiary.onClick}>{tertiary.label}</TextLink>
          </div>
        )}
        {note && <SuccessBox style={{ marginTop: 8 }}>{note}</SuccessBox>}
      </div>
    </div>
  );
}
