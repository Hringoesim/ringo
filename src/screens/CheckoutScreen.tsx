// CheckoutScreen: email, then the card (owner 2026-10-24: "accept any and
// all cards ... like Saily", then "card for everything", no App Store option).
// Stripe's hosted page in the browser sheet takes any card from any country,
// Apple Pay or Link (lib/cardPay.ts); the session, the price and the
// fulfilment are the website's (api/esim-checkout, client 'app', priced from
// the app's own catalogue line, Rewards member prices and day passes
// included). An eSIM is a service used outside the app, so App Review allows
// a payment that is not Apple's (guideline 3.1.3(e)). The app never decides
// it is paid: Stripe's word comes from /api/light-status, then the screen
// waits for this purchase's eSIM.
//
// Global renews by card every month with no minimum term (owner 2026-10-24)
// until renewal is turned off under My eSIM; this screen says so before the
// button, with the Terms of Use and the Privacy Policy.
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
import { SaturnWorld } from '../components/SaturnWorld';
import { Lock, SecureLine, PayMethods } from '../components/PayMarks';
import { RC, RADIUS, TYPE, typeFor, cardSurface, LOGO_GRAD, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { BackBtn, FieldLabel, Input, HelpText, ErrorBox } from '../components/ui';
import { useBlockSwipeBack } from '../components/ScreenHost';
import { hasMosaic, pictureFor, skyFor, bundledPictureFor } from '../data/destinations';
import { light, SITE } from '../api/light';
import { account } from '../store/account';
import { openInSheet } from '../lib/browser';
import { payByCard as startCard, waitForOwner } from '../lib/cardPay';
import { haptic, hapticNotify, hapticSelection } from '../lib/haptics';
import { priceOf } from '../lib/purchase';
import { logAb } from '../lib/abtest';
import { type Selection } from './DestinationScreen';
import { planName, periodWord } from '../lib/terms';
import { useLayout, contentColumn, type Layout } from '../lib/layout';

type Stage = 'email' | 'card' | 'checking' | 'issuing' | 'slow' | 'ready';

// The same bright orange as Continue on the plan page (owner 2026-10-27).
const PAY_STYLE = { background: '#F26122', color: '#FFFFFF', boxShadow: '0 10px 22px -16px rgba(242,97,34,0.8)' };
const SUCCESS_GRAD = 'linear-gradient(135deg, #5FD49A 0%, #1FA463 100%)';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Retired: the last email typed on this phone, which pre-filled one
// account's email into another account's purchase. Cleared on sight.
const OLD_EMAIL_KEY = 'ringo_last_email';
const POLL_MS = 3000;
const POLL_TRIES = 40;

// An inline link inside the small print: padded to a 44pt hit area, and the
// padding taken back with a negative margin so the line keeps its height.
const inlineLink = (): CSSProperties => ({ border: 'none', background: 'transparent', padding: '14px 0', margin: '-14px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit', fontWeight: 700, color: RC.ink, verticalAlign: 'baseline', textDecoration: 'underline', textUnderlineOffset: 2 });

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
  useBlockSwipeBack(!['email', 'ready', 'slow'].includes(stage));
  // The card payment being waited on, stopped when the screen goes.
  const cardStop = useRef<(() => void) | null>(null);
  useEffect(() => () => { cardStop.current?.(); }, []);

  const p = selection.plan;
  // The site's price: what Stripe's page charges.
  const price = priceOf(p, null);
  const renewing = p.mode === 'subscription';
  const isGlobal = selection.destination === 'global';

  // Ringo credit (earned back on every plan by Rewards level): the balance,
  // and whether to spend it here. The site decides how much comes off, never
  // under cost, and Stripe's sheet shows the exact amount. Not on Global's month.
  const [creditCents, setCreditCents] = useState(0);
  const [useCredit, setUseCredit] = useState(true);
  useEffect(() => {
    const acct = account.get();
    if (!acct || renewing) return;
    light.profile(acct.userId, acct.t).then((pr) => { if (mounted.current) setCreditCents(pr.credit?.balance_cents || 0); }).catch(() => {});
  }, [renewing]);
  const creditHere = creditCents > 0 && !renewing && (!signedInEmail || email.trim().toLowerCase() === signedInEmail.toLowerCase());

  const stageRef = useRef<Stage>('email');
  // A long wait on Stripe (a slow bank) gets a way out after 15 seconds.
  const [cardSlow, setCardSlow] = useState(false);
  useEffect(() => {
    if (stage !== 'card') { setCardSlow(false); return; }
    const t = window.setTimeout(() => setCardSlow(true), 15000);
    return () => window.clearTimeout(t);
  }, [stage]);
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

  // Card: Stripe's payment sheet inside the app; Stripe says when it is paid.
  const payByCard = async () => {
    // One payment at a time: Enter and a tap, or two quick taps, start one sheet.
    if (stageRef.current !== 'email') return;
    const e = checkedEmail();
    if (!e) return;
    haptic('medium');
    setStageBoth('card');
    // The account this checkout started under: a late answer never switches
    // the app to the buyer's account once someone else has signed in.
    const startedAs = account.get()?.userId ?? null;
    const sameAccount = () => (account.get()?.userId ?? null) === startedAs;
    // Paid (or still being confirmed): the account follows the moment the site names it.
    const follow = (query: Parameters<typeof waitForOwner>[0], session: string) => {
      void waitForOwner(query, sameAccount).then((o) => {
        if (!o || !sameAccount()) return;
        account.set({ userId: o.userId, t: o.t, email: e, purchaseRef: session });
        if (mounted.current && (stageRef.current === 'slow' || stageRef.current === 'checking')) waitForEsim();
      });
    };
    try {
      const pay = await startCard({ plan: p.plan, destination: selection.destination, data_gb: selection.data_gb, email: e, currency: p.currency, useCredit: creditHere && useCredit });
      cardStop.current = pay.stop;
      const out = await pay.done;
      cardStop.current = null;
      if (!mounted.current) return;
      if (out.state === 'left') { setStageBoth('email'); return; }
      // Not confirmed yet: keep asking, like a received payment, instead of stopping on "checking".
      if (out.state === 'unconfirmed') { setStageBoth('checking'); follow(out.query, out.session); return; }
      if (out.state === 'received') {
        hapticNotify('success');
        setStageBoth('slow');
        follow(out.query, out.session);
        return;
      }
      account.set({ userId: out.userId, t: out.t, email: e, purchaseRef: out.session });
      logAb('purchase', { destination: selection.destination, plan: p.plan, product: 'stripe' });
      waitForEsim();
    } catch (ex) {
      if (!mounted.current) return;
      setErr((ex as Error).message || 'The payment could not be started. Nothing was charged.');
      setStageBoth('email');
    }
  };

  const confirmOther = () => { if (otherEmail) { confirmedOther.current = otherEmail; void payByCard(); } };
  const useSignedIn = () => { setEmail(signedInEmail); setOtherEmail(null); confirmedOther.current = null; };

  const planLine = isGlobal && renewing ? 'Unlimited, renews monthly' : `${planName(p)}${renewing ? '' : ', one payment'}`;
  const buyLabel = renewing ? `Subscribe securely, ${price.total} a month` : creditHere && useCredit ? `Pay up to ${price.total} securely` : `Pay ${price.total} securely`;

  // ── Pieces ────────────────────────────────────────────────────────────────
  const summary = <Summary l={l} selection={selection} planLine={planLine} total={price.total} renewing={renewing} />;

  const form = stage === 'email' && signedInEmail && !otherEmail && email.trim().toLowerCase() === signedInEmail.toLowerCase() ? (
    <div>
      <div style={{ ...TYPE.small, color: RC.ink2, overflowWrap: 'anywhere' }}>
        {relayEmail ? 'Your eSIM installs here in the app.' : <>Receipt and activation code to <b style={{ color: RC.ink }}>{signedInEmail}</b></>}
      </div>
      {err && <ErrorBox style={{ marginTop: 12 }}>{err}</ErrorBox>}
    </div>
  ) : stage === 'email' && (
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
        onEnter={() => void payByCard()}
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

  // Said once, right above the button (the summary and the button already say "monthly").
  const renewLine = stage === 'email' && renewing && (
    <div style={{ ...TYPE.small, fontWeight: 700, color: RC.ink, textAlign: 'center' }}>Renews every {periodWord(p)}. Turn it off any time in My eSIM.</div>
  );

  const creditBox = stage === 'email' && creditHere && (
    <div style={{ padding: '12px 16px', borderRadius: RADIUS.sm, background: RC.cream, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyStrong, color: RC.ink }}>Use Ringo credit</div>
        <div style={{ ...TYPE.small, color: RC.ink2, marginTop: 2 }}>{`€${(creditCents / 100).toFixed(2)} available`}</div>
      </div>
      <button type="button" role="switch" aria-checked={useCredit} aria-label="Use Ringo credit" className="press"
        onClick={() => { hapticSelection(); setUseCredit(!useCredit); }}
        style={{ width: 51, height: 31, borderRadius: 16, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, background: useCredit ? RC.tick : RC.lineStrong, transition: 'background .2s' }}>
        <span style={{ display: 'block', width: 27, height: 27, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transform: useCredit ? 'translateX(20px)' : 'none', transition: 'transform .2s' }} />
      </button>
    </div>
  );

  const terms = stage === 'email' && (
    <div style={{ ...TYPE.caption, color: RC.inkMute, textAlign: 'center' }}>
      By buying you agree to the{' '}
      <button type="button" onClick={() => void openInSheet(`${SITE}/terms?app=1`)} style={inlineLink()}>Terms of Use</button>
      {' '}and the{' '}
      <button type="button" onClick={() => void openInSheet(`${SITE}/privacy?app=1`)} style={inlineLink()}>Privacy Policy</button>
      .
    </div>
  );

  const status = (
    <>
      {stage === 'card' && <Journey key="card" leg="card" sub={cardSlow ? 'Still confirming your payment. Your eSIM appears under My eSIM the moment it goes through.' : 'Your eSIM starts the moment your payment goes through.'} />}
      {stage === 'checking' && <Waiting title="Checking your payment" sub="Your payment is not confirmed yet. If it went through, your eSIM appears under My eSIM. Look there before paying again." />}
      {stage === 'issuing' && <Journey key="issuing" leg="issuing" sub={relayEmail ? 'Under a minute. It lands under My eSIM, here in the app.' : 'Under a minute. It lands under My eSIM and in your email.'} />}
      {stage === 'slow' && <Journey key="slow" leg="slow" sub={relayEmail ? 'It is taking a little longer than usual. It appears under My eSIM as soon as it is ready.' : 'It is taking a little longer than usual. It appears under My eSIM and in your email as soon as it is ready.'} />}
    </>
  );

  // Payment complete: the moment, then what was bought. The tick is green (owner 2026-10-27).
  const moment = stage === 'ready' && (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 112, height: 112, marginTop: 12 }}>
        <div aria-hidden className="success-halo" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: SUCCESS_GRAD }} />
        <div aria-hidden className="success-halo" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: SUCCESS_GRAD, animationDelay: '0.6s' }} />
        <div className="success-in" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: SUCCESS_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 40px -14px rgba(31,164,99,0.6)' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden><path className="success-tick" d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <h2 className="rise" style={{ margin: '26px 0 0', ...typeFor('display', l.size), color: RC.ink, animationDelay: '0.2s' }}>Your eSIM is ready</h2>
      <p className="rise" style={{ margin: '10px 0 0', ...TYPE.body, color: RC.ink2, maxWidth: 340, animationDelay: '0.28s' }}>Payment received. Install it now, or any time later from My eSIM.</p>
      <div className="rise" style={{ width: '100%', marginTop: 28, animationDelay: '0.36s' }}>
        <Recap l={l} selection={selection} planLine={planLine} total={price.total} renewing={renewing} period={periodWord(p)} email={relayEmail ? null : email.trim()} />
      </div>
    </div>
  );

  // Above the button: the Terms agreement only (owner 2026-10-24, "hide the
  // disclaimer within the terms of use"). The right to cancel ending once
  // the eSIM is issued lives in the Terms (section 6), as on the website,
  // where Stripe's Pay button carries the same agreement.
  const consent = (stage === 'email' && (
    <>
      {renewLine}
      {terms}
      <SecureLine />
    </>
  ));

  const action: ReactNode = (
    <>
      {stage === 'email' && <RingoButton onClick={() => void payByCard()} disabled={Boolean(otherEmail)} style={PAY_STYLE}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Lock size={17} color="#fff" />{buyLabel}</span></RingoButton>}
      {stage === 'email' && <PayMethods />}
      {(stage === 'issuing' || stage === 'slow' || stage === 'checking' || (stage === 'card' && cardSlow)) && <RingoButton variant="soft" onClick={onReady}>Go to My eSIM</RingoButton>}
      {stage === 'ready' && <RingoButton onClick={onReady}>Install my eSIM</RingoButton>}
    </>
  );

  const header = <RingoHeader title={stage === 'ready' ? undefined : 'Checkout'} leading={stage === 'email' ? <BackBtn onClick={onBack} /> : null} />;
  // Paid or paying: the plan shrinks to one row, the status takes the screen.
  const top = stage === 'email' ? summary : stage === 'ready' ? null : <Compact l={l} selection={selection} planLine={planLine} total={price.total} />;
  const waiting = stage !== 'email' && stage !== 'ready' && <div style={{ paddingTop: l.isWide ? 0 : 36 }}>{status}</div>;

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
              {waiting}
              {moment}
              {creditBox}
              {consent}
              {action}
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
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${l.gutter}px ${stage === 'email' ? 330 : 150}px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {top}
          {form}
          {waiting}
          {moment}
          {creditBox}
        </div>
      </div>
      <div data-kb-hide style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      <div style={{ position: 'relative', aspectRatio: l.isWide ? '4 / 3' : '5 / 2', background: skyFor(id) }}>
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

/** The place's photo, small: the same picture as the summary card. */
function Thumb({ id, size }: { id: string; size: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: RADIUS.sm, overflow: 'hidden', flexShrink: 0, background: skyFor(id) }}>
      {hasMosaic(id)
        ? <PlaceMosaic id={id} />
        : <img src={pictureFor(id)} alt="" decoding="async" onError={(e) => { const el = e.currentTarget as HTMLImageElement; const b = bundledPictureFor(id); if (b && !el.src.endsWith(b)) el.src = b; else el.style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
    </div>
  );
}

/** While paying: the plan as one row, so the status has the screen. */
function Compact({ l, selection, planLine, total }: { l: Layout; selection: Selection; planLine: string; total: string }) {
  return (
    <div style={{ ...cardSurface(), padding: `12px ${l.cardPad}px`, display: 'flex', alignItems: 'center', gap: 14 }}>
      <Thumb id={selection.destination} size={52} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyStrong, color: RC.ink, overflowWrap: 'anywhere' }}>{selection.destinationLabel}</div>
        <div style={{ ...TYPE.small, color: RC.ink2 }}>{planLine}</div>
      </div>
      <div style={{ ...TYPE.bodyStrong, color: RC.ink, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{total}</div>
    </div>
  );
}

/** Payment complete: what was bought, what was paid, where the receipt went. */
function Recap({ l, selection, planLine, total, renewing, period, email }: { l: Layout; selection: Selection; planLine: string; total: string; renewing: boolean; period: string; email: string | null }) {
  const row = (label: string, value: ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, padding: '12px 0', borderTop: `1px solid ${RC.line}` }}>
      <div style={{ ...TYPE.small, color: RC.ink2, flexShrink: 0 }}>{label}</div>
      <div style={{ ...TYPE.small, fontWeight: 700, color: RC.ink, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );
  return (
    <div style={{ ...cardSurface(), padding: `16px ${l.cardPad}px 4px`, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 14 }}>
        <Thumb id={selection.destination} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...TYPE.h2, color: RC.ink, overflowWrap: 'anywhere' }}>{selection.destinationLabel}</div>
          <div style={{ marginTop: 2, ...TYPE.small, color: RC.ink2 }}>{planLine}</div>
        </div>
      </div>
      {row('Paid', <span style={{ fontVariantNumeric: 'tabular-nums' }}>{total}</span>)}
      {renewing && row('Renews', `Every ${period}, turn off in My eSIM`)}
      {email && row('Receipt sent to', email)}
    </div>
  );
}

// From paid to ready, told as the eSIM's trip to you (owner 2026-10-27:
// "it's stuck in traffic, it's rushing to the airport, it's queuing"). The
// bar only creeps towards each leg's end, so it never claims to be done; the
// facts (where it lands, how long) stay in the line underneath.
type Leg = 'card' | 'issuing' | 'slow';
const LEGS: Record<Leg, { from: number; to: number; title: string; lines: string[] }> = {
  card: { from: 0.04, to: 0.3, title: 'Confirming your payment', lines: ['Shaking hands with your bank', 'Counting the coins twice', 'Getting the green light'] },
  issuing: { from: 0.34, to: 0.9, title: 'Preparing your eSIM', lines: ['Packing your eSIM', 'Rushing to the airport', 'Queuing at check in', 'Through security', 'Boarding now', 'Almost there'] },
  slow: { from: 0.9, to: 0.97, title: 'Your eSIM is on its way', lines: ['Stuck in a bit of traffic', 'Still queuing, nearly at the front', 'Taking the scenic route', 'Almost there'] },
};
const STEPS = ['Payment', 'Preparing', 'Ready'];
// Long enough to read each line without rushing (owner 2026-10-27).
const TIP_S = 6;

function Journey({ leg, sub }: { leg: Leg; sub: string }) {
  const L = LEGS[leg];
  const [t, setT] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setT((Date.now() - started) / 1000), 250);
    return () => window.clearInterval(id);
  }, []);
  // Eases towards the leg's end and stays just short of it.
  const progress = L.from + (L.to - L.from) * (1 - Math.exp(-t / 12));
  const line = L.lines[Math.floor(t / TIP_S) % L.lines.length];
  const step = leg === 'card' ? 0 : 1;
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <SaturnWorld size={132} satellite />
      <div style={{ marginTop: 18, ...TYPE.h2, color: RC.ink }}>{L.title}</div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 28, marginTop: 20 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 9, height: 10, borderRadius: 5, background: RC.line }} />
        {/* The logo's gradient across the whole track, uncovered as the bar fills. */}
        <div style={{ position: 'absolute', left: 0, top: 9, height: 10, borderRadius: 5, width: `${progress * 100}%`, background: LOGO_GRAD, backgroundSize: `${100 / progress}% 100%`, transition: 'width .25s linear, background-size .25s linear' }} />
        <div aria-hidden style={{ position: 'absolute', top: 2, left: `calc(${progress * 100}% - 12px)`, width: 24, height: 24, transition: 'left .25s linear' }}>
          {/* A little contrail, one streak per wing, fading out behind the plane. */}
          <div style={{ position: 'absolute', right: 14, top: 9.5, width: 44, height: 1.5, borderRadius: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))', opacity: Math.min(1, progress * 6) }} />
          <div style={{ position: 'absolute', right: 14, top: 13, width: 44, height: 1.5, borderRadius: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))', opacity: Math.min(1, progress * 6) }} />
          <svg width="24" height="24" viewBox="0 0 24 24" fill={RC.pink} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" style={{ transform: 'rotate(90deg)', paintOrder: 'stroke', display: 'block' }}><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 360, marginTop: 8 }}>
        {STEPS.map((s, i) => <div key={s} style={{ ...TYPE.caption, fontWeight: i <= step ? 700 : 500, color: i <= step ? RC.ink : RC.inkMute }}>{s}</div>)}
      </div>
      <div key={line} className="rise" style={{ marginTop: 22, ...TYPE.bodyStrong, color: RC.orangeInk }}>{line}</div>
      <div style={{ marginTop: 6, ...TYPE.small, color: RC.ink2, maxWidth: 420 }}>{sub}</div>
    </div>
  );
}

function Waiting({ title, sub }: { title: string; sub: string }) {
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
      <SaturnWorld size={112} />
      <div style={{ marginTop: 18, ...TYPE.bodyStrong, color: RC.ink }}>{title}</div>
      <div style={{ marginTop: 6, ...TYPE.small, color: RC.ink2, maxWidth: 420 }}>{sub}</div>
    </div>
  );
}
