// account.ts — what the app remembers about its owner, on this phone only.
//
// A buyer is identified the way the website identifies them: by email,
// through the signup row (`userId`) and its per-user token (`t`), both handed
// back by ringoesim.com once a purchase is paid (card or App Store) or a
// sign-in is verified (/api/app-login: the emailed code, Apple or Google).
// `purchaseRef` is the App Store transaction (apple:<id>) of the purchase
// made from this phone; the site only releases the installable eSIM profile
// against it.
import { useSyncExternalStore } from 'react';
import { storage } from '../lib/storage';

export interface Account {
  userId: string;
  t: string;
  email: string | null;
  /** apple:<transactionId> of the purchase made on this device, if any. */
  purchaseRef: string | null;
}

const KEY = 'ringo_account_v1';
const listeners = new Set<() => void>();
let cached: Account | null | undefined;

function read(): Account | null {
  if (cached !== undefined) return cached;
  const v = storage.json(KEY) as Partial<Record<keyof Account, unknown>> | null;
  // Only a whole handle is an account: an empty id or token signs nobody in,
  // and an email or purchase that is not text (a damaged or older record) is
  // dropped here, not handed to code that calls string methods on it.
  cached = v && typeof v === 'object' && typeof v.userId === 'string' && v.userId && typeof v.t === 'string' && v.t
    ? { userId: v.userId, t: v.t, email: typeof v.email === 'string' ? v.email : null, purchaseRef: typeof v.purchaseRef === 'string' ? v.purchaseRef : null }
    : null;
  return cached;
}

function write(next: Account | null): void {
  cached = next;
  // Storage unavailable: the session still works in memory.
  if (next) storage.set(KEY, JSON.stringify(next));
  else storage.remove(KEY);
  listeners.forEach((l) => l());
}

export const account = {
  get: read,
  /** Remember the owner; keeps the same owner's earlier email and purchaseRef unless new ones are given. */
  set(patch: Partial<Account> & { userId: string; t: string }): Account {
    const prev = read();
    // What is kept is the same account's only: a purchase restored into
    // another account, with no email in the answer, used to inherit the
    // email of whoever was signed in on this phone before.
    const same = prev && prev.userId === patch.userId ? prev : null;
    const next: Account = {
      userId: patch.userId,
      t: patch.t,
      email: patch.email ?? same?.email ?? null,
      purchaseRef: patch.purchaseRef ?? same?.purchaseRef ?? null,
    };
    write(next);
    return next;
  },
  forget(): void {
    // The next person on this phone never sees the last checkout's email.
    // Purchases still in flight (ringo_pending_purchases_v1) stay: they are
    // paid, and their context is what completes them.
    storage.remove('ringo_last_email');
    write(null);
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAccount(): Account | null {
  return useSyncExternalStore(account.subscribe, account.get, account.get);
}

// What a purchase in flight was for, keyed by App Store product id: the
// context the site needs (destination, size, email) to fulfil a transaction
// StoreKit redelivers after the app was killed mid-purchase, or after an Ask
// to Buy was approved. One product serves every destination sold at the same
// price, so a product can have several purchases in flight (Spain awaiting a
// parent's approval, then France bought at once): each product keeps a list,
// newest first, and a redelivered transaction takes the oldest context left.
const PENDING_KEY = 'ringo_pending_purchases_v1';
const PENDING_CAP = 4;
export interface PurchaseContext { plan: string; destination: string; data_gb: number | null; email: string; startedAt?: number }
type PendingStore = Record<string, PurchaseContext[]>;
const isContext = (v: unknown): v is PurchaseContext =>
  Boolean(v) && typeof v === 'object' && typeof (v as PurchaseContext).plan === 'string' && typeof (v as PurchaseContext).destination === 'string';
function readPending(): PendingStore {
  const parsed = storage.json(PENDING_KEY);
  if (!parsed || typeof parsed !== 'object') return {};
  const out: PendingStore = {};
  for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
    // Before the list, each product held one context object; an install
    // updated with a purchase in flight keeps it as a one-entry list.
    const list = (Array.isArray(v) ? v : [v]).filter(isContext).map((c) => ({ ...c, startedAt: c.startedAt ?? 0 }));
    if (list.length) out[id] = list;
  }
  return out;
}
function writePending(v: PendingStore): void {
  storage.set(PENDING_KEY, JSON.stringify(v));
}
export const pendingPurchase = {
  /** The oldest context still waiting for this product (`nth` skips that many, for several unfinished transactions of one product). */
  get(productId: string, nth = 0): PurchaseContext | null {
    const list = readPending()[productId] || [];
    return list[list.length - 1 - nth] || null;
  },
  /** Remember a purchase about to open the App Store sheet; returns the stored context, whose startedAt identifies it for clear(). */
  set(productId: string, ctx: PurchaseContext): PurchaseContext {
    const all = readPending();
    const list = all[productId] || [];
    const stamped = { ...ctx, startedAt: Math.max(Date.now(), (list[0]?.startedAt ?? 0) + 1) };
    all[productId] = [stamped, ...list].slice(0, PENDING_CAP);
    writePending(all);
    return stamped;
  },
  /** Consume one context: the one started at `startedAt`, or the oldest when it is not given. */
  clear(productId: string, startedAt?: number): void {
    const all = readPending();
    const list = all[productId];
    if (!list?.length) return;
    const i = startedAt == null ? list.length - 1 : list.findIndex((c) => c.startedAt === startedAt);
    if (i < 0) return;
    list.splice(i, 1);
    if (list.length) all[productId] = list; else delete all[productId];
    writePending(all);
  },
};
