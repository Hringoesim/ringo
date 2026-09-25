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
// StoreKit redelivers after the app was killed mid-purchase.
const PENDING_KEY = 'ringo_pending_purchases_v1';
export interface PurchaseContext { plan: string; destination: string; data_gb: number | null; email: string; startedAt?: number }
function readPending(): Record<string, PurchaseContext> {
  try { const raw = localStorage.getItem(PENDING_KEY); return raw ? (JSON.parse(raw) as Record<string, PurchaseContext>) : {}; } catch { return {}; }
}
function writePending(v: Record<string, PurchaseContext>): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(v)); } catch { /* ignore */ }
}
export const pendingPurchase = {
  get(productId: string): PurchaseContext | null { return readPending()[productId] || null; },
  set(productId: string, ctx: PurchaseContext): void { const all = readPending(); all[productId] = { ...ctx, startedAt: Date.now() }; writePending(all); },
  clear(productId: string): void { const all = readPending(); delete all[productId]; writePending(all); },
};
