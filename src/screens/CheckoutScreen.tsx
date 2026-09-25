// CheckoutScreen — email, then the App Store. The purchase sheet is Apple's
// (StoreKit 2); the signed transaction it returns goes to ringoesim.com,
// which verifies it against Apple's roots, issues the eSIM and names the
// buyer's account. Only after that is the transaction finished, so a
// purchase the app could not report is redelivered by StoreKit and
// reported on the next launch rather than lost.
//
// A renewing plan is an auto-renewable subscription, and this screen states
// what App Review requires stated before the buy button: the price and
// period, that it renews until cancelled, where to cancel, and the links to
// the Terms of Use and the Privacy Policy.
import { useEffect, useRef, useState } from 'react';
import { RC, RADIUS, SHADOW_CARD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input } from '../components/ui';
import { pictureFor, skyFor } from '../data/destinations';
import { light, SITE } from '../api/light';
import { account, pendingPurchase } from '../store/account';
import { iapAvailable, purchase } from '../lib/iap';
import { openInSheet } from '../lib/browser';
import { haptic, hapticNotify } from '../lib/haptics';
import { priceOf, reportTransaction } from '../lib/purchase';
import { termTitle, type Selection } from './DestinationScreen';

type Stage = 'email' | 'buying' | 'recording' | 'issuing' | 'ready' | 'pending' | 'failed';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_KEY = 'ringo_last_email';

function periodWord(months: number): string {
  return months === 12 ? 'year' : months === 1 ? 'month' : `${months} months`;
}

export function CheckoutScreen({ selection, onBack, onReady }: { selection: Selection; onBack: () => void; onReady: () => void }) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) || account.get()?.email || ''; } catch { return ''; } });
  const [stage, setStage] = useState<Stage>('email');
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const stopPolling = () => { if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPolling(), []);

  const p = selection.plan;
  const price = priceOf(p, selection.product);
  const renewing = p.mode === 'subscription';

  // After the site has recorded the purchase, wait for the eSIM to exist.
  const waitForEsim = () => {
    const acct = account.get();
    if (!acct) { setStageBoth('ready'); return; }
    let tries = 0;
    setStageBoth('issuing');
    const tick = async () => {
      tries++;
      try {
        const d = await light.subscription(acct.userId, acct.t, {});
        if (d.subscription?.esim_attached) { stopPolling(); hapticNotify('success'); setStageBoth('ready'); }
      } catch { /* next tick */ }
      if (tries >= 40) { stopPolling(); setStageBoth('ready'); }
    };
    void tick();
    pollRef.current = window.setInterval(() => void tick(), 3000);
  };
  const stageRef = useRef<Stage>('email');

  // Sign in with Apple can hand us a Hide My Email relay address. Apple's
  // relay refuses senders that are not registered with Apple, so mail to it
  // bounces: the app must not tell anyone to go and look for it. The eSIM
  // itself is always here, under My eSIM.
  const relayEmail = /@privaterelay\.appleid\.com$/i.test(email.trim());
  const setStageBoth = (s: Stage) => { stageRef.current = s; setStage(s); };

  const buy = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter the email your eSIM should be sent to.'); return; }
    if (!selection.product && iapAvailable()) { setErr('This plan is not available in the App Store right now.'); return; }
    setErr(null);
    try { localStorage.setItem(EMAIL_KEY, e); } catch { /* ignore */ }
    if (!iapAvailable()) { setErr('Purchases are made in the Ringo iPhone app.'); return; }
    haptic('medium');
    setStageBoth('buying');
    // Remembered before the sheet opens: if the app dies mid-purchase the
    // unfinished transaction is reported with this context on relaunch.
    const ctx = pendingPurchase.set(selection.product!.id, { plan: p.plan, destination: selection.destination, data_gb: selection.data_gb, email: e });
    // The signup row's id rides on the transaction as Apple's appAccountToken,
    // so a purchase the app never got to report can still be tied to this
    // email by Apple's own notification.
    let token: string | undefined;
    try { const lead = await light.lead(e); if (lead.id) token = lead.id; } catch { /* optional */ }
    let outcome;
    try {
      outcome = await purchase(selection.product!.id, token);
    } catch (ex) {
      setErr((ex as Error).message || 'The purchase could not be started.');
      setStageBoth('email');
      // The context stays. StoreKit rejects an unverified transaction AFTER
      // the money moved, and the redelivered transaction must still know
      // which destination and email it was for.
      return;
    }
    if (outcome.state === 'cancelled') { pendingPurchase.clear(selection.product!.id, ctx.startedAt); setStageBoth('email'); return; }
    if (outcome.state === 'pending') { setStageBoth('pending'); return; }
    setStageBoth('recording');
    try {
      await reportTransaction(outcome, ctx);
      waitForEsim();
    } catch (ex) {
      // Paid but not recorded: the transaction stays unfinished and is
      // reported again on the next launch. Say so plainly.
      hapticNotify('error');
      setErr((ex as Error).message || 'Could not record the purchase.');
      setStageBoth('failed');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title={stage === 'ready' ? 'Your eSIM' : 'Checkout'} leading={stage === 'email' || stage === 'failed' ? <BackBtn onClick={onBack} /> : null} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 190px' }}>
        <div style={{ borderRadius: RADIUS.xl, overflow: 'hidden', background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD }}>
          <div style={{ position: 'relative', height: 110, background: skyFor(selection.destination) }}>
            <img src={pictureFor(selection.destination)} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 800, color: RC.ink, letterSpacing: -0.3 }}>{selection.destinationLabel}</div>
              <div style={{ marginTop: 2, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute }}>
                {p.tier === 'unlimited' ? 'Unlimited data' : `${selection.data_gb} GB${renewing ? ' a month' : ''}`} · {termTitle(selection.plan)}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: RC.ink, letterSpacing: -0.5 }}>{price.total}</div>
          </div>
        </div>

        {stage === 'email' && (
          <div style={{ marginTop: 22 }}>
            <FieldLabel>Your email</FieldLabel>
            <Input value={email} onChange={setEmail} placeholder="you@example.com" type="email" inputMode="email" />
            <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, lineHeight: 1.5 }}>
              {relayEmail
                ? 'Your eSIM installs here in the app. Apple hides this address, so use a real one if you also want it by email.'
                : 'The activation code and receipt go here.'}
            </div>
            {err && <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#A12C2C' }}>{err}</div>}
          </div>
        )}

        {(stage === 'buying') && <Waiting title="Confirm with your Apple ID" sub="Nothing is charged until you confirm." />}
        {stage === 'recording' && <Waiting title="Payment confirmed. Recording your purchase…" sub="One moment." />}
        {stage === 'issuing' && <Waiting title="Preparing your eSIM…" sub={relayEmail ? 'Under a minute. It lands under My eSIM, here in the app.' : 'Under a minute. It lands under My eSIM and in your email.'} ok />}
        {stage === 'pending' && <Waiting title="Waiting for approval" sub="This purchase needs approval (Ask to Buy). Once it is approved, open the app and your eSIM will be prepared." ok />}

        {stage === 'ready' && (
          <div className="rise" style={{ marginTop: 22, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto', borderRadius: '50%', background: RC.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -12px rgba(249,60,31,0.6)' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ marginTop: 14, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.ink, letterSpacing: -0.6 }}>Your eSIM is ready.</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
              {relayEmail
                ? 'Install it now, or later from My eSIM. Your eSIM lives in the app, so nothing is waiting in an inbox.'
                : `Install it now, or later from My eSIM. A copy went to ${email.trim().toLowerCase()}.`}
            </div>
          </div>
        )}

        {stage === 'failed' && (
          <div style={{ marginTop: 22, padding: 16, borderRadius: RADIUS.lg, background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.2)', fontFamily: 'var(--font)', fontSize: 14, color: RC.ink, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700 }}>Your payment went through, but we could not record it yet.</div>
            <div style={{ marginTop: 4, color: RC.inkMute }}>{err} The app will try again the next time it opens; your purchase is not lost. If your eSIM is not under My eSIM within an hour, tap Help and contact us.</div>
          </div>
        )}

        {stage === 'email' && renewing && (
          <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: RADIUS.lg, background: RC.cream, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.55 }}>
            <span style={{ fontWeight: 700, color: RC.ink }}>Renews {price.total} every {periodWord(p.term_months)}</span> through your Apple ID until you cancel in Settings › Apple ID › Subscriptions, at least 24 hours before a renewal. No minimum term: cancel any time and keep the period you paid for. Charged when you confirm.
          </div>
        )}
        {stage === 'email' && (
          <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.6 }}>
            By buying you agree to the{' '}
            <button className="press" onClick={() => void openInSheet(`${SITE}/terms?app=1`)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, color: RC.inkStrong }}>Terms of Use</button>
            {' '}and the{' '}
            <button className="press" onClick={() => void openInSheet(`${SITE}/privacy?app=1`)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, color: RC.inkStrong }}>Privacy Policy</button>
            . Prices include VAT.
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))', background: RC.glass, borderTop: `1px solid ${RC.line}` }}>
        {stage === 'email' && <RingoButton onClick={() => void buy()}>{renewing ? `Subscribe for ${price.total}` : `Buy for ${price.total}`}</RingoButton>}
        {(stage === 'buying' || stage === 'recording') && <RingoButton loading>One moment…</RingoButton>}
        {stage === 'issuing' && <RingoButton variant="soft" onClick={onReady}>Go to My eSIM</RingoButton>}
        {stage === 'pending' && <RingoButton variant="soft" onClick={onReady}>Done</RingoButton>}
        {stage === 'ready' && <RingoButton onClick={onReady}>Install my eSIM</RingoButton>}
        {stage === 'failed' && <RingoButton variant="soft" onClick={onReady}>Go to My eSIM</RingoButton>}
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
