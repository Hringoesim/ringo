// iap.ts — the App Store, from JS. Every plan and top-up in the app is an
// App Store product (owner 2026-09-13: payment through Apple, not Stripe):
// one-payment plans and top-ups are consumables, the renewing regional plans
// are auto-renewable subscriptions. ringoesim.com names the product for each
// catalogue line (`apple_product_id`); the price shown is always Apple's.
//
// A purchase is complete only once ringoesim.com has verified the signed
// transaction and issued the eSIM (src/api/light.ts appPurchase). Then, and
// only then, the transaction is finished. Unfinished transactions StoreKit
// redelivers (app killed mid-purchase, Ask to Buy approved later, renewals)
// arrive through onTransaction and go through the same path.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { log } from './log';

export interface IapProduct {
  id: string;
  displayName: string;
  description: string;
  /** localized by the App Store, e.g. "€12,99" */
  displayPrice: string;
  price: number;
  currency: string;
  type: 'consumable' | 'subscription' | 'other';
  subscriptionPeriod?: { unit: 'day' | 'week' | 'month' | 'year'; value: number };
}

export interface IapTransaction {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  jws: string;
  purchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
  environment?: 'Production' | 'Sandbox' | 'Xcode';
}

export type PurchaseOutcome = ({ state: 'purchased' } & IapTransaction) | { state: 'cancelled' } | { state: 'pending' };

interface StoreKitPlugin {
  getProducts(o: { productIds: string[] }): Promise<{ products: IapProduct[] }>;
  purchase(o: { productId: string; appAccountToken?: string }): Promise<PurchaseOutcome>;
  finish(o: { transactionId: string }): Promise<{ finished: boolean }>;
  unfinished(): Promise<{ transactions: IapTransaction[] }>;
  restore(): Promise<{ transactions: IapTransaction[] }>;
  currentEntitlements(): Promise<{ entitlements: IapTransaction[] }>;
  manageSubscriptions(): Promise<{ shown: boolean }>;
  addListener(event: 'transaction', fn: (t: IapTransaction) => void): Promise<PluginListenerHandle>;
}

const Native = registerPlugin<StoreKitPlugin>('StoreKit');

export const iapAvailable = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

const productCache = new Map<string, IapProduct>();

/** Apple's products for these ids; missing ids are simply absent (not sold). */
export async function loadProducts(ids: string[]): Promise<Map<string, IapProduct>> {
  const out = new Map<string, IapProduct>();
  if (!iapAvailable() || !ids.length) return out;
  const missing = ids.filter((id) => !productCache.has(id));
  if (missing.length) {
    try {
      const { products } = await Native.getProducts({ productIds: missing });
      for (const p of products) productCache.set(p.id, p);
    } catch (e) {
      log.warn('iap', e);
    }
  }
  for (const id of ids) { const p = productCache.get(id); if (p) out.set(id, p); }
  return out;
}

export async function purchase(productId: string, appAccountToken?: string): Promise<PurchaseOutcome> {
  return Native.purchase({ productId, ...(appAccountToken ? { appAccountToken } : {}) });
}

export async function finish(transactionId: string): Promise<void> {
  try { await Native.finish({ transactionId }); } catch (e) { log.warn('iap.finish', e); }
}

export async function unfinished(): Promise<IapTransaction[]> {
  if (!iapAvailable()) return [];
  try { return (await Native.unfinished()).transactions; } catch { return []; }
}

export async function restoreTransactions(): Promise<IapTransaction[]> {
  if (!iapAvailable()) return [];
  return (await Native.restore()).transactions;
}

export async function manageSubscriptions(): Promise<void> {
  if (!iapAvailable()) { window.open('https://apps.apple.com/account/subscriptions', '_blank', 'noopener'); return; }
  await Native.manageSubscriptions();
}

export async function onTransaction(fn: (t: IapTransaction) => void): Promise<() => void> {
  if (!iapAvailable()) return () => {};
  const h = await Native.addListener('transaction', fn);
  return () => { void h.remove(); };
}
