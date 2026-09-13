// purchase.ts — the two pieces of the App Store purchase shared by screens:
// how a line's price reads (always Apple's on the phone) and how a paid
// transaction is reported to ringoesim.com and then finished.
import { light, money, type Plan } from '../api/light';
import { account, pendingPurchase } from '../store/account';
import { finish, type IapProduct, type IapTransaction } from './iap';

// What a line costs, in Apple's words. On the phone every price is the App
// Store's (currency and amount alike); the catalogue's EUR figure is only
// the browser preview's stand-in.
export function priceOf(plan: Plan, product: IapProduct | null): { total: string; monthly: string; currency: string } {
  if (product) {
    const per = plan.mode === 'subscription' && plan.term_months > 1 ? product.price / plan.term_months : product.price;
    const fmt = (n: number) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: product.currency }).format(n); } catch { return `${product.currency} ${n.toFixed(2)}`; } };
    return { total: product.displayPrice, monthly: fmt(per), currency: product.currency };
  }
  return { total: money(plan.billed_upfront_amount, plan.currency), monthly: money(plan.monthly_amount, plan.currency), currency: plan.currency.toUpperCase() };
}

/** Report a paid transaction to the site and, once it is recorded, finish it. Shared with the relaunch path in App.tsx. */
export async function reportTransaction(t: IapTransaction, ctx: { plan: string; destination: string; data_gb: number | null; email: string }) {
  const r = await light.appPurchase({ signedTransaction: t.jws, plan: ctx.plan, destination: ctx.destination, data_gb: ctx.data_gb, email: ctx.email });
  if (r.user_id && r.t) account.set({ userId: r.user_id, t: r.t, email: ctx.email, purchaseRef: `apple:${r.transaction_id}` });
  await finish(t.transactionId);
  pendingPurchase.clear(t.productId);
  return r;
}

