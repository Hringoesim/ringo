// cardPay.ts — paying by card (owner 2026-10-24, "card for everything"; and
// the same day, "our own embedded check out to minimise risk"): Stripe's
// native payment sheet inside the app (PaymentSheetPlugin.swift), any card,
// Link or Apple Pay, no browser. ringoesim.com mints the intent at the app's
// own catalogue line (api/app-pay.js); the app never decides a payment is
// done, it asks /api/light-status, Stripe's own word, until it is paid.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { light } from '../api/light';
import { account } from '../store/account';

interface SheetResult { status: 'completed' | 'canceled' | 'failed'; message?: string }
const Sheet = registerPlugin<{ present(o: { clientSecret: string; publishableKey: string; email?: string; buttonLabel?: string }): Promise<SheetResult> }>('PaymentSheet');

const POLL_MS = 2500;
// Paid, the account a few seconds behind: how long to keep asking before
// saying "on its way" (the eSIM still lands under My eSIM and by email).
const OWNER_WAIT_MS = 90_000;

export type StatusQuery = { pi: string } | { sub: string };
export interface CardOrder { plan: string; destination: string; data_gb?: number | null; email: string; currency?: string; topUp?: boolean; subscription?: string }
export type CardOutcome =
  | { state: 'paid'; session: string; userId: string; t: string }
  /** Stripe says paid; the account is not named yet (or a top-up, which has none to name). */
  | { state: 'received'; session: string; query: StatusQuery }
  /** The sheet confirmed but Stripe has not said paid yet (a slow bank): never told it is paid. */
  | { state: 'unconfirmed'; session: string; query: StatusQuery }
  | { state: 'left' };

export interface CardPayment {
  /** Settles once Stripe says paid (and, for a plan, the site names the owner), or once the buyer left. */
  done: Promise<CardOutcome>;
  /** Stop waiting (the screen went away). */
  stop: () => void;
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

const NOT_STARTED = 'The payment could not be started. Nothing was charged. Please try again.';
const NOT_THROUGH = 'The payment did not go through. Nothing was charged.';
// What the buyer reads: a sentence, never a code ("missing_secret", "Unknown plan").
function buyerMessage(e: unknown): string {
  const m = (e as Error)?.message || '';
  if (!m || /^[a-z_]+$/.test(m) || /^unknown plan$/i.test(m) || /^could not start checkout$/i.test(m)) return NOT_STARTED;
  return m;
}

/** Paid with the account not named yet: keep asking quietly, for up to ten minutes. */
export async function waitForOwner(query: StatusQuery, stillWanted: () => boolean = () => true): Promise<{ userId: string; t: string } | null> {
  const until = Date.now() + 10 * 60_000;
  while (Date.now() < until && stillWanted()) {
    try {
      const st = await light.cardStatus(query);
      if (st.paid && st.user_id && st.t) return { userId: st.user_id, t: st.t };
    } catch { /* next tick */ }
    await wait(5000);
  }
  return null;
}

/** Mint the intent, show the sheet, and wait for Stripe's word. Throws with a message the buyer can read. */
export async function payByCard(order: CardOrder): Promise<CardPayment> {
  if (!Capacitor.isNativePlatform()) throw new Error('Payments are taken in the Ringo iPhone app.');
  try {
    return await start(order);
  } catch (e) {
    throw new Error(buyerMessage(e));
  }
}

async function start(order: CardOrder): Promise<CardPayment> {
  // The member's account rides along so the sheet charges their Rewards price.
  const acct = account.get();
  // A top-up always needs it; a plan for someone else's email is at list price.
  const mine = acct && (order.topUp || !acct.email || acct.email.toLowerCase() === order.email.toLowerCase());
  const r = await light.appPay({ ...order, ...(acct && mine ? { user: acct.userId, t: acct.t } : {}) });
  const ref = r.payment_intent_id || r.subscription_id || '';
  if (!r.client_secret || !r.publishable_key || !ref) throw new Error('The payment could not be started. Nothing was charged.');

  const query: StatusQuery = r.payment_intent_id ? { pi: r.payment_intent_id } : { sub: r.subscription_id! };
  let stopped = false;
  const stop = () => { stopped = true; };
  const done = (async (): Promise<CardOutcome> => {
    const out = await Sheet.present({ clientSecret: r.client_secret, publishableKey: r.publishable_key!, email: order.email });
    if (out.status === 'canceled') return { state: 'left' };
    if (out.status === 'failed') throw new Error(out.message || NOT_THROUGH);
    // The sheet says confirmed; Stripe's own record says paid before the buyer is told.
    const started = Date.now();
    let paidSeen = false;
    while (!stopped) {
      try {
        const st = await light.cardStatus(query);
        if (st.paid) {
          paidSeen = true;
          if (order.topUp) return { state: 'received', session: ref, query };
          if (st.user_id && st.t) return { state: 'paid', session: ref, userId: st.user_id, t: st.t };
        }
      } catch { /* next tick */ }
      if (Date.now() - started > OWNER_WAIT_MS) return paidSeen ? { state: 'received', session: ref, query } : { state: 'unconfirmed', session: ref, query };
      await wait(POLL_MS);
    }
    return paidSeen ? { state: 'received', session: ref, query } : { state: 'unconfirmed', session: ref, query };
  })().catch((e: unknown) => { throw new Error(buyerMessage(e)); });
  return { done, stop };
}

/** Every plan and top-up is paid by card (owner 2026-10-24: no App Store option). Prices are the site's, not StoreKit's. */
export const CARD_PAYMENTS = true;
