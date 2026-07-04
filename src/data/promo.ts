// promo.ts — referral share codes + checkout promo/Pioneer codes.
// Mirrors the website's Pioneer (founding discount) + Ambassador (referral)
// programs. Validation is client-side for the demo; live mode validates
// server-side against issued codes.

export type PromoKind = 'pioneer' | 'referral' | 'none';

export interface Promo {
  valid: boolean;
  label: string;
  discountPct: number; // applied to the monthly price
  kind: PromoKind;
}

// Founding-member codes → the Pioneer "super discount".
const PIONEER_CODES = new Set(['PIONEER', 'FOUNDER', 'FOUNDING', 'RINGO']);

/** A stable, shareable code for a user (same every time for the same person). */
export function referralCode(name: string, seed: string): string {
  const initials = (name || 'Ringo').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'RGO';
  let h = 2166136261;
  const s = (seed || name || 'ringo').toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padStart(4, 'X');
  return `RINGO-${initials}${suffix}`;
}

/** Validate a code entered at checkout. `ownCode` is the user's own referral
 *  code — you can't redeem your own. */
export function checkPromo(raw: string, ownCode?: string): Promo {
  const code = (raw || '').trim().toUpperCase();
  if (!code) return { valid: false, label: '', discountPct: 0, kind: 'none' };
  if (PIONEER_CODES.has(code)) {
    return { valid: true, label: 'Pioneer founding discount — 40% off, locked for 3 years', discountPct: 40, kind: 'pioneer' };
  }
  if (/^RINGO-[A-Z0-9]{4,}$/.test(code)) {
    if (ownCode && code === ownCode.toUpperCase()) {
      return { valid: false, label: 'You can’t use your own invite code.', discountPct: 0, kind: 'none' };
    }
    return { valid: true, label: 'Invite code applied — 50% off your first month', discountPct: 50, kind: 'referral' };
  }
  return { valid: false, label: 'That code isn’t recognised.', discountPct: 0, kind: 'none' };
}
