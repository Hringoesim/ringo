// cardPay.ts — paying by card (owner 2026-10-24, "card for everything"):
// Stripe's hosted page in the browser sheet, any card from any country,
// Apple Pay or Link. The session and the fulfilment are the website's
// (api/esim-checkout with client 'app', priced from the app's own catalogue
// line); the app never decides a payment is done, it asks /api/light-status,
// Stripe's own word, until the payment is paid and the site has the owner.
import { Capacitor } from '@capacitor/core';
import { light } from '../api/light';
import { account } from '../store/account';
import { openInSheet } from './browser';

const POLL_MS = 3000;
// After the sheet shuts unpaid, this many more answers before calling it left.
const AFTER_CLOSE = 4;

export interface CardOrder { plan: string; destination: string; data_gb?: number | null; email: string; currency?: string }
export type CardOutcome = { state: 'paid'; session: string; userId: string; t: string } | { state: 'left' };

export interface CardPayment {
  /** Settles once Stripe says paid and the site names the owner, or once the buyer left. */
  done: Promise<CardOutcome>;
  /** Stop waiting (the screen went away, or Cancel). */
  stop: () => void;
}

/** Mint the session, open Stripe's page, and wait. Throws if the session cannot be started. */
export async function payByCard(order: CardOrder): Promise<CardPayment> {
  // The member's account rides along so the page charges their Rewards price.
  const acct = account.get();
  const r = await light.cardCheckout({ ...order, ...(acct ? { user: acct.userId, t: acct.t } : {}) });
  const session = r.id || (r.url.match(/cs_(live|test)_[A-Za-z0-9]+/)?.[0] ?? '');
  if (!session) throw new Error('The card payment could not be started.');

  let stopped = false;
  let closed = false;
  let afterClose = 0;
  let timer: number | null = null;
  const cleanups: (() => void)[] = [];
  const stop = () => { stopped = true; if (timer) window.clearTimeout(timer); cleanups.splice(0).forEach((f) => f()); };

  const done = new Promise<CardOutcome>((resolve) => {
    const tick = async () => {
      if (stopped) return;
      try {
        const st = await light.cardStatus(session);
        if (stopped) return;
        if (st.paid && st.user_id && st.t) {
          stop();
          if (Capacitor.isNativePlatform()) { const { Browser } = await import('@capacitor/browser'); void Browser.close().catch(() => {}); }
          resolve({ state: 'paid', session, userId: st.user_id, t: st.t });
          return;
        }
        // Paid with the account a few seconds behind: keep asking.
        if (!st.paid && closed && ++afterClose > AFTER_CLOSE) { stop(); resolve({ state: 'left' }); return; }
      } catch { /* next tick */ }
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };
    void (async () => {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        const { App: CapApp } = await import('@capacitor/app');
        const h1 = await Browser.addListener('browserFinished', () => { closed = true; });
        // The return page hands back with ringo://checkout: shut the sheet.
        const h2 = await CapApp.addListener('appUrlOpen', ({ url }) => { if (url.startsWith('ringo://checkout')) { closed = true; void Browser.close().catch(() => {}); } });
        cleanups.push(() => { void h1.remove(); void h2.remove(); });
      }
      await openInSheet(r.url);
      void tick();
    })();
  });
  return { done, stop };
}

/** Every plan and top-up is paid by card (owner 2026-10-24: no App Store option). Prices are the site's, not StoreKit's. */
export const CARD_PAYMENTS = true;
