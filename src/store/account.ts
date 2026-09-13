// account.ts — what the app remembers about its owner, on this phone only.
//
// There is no login. A buyer is identified the way the website identifies
// them: by email, through the signup row (`userId`) and its per-user token
// (`t`), both handed back by ringoesim.com once Stripe says a purchase is
// paid, or by /api/lead when someone types the email they bought with.
// `purchaseRef` is the Stripe Checkout session of the purchase made from
// this phone; the site only releases the installable eSIM profile against it.
import { useSyncExternalStore } from 'react';

export interface Account {
  userId: string;
  t: string;
  email: string | null;
  /** Stripe Checkout session (cs_…) of the purchase made on this device, if any. */
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

// A checkout in flight: the session the browser sheet was opened on, kept
// across the sheet so the app can ask Stripe how it ended even if the app
// was suspended meanwhile.
const PENDING_KEY = 'ringo_pending_checkout_v1';
export interface PendingCheckout { session: string; email: string; destination: string; plan: string; startedAt: number }
export const pendingCheckout = {
  get(): PendingCheckout | null {
    try { const raw = localStorage.getItem(PENDING_KEY); return raw ? (JSON.parse(raw) as PendingCheckout) : null; } catch { return null; }
  },
  set(p: PendingCheckout | null): void {
    try { if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p)); else localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
  },
};
