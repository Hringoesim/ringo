// EsimScreen — "My eSIM": the plan this phone's owner bought, what is left on
// it, the install button, top-ups, and the two things support gets asked
// for: the install email again and reporting a problem. Everything is read
// from ringoesim.com against the owner's token; the app keeps no copy.
import { useCallback, useEffect, useState } from 'react';
import { RC, RADIUS, cardSurface } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, IconButton, SectionTitle, TextLink } from '../components/ui';
import { destinationById, pictureFor } from '../data/destinations';
import { light, money, SITE, type SubscriptionRead, type TopUp } from '../api/light';
import { useAccount, account, pendingPurchase } from '../store/account';
import { openInSheet } from '../lib/browser';
import { iapAvailable, loadProducts, purchase, finish, restoreTransactions, manageSubscriptions, type IapProduct } from '../lib/iap';
import { haptic, hapticNotify } from '../lib/haptics';

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
  if (p) return p.replace(/_/g, ' ');
  return sub === 'completed' ? 'Ready to use' : sub.replace(/_/g, ' ');
}

export function EsimScreen({ onBack, onInstall, onLogin, onStore, onReport, onProfile }: {
  onBack?: () => void;
  onProfile: () => void;
  onInstall: (install: { apple_url: string; lpa: string }, label: string) => void;
  onLogin: () => void;
  onStore: () => void;
  onReport: () => void;
}) {
  const acct = useAccount();
  const [data, setData] = useState<SubscriptionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);
  const [topping, setTopping] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<Map<string, IapProduct>>(new Map());
  const [restoring, setRestoring] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!acct) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const d = await light.subscription(acct.userId, acct.t, { usage: true, install: acct.purchaseRef });
      setData(d);
      setErr(null);
      // Apple's prices for the top-ups of this destination.
      const ids = (d.top_ups || []).map((t) => t.apple_product_id).filter((x): x is string => Boolean(x));
      if (ids.length) setTopProducts(await loadProducts(ids));
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) { account.forget(); setData(null); }
      else setErr('Could not reach Ringo. Pull to try again.');
    } finally {
      setLoading(false);
    }
  }, [acct]);

  useEffect(() => { void load(); }, [load]);

  // While the eSIM is still being issued, ask again every few seconds.
  useEffect(() => {
    const sub = data?.subscription;
    if (!sub || sub.esim_attached) return;
    const t = window.setInterval(() => void load(true), 4000);
    return () => window.clearInterval(t);
  }, [data, load]);

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
        setNote(r.environment === 'Sandbox' ? 'Sandbox top-up recorded.' : `${t.data_gb} GB added to your eSIM.`);
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

  // "Restore purchases": every transaction this Apple ID made in the app,
  // newest first, until the site recognises one and names its owner.
  const restore = async () => {
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

  if (!acct) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {header}
        <Empty
          title="No eSIM on this phone yet."
          sub="Buy a plan and it appears here, ready to install. Bought before? Sign in, or restore your App Store purchases."
          primary={{ label: 'Sign in', onClick: onLogin }}
          secondary={{ label: restoring ? 'Restoring…' : 'Restore purchases', onClick: () => void restore() }}
          tertiary={{ label: 'Browse plans', onClick: onStore }}
          note={note}
        />
      </div>
    );
  }

  const sub = data?.subscription;
  const dest = data?.destination ? destinationById(data.destination.id) : null;
  const usage = data?.usage && !('unavailable' in data.usage) ? data.usage : null;
  const ended = sub?.current_cycle_ends_at ? Date.parse(sub.current_cycle_ends_at) < Date.now() : false;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {header}
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 130px' }}>
        {loading && !data && (
          <div style={{ height: 180, borderRadius: RADIUS.card, border: `1px solid ${RC.line}`, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />
        )}

        {!loading && !sub && (
          <Empty
            title="Nothing here yet."
            sub={<>No plan on this account yet.{acct.email && <span style={{ display: 'block', marginTop: 2, color: RC.ink, fontWeight: 600, overflowWrap: 'anywhere' }}>{acct.email}</span>}<span style={{ display: 'block', marginTop: 8 }}>If you just paid, give it a minute. Otherwise browse the plans.</span></>}
            primary={{ label: 'Browse plans', onClick: onStore }}
            inset={false}
            tertiary={{ label: 'Sign in with another account', onClick: onLogin }}
          />
        )}

        {sub && (
          <>
            <div style={{ ...cardSurface(), overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: 120, background: RC.cream2 }}>
                {data?.destination && <img src={pictureFor(data.destination.id)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,10,30,0) 40%, rgba(20,10,30,0.7) 100%)' }} />
                <div style={{ position: 'absolute', left: 16, bottom: 12, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                  {dest?.flag ? `${dest.flag} ` : ''}{data?.destination?.label || sub.plan_label}
                </div>
              </div>
              <div style={{ padding: '14px 16px 16px' }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink }}>{sub.plan_label}</div>
                <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, lineHeight: 1.5 }}>
                  {!sub.esim_attached
                    ? 'Your eSIM is being prepared. Usually under a minute.'
                    : ended
                      ? `Your period ended ${fmtDate(sub.current_cycle_ends_at)}. Top up below to keep using the same eSIM.`
                      : sub.current_cycle_ends_at ? `Valid until ${fmtDate(sub.current_cycle_ends_at)}` : 'Active'}
                </div>

                {sub.esim_attached && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                    <Stat label="Data left" value={sub.plan.startsWith('ul_') || usage?.unlimited ? 'Unlimited' : usage && usage.data_remaining_mb != null ? fmtGb(usage.data_remaining_mb) : '…'} />
                    {sub.cycles_total > 1 && <Stat label="Months" value={`${sub.cycles_used} of ${sub.cycles_total}`} />}
                    <Stat label="Status" value={statusWord(usage?.package_status, sub.status)} />
                  </div>
                )}
              </div>
            </div>

            {sub.esim_attached && (
              <div style={{ marginTop: 14 }}>
                {data?.install ? (
                  <RingoButton onClick={() => { haptic('medium'); onInstall(data.install!, data?.destination?.label || sub.plan_label); }}>Install on this iPhone</RingoButton>
                ) : (
                  <RingoCard style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink }}>Install from your email</div>
                    <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, lineHeight: 1.5 }}>
                      This eSIM was bought outside this phone, so the install link lives in the email we sent{acct.email ? ` to ${acct.email}` : ''}. Open it on this iPhone and tap the button in it.
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <RingoButton size="sm" variant="soft" onClick={() => void resend()}>{resent || 'Send the install email again'}</RingoButton>
                    </div>
                  </RingoCard>
                )}
              </div>
            )}

            {sub.esim_attached && data?.top_ups && data.top_ups.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <SectionTitle>Add data</SectionTitle>
                <RingoCard style={{ padding: 0 }}>
                  {data.top_ups.map((t, i) => (
                    <button key={t.plan} className="press" onClick={() => void topUp(t)} disabled={topping != null || (iapAvailable() && !(t.apple_product_id && topProducts.has(t.apple_product_id)))} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', borderBottom: i === data.top_ups!.length - 1 ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: RC.ink }}>Add {t.data_gb} GB</div>
                        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>Lands on this eSIM, valid {t.validity_days} days</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 800, color: RC.inkStrong }}>{topping === t.plan ? '…' : (t.apple_product_id && topProducts.get(t.apple_product_id)?.displayPrice) || (iapAvailable() ? '…' : money(t.amount, t.currency))}</div>
                    </button>
                  ))}
                </RingoCard>
              </div>
            )}

            {sub.esim_attached && (
              <div style={{ marginTop: 22 }}>
                <SectionTitle>Help</SectionTitle>
                <RingoCard style={{ padding: 0 }}>
                  {data?.install && <LinkRow label={resent || 'Send the install email again'} onClick={() => void resend()} />}
                  <LinkRow label="Setup guide" sub="Step by step, with screenshots" onClick={() => void openInSheet(`${SITE}/esim-setup.html`)} />
                  <LinkRow label="Report a problem" sub="We open a case with the network and write back" onClick={onReport} />
                  {(sub.cycles_total > 1 || /_1m$/.test(String(sub.plan))) && <LinkRow label="Manage subscription" sub="Change or cancel in your Apple ID settings" onClick={() => void manageSubscriptions()} />}
                  <LinkRow label={restoring ? 'Restoring…' : 'Restore purchases'} sub="Bought with this Apple ID on another phone" onClick={() => void restore()} last />
                </RingoCard>
              </div>
            )}

            {note && <div className="rise" style={{ marginTop: 14, padding: '10px 14px', borderRadius: RADIUS.sm, background: RC.successSoft, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.success }}>{note}</div>}
            {err && <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.error }}>{err}</div>}

            <div style={{ marginTop: 22, textAlign: 'center' }}>
              <TextLink onClick={onLogin} color={RC.inkMute} style={{ fontSize: 13 }}>
                Not your eSIM? Sign in with another email
              </TextLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: '10px 12px', borderRadius: RADIUS.sm, background: RC.cream }}>
      <div style={{ fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 700, color: RC.inkMute, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 3, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 800, color: RC.ink, letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

export function LinkRow({ label, sub, onClick, last }: { label: string; sub?: string; onClick: () => void; last?: boolean }) {
  return (
    <button className="press" onClick={onClick} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', borderBottom: last ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>{sub}</div>}
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M6 3l5 5-5 5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

// inset: false inside a scroller that already has the 20pt side gutters, so
// the signed-in and signed-out states are the same width.
function Empty({ title, sub, primary, secondary, tertiary, note, inset = true }: { title: string; sub: React.ReactNode; inset?: boolean; primary: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void }; tertiary?: { label: string; onClick: () => void }; note?: string | null }) {
  return (
    <div style={{ padding: inset ? '10px 20px 40px' : '10px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 84, height: 84, borderRadius: 26, background: RC.gradSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="4" y="3" width="16" height="18" rx="3" stroke={RC.inkStrong} strokeWidth="1.8" />
          <rect x="8" y="9" width="8" height="6" rx="1.5" stroke={RC.inkStrong} strokeWidth="1.8" />
        </svg>
      </div>
      <div style={{ marginTop: 18, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, letterSpacing: -0.5 }}>{title}</div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.55, maxWidth: 320 }}>{sub}</div>
      <div style={{ marginTop: 22, width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <RingoButton onClick={primary.onClick}>{primary.label}</RingoButton>
        {secondary && <RingoButton variant="ghost" onClick={secondary.onClick}>{secondary.label}</RingoButton>}
        {tertiary && (
          <TextLink onClick={tertiary.onClick} style={{ margin: '-7px 0', fontSize: 13.5 }}>{tertiary.label}</TextLink>
        )}
        {note && <div className="rise" style={{ marginTop: 6, padding: '10px 14px', borderRadius: RADIUS.sm, background: RC.cream, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.ink }}>{note}</div>}
      </div>
    </div>
  );
}

