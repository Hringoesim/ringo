// CheckoutScreen: email, then a card or the App Store.
//
// Card first (owner 2026-10-24, "accept any and all cards ... like Saily"):
// a one-payment plan can be paid on Stripe's hosted page in the browser
// sheet, with any card from any country, Apple Pay or Link, the same session
// and fulfilment the website uses (api/esim-checkout, client 'app'). An eSIM
// is a service used outside the app, so App Review allows a payment that is
// not Apple's (guideline 3.1.3(e)). The app never decides it is paid: it
// polls /api/light-status, Stripe's own word, then waits for the eSIM like
// an App Store purchase. Day passes (App Store products only), renewing
// plans and Rewards member prices (the hosted page charges the list price)
// stay on the App Store button below it.
// The purchase sheet is Apple's
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
//
// The email is the signed-in account's, never a remembered one from another
// account on this phone (the site ties the purchase to the account of the
// email typed here). Buying for a different email than the signed-in one is
// asked once before it happens.
//
// The notification ask is not here: it lives in components/PushControls and
// App shows it once, after the first delivered purchase.
//
// Layout follows the live width: on a phone a summary card, the form and a
// sticky buy bar; on a wide screen the photo card on the left and the form
// with its button in a readable column on the right.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PlaceMosaic } from '../components/PlaceMosaic';
import { RC, RADIUS, TYPE, typeFor, cardSurface, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input, HelpText, ErrorBox } from '../components/ui';
import { useBlockSwipeBack } from '../components/ScreenHost';
import { hasMosaic, pictureFor, skyFor, bundledPictureFor } from '../data/destinations';
import { light, SITE } from '../api/light';
import { account, pendingPurchase } from '../store/account';
import { iapAvailable, purchase } from '../lib/iap';
import { openInSheet } from '../lib/browser';
import { Capacitor } from '@capacitor/core';
import { haptic, hapticNotify } from '../lib/haptics';
import { priceOf, reportTransaction } from '../lib/purchase';
import { logAb } from '../lib/abtest';
import { type Selection } from './DestinationScreen';
import { planName, periodWord } from '../lib/terms';
import { useLayout, contentColumn, type Layout } from '../lib/layout';

type Stage = 'email' | 'card' | 'buying' | 'recording' | 'issuing' | 'slow' | 'ready' | 'pending' | 'failed';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Retired: the last email typed on this phone, which pre-filled one
// account's email into another account's purchase. Cleared on sight.
const OLD_EMAIL_KEY = 'ringo_last_email';
const POLL_MS = 3000;
const POLL_TRIES = 40;

// An inline link inside the small print: padded to a 44pt hit area, and the
// padding taken back with a negative margin so the line keeps its height.
const inlineLink = (): CSSProperties => ({ border: 'none', background: 'transparent', padding: '14px 0', margin: '-14px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 700, color: RC.orangeInk, verticalAlign: 'baseline', textDecoration: 'underline', textUnderlineOffset: 2 });

export function CheckoutScreen({ selection, onBack, onReady }: { selection: Selection; onBack: () => void; onReady: () => void }) {
  const l = useLayout();
  const signedInEmail = (account.get()?.email || '').trim();
  const [email, setEmail] = useState(signedInEmail);
  const [stage, setStage] = useState<Stage>('email');
  const [err, setErr] = useState<string | null>(null);
  // Set when the email typed is not the signed-in account's: asked once.
  const [otherEmail, setOtherEmail] = useState<string | null>(null);
  const confirmedOther = useRef<string | null>(null);

  const mounted = useRef(true);
  const pollRef = useRef<number | null>(null);
  const stopPolling = () => { if (pollRef.current) { window.clearTimeout(pollRef.current); pollRef.current = null; } };
  useEffect(() => {
    mounted.current = true;
    try { localStorage.removeItem(OLD_EMAIL_KEY); } catch { /* ignore */ }
    return () => { mounted.current = false; stopPolling(); };
  }, []);

  // Leaving mid-purchase would hide what happened to the payment.
  useBlockSwipeBack(!['email', 'failed', 'ready', 'pending', 'slow'].includes(stage));
  // A listener of the card sheet, removed when the screen goes.
  const cardCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => { cardCleanup.current?.(); }, []);

  const p = selection.plan;
  const price = priceOf(p, selection.product);
  const renewing = p.mode === 'subscription';
  const isGlobal = selection.destination === 'global';

  const stageRef = useRef<Stage>('email');
  const setStageBoth = (s: Stage) => { if (!mounted.current) return; stageRef.current = s; setStage(s); };

  // After the site has recorded the purchase, wait for THIS purchase's eSIM:
  // the site only returns `install` for a subscription matching the
  // transaction reference, so an older eSIM on the account never reads as
  // the new one being ready.
  const waitForEsim = () => {
    const acct = account.get();
    if (!acct) { setStageBoth('slow'); return; }
    const ref = acct.purchaseRef;
    let tries = 0;
    setStageBoth('issuing');
    const tick = async () => {
      if (!mounted.current) return;
      tries++;
      try {
        const d = await light.subscription(acct.userId, acct.t, ref ? { install: ref } : {});
        if (!mounted.current) return;
        const done = ref ? Boolean(d.install) : Boolean(d.subscription?.esim_attached);
        if (done) { stopPolling(); hapticNotify('success'); setStageBoth('ready'); return; }
      } catch { /* next tick */ }
      if (!mounted.current) return;
      if (tries >= POLL_TRIES) { stopPolling(); setStageBoth('slow'); return; }
      pollRef.current = window.setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
  };

  // Sign in with Apple can hand us a Hide My Email relay address. Apple's
  // relay refuses senders that are not registered with Apple, so mail to it
  // bounces: the app must not tell anyone to go and look for it. The eSIM
  // itself is always here, under My eSIM.
  const relayEmail = /@privaterelay\.appleid\.com$/i.test(email.trim());

  // The email checks both buttons share; the address, or null after saying why.
  const checkedEmail = (): string | null => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter the email your eSIM should be sent to.'); return null; }
    if (signedInEmail && e !== signedInEmail.toLowerCase() && confirmedOther.current !== e) { setErr(null); setOtherEmail(e); return null; }
    setErr(null);
    setOtherEmail(null);
    return e;
  };

  // Card: Stripe's hosted page in the sheet; Stripe says when it is paid.
  const payByCard = async () => {
    const e = checkedEmail();
    if (!e) return;
    haptic('medium');
    setStageBoth('card');
    let session: string;
    let url: string;
    try {
      const r = await light.cardCheckout({ plan: p.plan, destination: selection.destination, data_gb: selection.data_gb, email: e, currency: p.currency });
      url = r.url;
      session = r.id || (r.url.match(/cs_(live|test)_[A-Za-z0-9]+/)?.[0] ?? '');
      if (!session) throw new Error('The card payment could not be started.');
    } catch (ex) {
      if (!mounted.current) return;
      setErr((ex as Error).message || 'The card payment could not be started.');
      setStageBoth('email');
      return;
    }
    let closed = false;
    let done = false;
    let afterClose = 0;
    const finishCard = () => { done = true; cardCleanup.current?.(); cardCleanup.current = null; };
    const tick = async () => {
      if (!mounted.current || done) return;
      try {
        const st = await light.cardStatus(session);
        if (!mounted.current || done) return;
        if (st.paid && st.user_id && st.t) {
          finishCard();
          account.set({ userId: st.user_id, t: st.t, email: e, purchaseRef: session });
          logAb('purchase', { destination: selection.destination, plan: p.plan, product: 'stripe' });
          if (Capacitor.isNativePlatform()) { const { Browser } = await import('@capacitor/browser'); void Browser.close().catch(() => {}); }
          waitForEsim();
          return;
        }
        // Paid, the account a few seconds behind: keep asking. Not paid
        // and the sheet shut a while ago: they left the page.
        if (!st.paid && closed && ++afterClose > 3) { finishCard(); setErr(null); setStageBoth('email'); return; }
      } catch { /* next tick */ }
      pollRef.current = window.setTimeout(() => void tick(), POLL_MS);
    };
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      const { App: CapApp } = await import('@capacitor/app');
      const h1 = await Browser.addListener('browserFinished', () => { closed = true; });
      // The return page hands back with ringo://checkout: shut the sheet.
      const h2 = await CapApp.addListener('appUrlOpen', ({ url: u }) => { if (u.startsWith('ringo://checkout')) { closed = true; void Browser.close().catch(() => {}); } });
      cardCleanup.current = () => { void h1.remove(); void h2.remove(); };
    }
    await openInSheet(url);
    void tick();
  };

  const buy = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setErr('Enter the email your eSIM should be sent to.'); return; }
    if (!selection.product && iapAvailable()) { setErr('This plan is not available in the App Store right now.'); return; }
    // Signed in, but buying for another email: the eSIM would belong to
    // that email's account and the phone would switch to it. Ask first.
    if (signedInEmail && e !== signedInEmail.toLowerCase() && confirmedOther.current !== e) { setErr(null); setOtherEmail(e); return; }
    setErr(null);
    setOtherEmail(null);
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
      if (!mounted.current) return;
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
      if (!mounted.current) return;
      setErr((ex as Error).message || 'Could not record the purchase.');
      setStageBoth('failed');
    }
  };

  const confirmOther = () => { if (otherEmail) { confirmedOther.current = otherEmail; void buy(); } };
  const useSignedIn = () => { setEmail(signedInEmail); setOtherEmail(null); confirmedOther.current = null; };

  const planLine = isGlobal && renewing ? 'Unlimited, renews monthly' : `${planName(p)}${renewing ? '' : ', one payment'}`;
  // Card where the hosted page charges what this screen shows.
  const cardOk = !renewing && !p.app_only && !p.member_pct;
  const cardPrice = priceOf(p, null);
  const buyLabel = renewing ? `Subscribe for ${price.total}` : cardOk ? `App Store, ${price.total}` : `Buy for ${price.total}`;

  // ── Pieces ────────────────────────────────────────────────────────────────
  const summary = <Summary l={l} selection={selection} planLine={planLine} total={price.total} renewing={renewing} />;

  const form = stage === 'email' && (
    <div>
      <FieldLabel htmlFor="checkout-email">Your email</FieldLabel>
      <Input
        id="checkout-email"
        name="email"
        value={email}
        onChange={(v) => { setEmail(v); setOtherEmail(null); if (err) setErr(null); }}
        placeholder="you@example.com"
        type="email"
        inputMode="email"
        autoComplete="email"
        invalid={Boolean(err) && !EMAIL_RE.test(email.trim())}
        onEnter={() => void buy()}
      />
      <HelpText style={{ fontSize: 15, color: RC.ink2, lineHeight: 1.45 }}>
        {relayEmail
          ? 'Your eSIM installs here in the app. Apple hides this address, so use a real one if you also want it by email.'
          : 'Your activation code and receipt go here.'}
      </HelpText>
      {otherEmail && (
        <div role="alert" style={{ marginTop: 14, ...cardSurface(), padding: 16 }}>
          <div style={{ ...TYPE.bodyStrong, color: RC.ink }}>Buy for {otherEmail}?</div>
          <div style={{ marginTop: 6, ...TYPE.small, color: RC.ink2, overflowWrap: 'anywhere' }}>
            You are signed in as {signedInEmail}. This eSIM will belong to the account for {otherEmail}, and the app will switch to it.
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RingoButton onClick={confirmOther}>Yes, use this email</RingoButton>
            <RingoButton variant="secondary" onClick={useSignedIn}>Use my account email</RingoButton>
          </div>
        </div>
      )}
      {err && <ErrorBox style={{ marginTop: 12 }}>{err}</ErrorBox>}
    </div>
  );

  const renewBox = stage === 'email' && renewing && (
    <div style={{ padding: '14px 16px', borderRadius: RADIUS.sm, background: RC.cream, border: `1px solid ${RC.line}` }}>
      <div style={{ ...TYPE.small, fontWeight: 700, color: RC.ink }}>Renews at {price.total} every {periodWord(p)} until you cancel.</div>
      <div style={{ marginTop: 6, ...TYPE.caption, color: RC.inkMute }}>
        Cancel in Settings, then Apple ID, then Subscriptions, at least 24 hours before a renewal. No minimum term: cancel any time and keep the {periodWord(p)} you paid for. Charged to your Apple ID when you confirm.
      </div>
    </div>
  );

  const terms = stage === 'email' && (
    <div style={{ ...TYPE.caption, color: RC.inkMute }}>
      By buying you agree to the{' '}
      <button type="button" onClick={() => void openInSheet(`${SITE}/terms?app=1`)} style={inlineLink()}>Terms of Use</button>
      {' '}and the{' '}
      <button type="button" onClick={() => void openInSheet(`${SITE}/privacy?app=1`)} style={inlineLink()}>Privacy Policy</button>
      . Prices include VAT.
    </div>
  );

  const status = (
    <>
      {stage === 'card' && <Waiting title="Pay on the secure page" sub="Any card from any country, or Apple Pay. Your eSIM starts the moment Stripe confirms." />}
      {stage === 'buying' && <Waiting title="Confirm with your Apple ID" sub="Nothing is charged until you confirm." />}
      {stage === 'recording' && <Waiting title="Payment confirmed" sub="Recording your purchase. One moment." />}
      {stage === 'issuing' && <Waiting title="Preparing your eSIM" sub={relayEmail ? 'Under a minute. It lands under My eSIM, here in the app.' : 'Under a minute. It lands under My eSIM and in your email.'} />}
      {stage === 'slow' && <Waiting ok title="Your eSIM is on its way" sub={relayEmail ? 'It is taking a little longer than usual. It appears under My eSIM as soon as it is ready.' : 'It is taking a little longer than usual. It appears under My eSIM and in your email as soon as it is ready.'} />}
      {stage === 'pending' && <Waiting ok title="Waiting for approval" sub="This purchase needs approval (Ask to Buy). Once it is approved, open the app and your eSIM will be prepared." />}
      {stage === 'ready' && (
        <div className="rise" style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ width: 68, height: 68, margin: '0 auto', borderRadius: '50%', background: RC.gradCta, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -12px rgba(223,40,12,0.6)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 style={{ margin: '16px 0 0', ...typeFor('h1', l.size), color: RC.ink }}>Your eSIM is ready</h2>
          <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>Install it now, or later from My eSIM.</p>
        </div>
      )}
      {stage === 'failed' && (
        <ErrorBox>
          <div style={{ fontWeight: 700, color: RC.ink }}>Your payment went through, but we could not record it yet.</div>
          <div style={{ marginTop: 6, color: RC.ink2 }}>{err} The app tries again the next time it opens, so your purchase is not lost. If your eSIM is not under My eSIM within an hour, tap Help and contact us.</div>
        </ErrorBox>
      )}
    </>
  );

  // The no-refund consent sits directly above the buy button (owner
  // 2026-09-27: no refund once the eSIM is issued). UK Consumer Contracts
  // Regulations 2013 reg 37: the right to cancel digital content ends only
  // on an express request for immediate supply and an acknowledgement that
  // it is lost. Apple decides App Store refunds itself, so this neither
  // promises nor denies one.
  const consent = stage === 'email' && (
    <div data-refund-consent style={{ ...TYPE.caption, color: RC.inkMute, textAlign: l.isWide ? 'left' : 'center' }}>
      By buying you ask us to issue your eSIM straight away and accept that you lose your right to cancel once it is issued. {cardOk ? 'Card payments are processed by Stripe. ' : ''}Refunds for App Store purchases are handled by Apple.
    </div>
  );

  const action: ReactNode = (
    <>
      {stage === 'email' && cardOk && <RingoButton onClick={() => void payByCard()} disabled={Boolean(otherEmail)}>{`Pay ${cardPrice.total} by card or Apple Pay`}</RingoButton>}
      {stage === 'email' && <RingoButton variant={cardOk ? 'secondary' : undefined} onClick={() => void buy()} disabled={Boolean(otherEmail)}>{buyLabel}</RingoButton>}
      {stage === 'card' && <RingoButton variant="soft" onClick={() => { cardCleanup.current?.(); cardCleanup.current = null; stopPolling(); setStageBoth('email'); }}>Cancel</RingoButton>}
      {(stage === 'buying' || stage === 'recording') && <RingoButton loading>One moment</RingoButton>}
      {(stage === 'issuing' || stage === 'slow' || stage === 'failed') && <RingoButton variant="soft" onClick={onReady}>Go to My eSIM</RingoButton>}
      {stage === 'pending' && <RingoButton variant="soft" onClick={onReady}>Done</RingoButton>}
      {stage === 'ready' && <RingoButton onClick={onReady}>Install my eSIM</RingoButton>}
    </>
  );

  const header = <RingoHeader title={stage === 'ready' ? 'Your eSIM' : 'Checkout'} leading={stage === 'email' || stage === 'failed' ? <BackBtn onClick={onBack} /> : null} />;

  // ── Wide: photo card left, form and button right ──────────────────────────
  if (l.isWide) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {header}
        <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ ...contentColumn(l), display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 0 }}>{summary}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, maxWidth: 480 }}>
              {form}
              {status}
              {renewBox}
              {consent}
              {action}
              {terms}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phone: summary, form, sticky buy bar ──────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {header}
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${l.gutter}px ${stage === 'email' ? 260 : 150}px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {summary}
          {form}
          {status}
          {renewBox}
          {terms}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {consent}
        {action}
      </div>
    </div>
  );
}

/** The plan being bought: the place's photo with its name, then the plan and the price. */
function Summary({ l, selection, planLine, total, renewing }: { l: Layout; selection: Selection; planLine: string; total: string; renewing: boolean }) {
  const id = selection.destination;
  return (
    <div style={{ ...cardSurface(), overflow: 'hidden' }}>
      <div style={{ position: 'relative', aspectRatio: l.isWide ? '4 / 3' : '2 / 1', background: skyFor(id) }}>
        {hasMosaic(id)
          ? <PlaceMosaic id={id} />
          : (
            <img
              src={pictureFor(id)}
              alt=""
              decoding="async"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                const b = bundledPictureFor(id);
                if (b && !el.src.endsWith(b)) el.src = b;
                else el.style.display = 'none';
              }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, fontFamily: 'var(--font-display)', fontSize: l.isWide ? 28 : 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#fff', textShadow: PHOTO_TEXT_SHADOW, overflowWrap: 'anywhere' }}>
          {selection.destinationLabel}
        </div>
      </div>
      <div style={{ padding: `14px ${l.cardPad}px 16px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...TYPE.h3, color: RC.ink }}>{planLine}</div>
          {selection.plan.member_pct ? <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.purpleInk }}>Your Rewards price</div> : null}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ ...TYPE.price, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{total}</div>
          {renewing && <div style={{ marginTop: 2, ...TYPE.caption, color: RC.inkMute }}>today</div>}
        </div>
      </div>
    </div>
  );
}

function Waiting({ title, sub, ok = false }: { title: string; sub: string; ok?: boolean }) {
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
      {ok ? (
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: RC.successSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" stroke={RC.success} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      ) : (
        <div aria-hidden style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${RC.line}`, borderTopColor: RC.inkStrong, animation: 'ringoSpin 0.7s linear infinite' }} />
      )}
      <div style={{ marginTop: 14, ...TYPE.bodyStrong, color: RC.ink }}>{title}</div>
      <div style={{ marginTop: 6, ...TYPE.small, color: RC.ink2, maxWidth: 420 }}>{sub}</div>
    </div>
  );
}
