// CheckoutScreen — email, then Stripe. The app mints a hosted Checkout on
// ringoesim.com and opens it in the system browser sheet (Apple Pay lives
// there). Whether the buyer comes back through the ringo:// link on the
// return page or by tapping Done, the app then asks the site, which asks
// Stripe, whether the session is paid; "paid" is only ever Stripe's word.
// Once paid, the site names the buyer (their signup row and token) and the
// app keeps that on the phone, then waits for the eSIM to be issued.
import { useEffect, useRef, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { pictureFor } from '../data/destinations';
import { light, money, type Status } from '../api/light';
import { account, pendingCheckout } from '../store/account';
import { openInSheet, closeSheet, onSheetClosed, onAppUrl, parseReturnLink } from '../lib/browser';
import { haptic, hapticNotify } from '../lib/haptics';
import type { Selection } from './DestinationScreen';

type Stage = 'email' | 'opening' | 'paying' | 'checking' | 'issuing' | 'ready' | 'cancelled' | 'failed';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_KEY = 'ringo_last_email';

function termTitle(s: Selection): string {
  const p = s.plan;
  if (p.mode === 'payment') return `${p.days} days`;
  return p.term_months === 12 ? '12 months' : `${p.term_months} months`;
}

export function CheckoutScreen({ selection, onBack, onReady }: { selection: Selection; onBack: () => void; onReady: () => void }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) || ''; } catch { return ''; } });
  const [stage, setStage] = useState<Stage>('email');
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const sessionRef = useRef<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const stageRef = useRef<Stage>('email');
  const setStageBoth = (s: Stage) => { stageRef.current = s; setStage(s); };

  const stopPolling = () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };

  // Ask the site (which asks Stripe) how the session ended. Runs until paid
  // and issued, or until the session is clearly not going to pay.
  const check = async (session: string) => {
    try {
      const s = await light.status(session);
      setStatus(s);
      if (s.paid) {
        if (s.user_id && s.t) {
          account.set({ userId: s.user_id, t: s.t, email: email.trim().toLowerCase(), purchaseRef: session });
          pendingCheckout.set(null);
        }
        if (s.delivered && s.user_id) {
          stopPolling();
          hapticNotify('success');
          setStageBoth('ready');
        } else if (stageRef.current !== 'issuing') {
          setStageBoth('issuing');
        }
        return;
      }
      // Not paid. An open session may still be paid later (they may have
      // gone back to the sheet); an expired one will not.
      if (s.status === 'expired' || (!s.pending && stageRef.current === 'checking')) {
        stopPolling();
        setStageBoth('cancelled');
      }
    } catch {
      /* transient: the next tick asks again */
    }
  };

  const startPolling = (session: string) => {
    stopPolling();
    void check(session);
    pollRef.current = window.setInterval(() => void check(session), 3000);
  };

  // The two ways back from the sheet: the return page's ringo:// link, or
  // the Done button. Either way we go and ask Stripe.
  useEffect(() => {
    let offUrl = () => {};
    let offClosed = () => {};
    void onAppUrl((url) => {
      const r = parseReturnLink(url);
      if (!r) return;
      void closeSheet();
      const session = r.session || sessionRef.current;
      if (r.status === 'cancelled' || !session) { stopPolling(); setStageBoth('cancelled'); return; }
      setStageBoth('checking');
      startPolling(session);
    }).then((off) => { offUrl = off; });
    void onSheetClosed(() => {
      if (stageRef.current !== 'paying' || !sessionRef.current) return;
      setStageBoth('checking');
      startPolling(sessionRef.current);
    }).then((off) => { offClosed = off; });
    return () => { offUrl(); offClosed(); stopPolling(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter the email your eSIM should be sent to.'); return; }
    setErr(null);
    try { localStorage.setItem(EMAIL_KEY, e); } catch { /* ignore */ }
    setStageBoth('opening');
    haptic('medium');
    try {
      const { url } = await light.checkout({
        plan: selection.plan.plan,
        destination: selection.destination,
        data_gb: selection.data_gb,
        email: e,
        device: 'iPhone (Ringo app)',
      });
      const m = url.match(/\/pay\/(cs_(?:live|test)_[A-Za-z0-9]+)/);
      const session = m ? m[1] : null;
      sessionRef.current = session;
      if (session) pendingCheckout.set({ session, email: e, destination: selection.destination, plan: selection.plan.plan, startedAt: Date.now() });
      setStageBoth('paying');
      await openInSheet(url);
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : 'Could not start the payment.';
      setErr(msg === 'Plans are not on sale yet.' ? 'This plan is not on sale right now. Please try again later.' : msg);
      setStageBoth('email');
    }
  };

  const retryCheck = () => {
    if (!sessionRef.current) { setStageBoth('email'); return; }
    setStageBoth('checking');
    startPolling(sessionRef.current);
  };

  const p = selection.plan;
  const total = money(p.billed_upfront_amount, p.currency);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title={stage === 'ready' ? 'Your eSIM' : 'Checkout'} leading={stage === 'email' || stage === 'cancelled' ? <BackBtn onClick={onBack} /> : null} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 140px' }}>
        {/* The order, as a card */}
        <div style={{ borderRadius: RADIUS.xl, overflow: 'hidden', background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD }}>
          <div style={{ position: 'relative', height: 110, background: RC.cream2 }}>
            <img src={pictureFor(selection.destination)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 800, color: RC.ink, letterSpacing: -0.3 }}>{selection.destinationLabel}</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute }}>
                {p.tier === 'unlimited' ? 'Unlimited data' : `${selection.data_gb} GB`} · {termTitle(selection)}{p.mode === 'subscription' ? ', renews' : ', one payment'}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: RC.ink, letterSpacing: -0.5 }}>{total}</div>
          </div>
        </div>

        {stage === 'email' && (
          <div style={{ marginTop: 22 }}>
            <FieldLabel>Email for your eSIM</FieldLabel>
            <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" inputMode="email" />
            <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.5 }}>
              Your receipt and a copy of the install link go here. No account or password needed.
            </div>
            {err && <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C' }}>{err}</div>}
            <div style={{ marginTop: 22, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.55 }}>
              Payment is taken by Stripe on its own secure page, with Apple Pay or card. By paying you agree to the Ringo Terms, including immediate delivery of the eSIM.
            </div>
          </div>
        )}

        {(stage === 'opening' || stage === 'paying') && (
          <Waiting title={stage === 'opening' ? 'Opening Stripe…' : 'Finish paying in the Stripe window'} sub="Come back here when it says the payment went through. Nothing is charged until Stripe confirms it." />
        )}
        {stage === 'checking' && <Waiting title="Checking with Stripe…" sub="One moment while we confirm the payment." />}
        {stage === 'issuing' && <Waiting title="Payment confirmed. Preparing your eSIM…" sub="This usually takes under a minute. You can leave the app; the eSIM will be under My eSIM, and a copy is on its way to your email." ok />}

        {stage === 'ready' && (
          <div className="rise" style={{ marginTop: 22, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto', borderRadius: '50%', background: RC.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -12px rgba(249,60,31,0.6)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.ink, letterSpacing: -0.6 }}>Your eSIM is ready.</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              {status?.amount_cents ? `${money(status.amount_cents, status.currency || p.currency)} confirmed by Stripe. ` : ''}Install it now, or later from My eSIM. A copy went to {email.trim().toLowerCase()}.
            </div>
          </div>
        )}

        {stage === 'cancelled' && (
          <div style={{ marginTop: 22, padding: 16, borderRadius: RADIUS.lg, background: RC.cream, fontFamily: 'var(--font)', fontSize: 14, color: RC.ink, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700 }}>Nothing was charged.</div>
            <div style={{ marginTop: 4, color: RC.inkMute }}>The payment page was closed before paying. If you did pay, tap “Check again” and we will ask Stripe.</div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))', background: RC.glass, borderTop: `1px solid ${RC.line}` }}>
        {stage === 'email' && <RingoButton onClick={() => void pay()}>Pay {total} with Stripe</RingoButton>}
        {stage === 'opening' && <RingoButton loading>Opening…</RingoButton>}
        {stage === 'paying' && <RingoButton variant="soft" onClick={() => { if (sessionRef.current) { setStageBoth('checking'); startPolling(sessionRef.current); } }}>I have paid</RingoButton>}
        {stage === 'checking' && <RingoButton loading>Checking…</RingoButton>}
        {stage === 'issuing' && <RingoButton variant="soft" onClick={onReady}>Go to My eSIM</RingoButton>}
        {stage === 'ready' && <RingoButton onClick={onReady}>Install my eSIM</RingoButton>}
        {stage === 'cancelled' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RingoButton onClick={() => void pay()}>Try again</RingoButton>
            <RingoButton variant="ghost" onClick={retryCheck}>Check again</RingoButton>
          </div>
        )}
      </div>
    </div>
  );
}

function Waiting({ title, sub, ok = false }: { title: string; sub: string; ok?: boolean }) {
  return (
    <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {ok ? (
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(31,138,91,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#1F7A4E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      ) : (
        <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${RC.line}`, borderTopColor: RC.inkStrong, animation: 'ringoSpin 0.7s linear infinite' }} />
      )}
      <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 16, fontWeight: 700, color: RC.ink, letterSpacing: -0.2 }}>{title}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.5, maxWidth: 300 }}>{sub}</div>
    </div>
  );
}
