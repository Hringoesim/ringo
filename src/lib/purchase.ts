// purchase.ts — the two pieces of the App Store purchase shared by screens:
// how a line's price reads (always Apple's on the phone) and how a paid
// transaction is reported to ringoesim.com and then finished.
import { light, money, type Plan , ApiError } from '../api/light';
import { account, pendingPurchase } from '../store/account';
import { finish, type IapProduct, type IapTransaction } from './iap';
import { subMonths } from './terms';

/** An amount in Apple's currency, formatted for this phone. */
export function appleMoney(n: number, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n); } catch { return `${currency} ${n.toFixed(2)}`; }
}

// What a line costs, in Apple's words. On the phone every price is the App
// Store's (currency and amount alike); the catalogue's figure is only the
// browser preview's stand-in. `total` is what one payment takes: the trip's
// price, or a subscription's whole term (Apple bills an Annual as one year,
// so its month is the year divided by 12, never the catalogue's month shown
// as the year). `monthly` is that total per month of the term.
export function priceOf(plan: Plan, product: IapProduct | null): { total: string; monthly: string; currency: string } {
  const months = subMonths(plan);
  if (product) {
    return { total: product.displayPrice, monthly: appleMoney(product.price / months, product.currency), currency: product.currency };
  }
  const total = plan.mode === 'subscription' ? plan.monthly_amount * months : plan.billed_upfront_amount;
  return { total: money(total, plan.currency), monthly: money(plan.mode === 'subscription' ? plan.monthly_amount : total, plan.currency), currency: plan.currency.toUpperCase() };
}

/** Report a paid transaction to the site and, once it is recorded, finish it. Shared with the relaunch path in App.tsx. */
export async function reportTransaction(t: IapTransaction, ctx: { plan: string; destination: string; data_gb: number | null; email: string; startedAt?: number }) {
  const r = await light.appPurchase({ signedTransaction: t.jws, plan: ctx.plan, destination: ctx.destination, data_gb: ctx.data_gb, email: ctx.email });
  // No owner handle means the site could not tie the purchase to an
  // account. Finishing the transaction here would tell StoreKit it was
  // delivered, with money taken and nothing on the phone to show for it, so
  // it stays unfinished and is reported again on the next launch.
  if (!r.user_id || !r.t) throw new ApiError('Your purchase went through, but we could not open your account yet.', 502);
  account.set({ userId: r.user_id, t: r.t, email: ctx.email, purchaseRef: `apple:${r.transaction_id}` });
  await finish(t.transactionId);
  // Consumes this purchase's own context, never another destination's
  // waiting on the same product.
  pendingPurchase.clear(t.productId, ctx.startedAt);
  return r;
}

