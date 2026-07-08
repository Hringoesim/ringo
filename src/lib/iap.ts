// iap.ts — Apple In-App Purchase (StoreKit 2) bridge.
//
// Native iOS routes real purchases through the embedded StoreKitPlugin. Every
// other platform (web, Android for now) reports IAP unavailable and the app keeps
// its existing mock/demo checkout. All four plans are auto-renewable subscriptions
// in ONE subscription group, so buying a different tier is handled by StoreKit as
// an upgrade (immediate, prorated) or a downgrade (deferred to renewal).
import { Capacitor, registerPlugin } from '@capacitor/core';
import { planRank } from '../data/plans';
import { log } from './log';

export interface IapProduct {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string; // localized by the App Store, e.g. "£47.00"
  price: number;
}
export interface IapPurchaseResult {
  success?: boolean;
  cancelled?: boolean;
  pending?: boolean; // deferred (e.g. Ask-to-Buy) — resolves later
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  expiresDate?: number;
  jws?: string; // signed transaction, for future server-side validation
  error?: string;
}
interface Entitlement {
  productId: string;
  transactionId?: string;
  expiresDate?: number;
}

interface StoreKitPlugin {
  getProducts(o: { productIds: string[] }): Promise<{ products: IapProduct[] }>;
  purchase(o: { productId: string }): Promise<IapPurchaseResult>;
  restore(): Promise<{ entitlements: Entitlement[] }>;
  currentEntitlements(): Promise<{ entitlements: Entitlement[] }>;
}
const Native = registerPlugin<StoreKitPlugin>('StoreKit');

// Plan id ↔ App Store product id. MUST match ios/App/App/Ringo.storekit and the
// products created in App Store Connect.
export const PLAN_PRODUCT: Record<string, string> = {
  essentials: 'com.ringoesim.app.sub.essentials',
  plus: 'com.ringoesim.app.sub.plus',
  pro: 'com.ringoesim.app.sub.pro',
  unlimited: 'com.ringoesim.app.sub.unlimited',
};
const PRODUCT_PLAN: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_PRODUCT).map(([plan, pid]) => [pid, plan]),
);
export const ALL_PRODUCT_IDS = Object.values(PLAN_PRODUCT);

/** IAP is only available in the native iOS app (real StoreKit). */
export function isIapAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/** Localized products keyed by plan id (empty when IAP is unavailable). */
export async function iapProductsByPlan(): Promise<Record<string, IapProduct>> {
  if (!isIapAvailable()) return {};
  try {
    const { products } = await Native.getProducts({ productIds: ALL_PRODUCT_IDS });
    const out: Record<string, IapProduct> = {};
    for (const p of products) {
      const plan = PRODUCT_PLAN[p.id];
      if (plan) out[plan] = p;
    }
    return out;
  } catch (e) {
    log.warn('iap.getProducts', e);
    return {};
  }
}

/** Present the App Store purchase sheet for a plan. */
export async function iapPurchasePlan(planId: string): Promise<IapPurchaseResult> {
  const productId = PLAN_PRODUCT[planId];
  if (!productId) return { error: `Unknown plan ${planId}` };
  try {
    return await Native.purchase({ productId });
  } catch (e) {
    log.error('iap.purchase', e, { planId });
    return { error: (e as Error)?.message || 'Purchase failed.' };
  }
}

function highestActivePlan(entitlements: Entitlement[]): string | null {
  let best: string | null = null;
  for (const e of entitlements) {
    const plan = PRODUCT_PLAN[e.productId];
    if (plan && (best === null || planRank(plan) > planRank(best))) best = plan;
  }
  return best;
}

/** The highest-tier currently-active subscription plan id, or null. */
export async function iapActivePlan(): Promise<string | null> {
  if (!isIapAvailable()) return null;
  try {
    const { entitlements } = await Native.currentEntitlements();
    return highestActivePlan(entitlements);
  } catch (e) {
    log.warn('iap.currentEntitlements', e);
    return null;
  }
}

/** Restore purchases (syncs the App Store account). Returns the active plan, if any. */
export async function iapRestore(): Promise<string | null> {
  if (!isIapAvailable()) return null;
  try {
    const { entitlements } = await Native.restore();
    return highestActivePlan(entitlements);
  } catch (e) {
    log.warn('iap.restore', e);
    return null;
  }
}
