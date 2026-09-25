// account.ts — what the app remembers about its owner, on this phone only.
//
// There is no login. A buyer is identified the way the website identifies
// them: by email, through the signup row (`userId`) and its per-user token
// (`t`), both handed back by ringoesim.com once Apple says a purchase is
// paid, or by /api/lead when someone types the email they bought with.
// `purchaseRef` is the App Store transaction (apple:<id>) of the purchase
// made from this phone; the site only releases the installable eSIM profile
// against it.
import { useSyncExternalStore } from 'react';

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
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Account) : null;
    cached = v && typeof v.userId === 'string' && typeof v.t === 'string' ? v : null;
  } catch {
    cached = null;
  }
  return cached;
}

function write(next: Account | null): void {
  cached = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the session still works in memory */
  }
  listeners.forEach((l) => l());
}

export const account = {
  get: read,
  /** Remember the owner; keeps an earlier purchaseRef unless a new one is given. */
  set(patch: Partial<Account> & { userId: string; t: string }): Account {
    const prev = read();
    const next: Account = {
      userId: patch.userId,
      t: patch.t,
      email: patch.email ?? prev?.email ?? null,
      purchaseRef: patch.purchaseRef ?? (prev && prev.userId === patch.userId ? prev.purchaseRef : null),
    };
    write(next);
    return next;
  },
  forget(): void {
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
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    const out: PendingStore = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      // Before the list, each product held one context object; an install
      // updated with a purchase in flight keeps it as a one-entry list.
      const list = (Array.isArray(v) ? v : [v]).filter(isContext).map((c) => ({ ...c, startedAt: c.startedAt ?? 0 }));
      if (list.length) out[id] = list;
    }
    return out;
  } catch { return {}; }
}
function writePending(v: PendingStore): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(v)); } catch { /* ignore */ }
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
