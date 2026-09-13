// EsimScreen — "My eSIM": the plan this phone's owner bought, what is left on
// it, the install button, top-ups, and the two things support gets asked
// for: the install email again and reporting a problem. Everything is read
// from ringoesim.com against the owner's token; the app keeps no copy.
import { useCallback, useEffect, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle } from '../components/ui';
import { destinationById, pictureFor } from '../data/destinations';
import { light, money, SITE, type SubscriptionRead, type TopUp } from '../api/light';
import { useAccount, account } from '../store/account';
import { openInSheet } from '../lib/browser';
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

export function EsimScreen({ onBack, onInstall, onFind, onStore, onReport }: {
  onBack?: () => void;
  onInstall: (install: { apple_url: string; lpa: string }, label: string) => void;
  onFind: () => void;
  onStore: () => void;
  onReport: () => void;
}) {
  const acct = useAccount();
  const [data, setData] = useState<SubscriptionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [resent, setResent] = useState<string | null>(null);
  const [topping, setTopping] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!acct) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const d = await light.subscription(acct.userId, acct.t, { usage: true, install: acct.purchaseRef });
      setData(d);
      setErr(null);
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

  const topUp = async (t: TopUp) => {
    if (!acct || !data?.destination) return;
    setTopping(t.plan);
    haptic('medium');
    try {
      const { url } = await light.checkout({ plan: t.plan, destination: data.destination.id, email: acct.email || '', currency: t.currency });
      await openInSheet(url);
    } catch {
      setErr('Could not start the top-up.');
    } finally {
      setTopping(null);
    }
  };

  const header = <RingoHeader title="My eSIM" leading={onBack ? <BackBtn onClick={onBack} /> : null} />;

  if (!acct) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {header}
        <Empty
          title="No eSIM on this phone yet."
          sub="Buy a plan and it appears here, ready to install. Already bought one on ringoesim.com or on another phone? Find it with your email."
          primary={{ label: 'Browse plans', onClick: onStore }}
          secondary={{ label: 'Find my eSIM', onClick: onFind }}
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
          <div style={{ height: 180, borderRadius: RADIUS.xl, background: RC.cream, animation: 'ringoSheen 1.4s ease-in-out infinite' }} />
        )}

        {!loading && !sub && (
          <Empty
            title="Nothing here yet."
            sub={`No plan is attached to ${acct.email || 'this email'}. If you just paid, give it a minute; otherwise browse the plans.`}
            primary={{ label: 'Browse plans', onClick: onStore }}
            secondary={{ label: 'Use another email', onClick: onFind }}
          />
        )}

        {sub && (
          <>
            <div style={{ borderRadius: RADIUS.xl, overflow: 'hidden', background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD }}>
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
                    <button key={t.plan} className="press" onClick={() => void topUp(t)} disabled={topping != null} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', borderBottom: i === data.top_ups!.length - 1 ? 'none' : `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: RC.ink }}>Add {t.data_gb} GB</div>
                        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>Lands on this eSIM, valid {t.validity_days} days</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 800, color: RC.inkStrong }}>{topping === t.plan ? '…' : money(t.amount, t.currency)}</div>
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
                  <LinkRow label="Report a problem" sub="We open a case with the network and write back" onClick={onReport} last />
                </RingoCard>
              </div>
            )}

            {err && <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 13, color: '#A12C2C' }}>{err}</div>}

            <div style={{ marginTop: 22, textAlign: 'center' }}>
              <button className="press" onClick={onFind} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkMute }}>
                Not your eSIM? Use another email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: '10px 12px', borderRadius: 14, background: RC.cream }}>
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

function Empty({ title, sub, primary, secondary }: { title: string; sub: string; primary: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ padding: '10px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
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
      </div>
    </div>
  );
}

