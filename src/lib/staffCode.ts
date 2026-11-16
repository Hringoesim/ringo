// A one-time staff code (owner 2026-11-13: company addresses buy at the
// supplier rate; 2026-11-16: "I need it on the app in the settings as a
// code"). Saved once in Help > Account, it rides with every plan payment
// (lib/cardPay.ts) until a payment that used it goes through. The site checks
// it against the buyer's email and the line (api/app-pay.js); a code that
// does not apply changes nothing.
import { useEffect, useState } from 'react';
import { light } from '../api/light';

const KEY = 'ringo_staff_code_v1';
const listeners = new Set<(c: string | null) => void>();

export function savedStaffCode(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function saveStaffCode(code: string | null): void {
  const c = code ? code.trim().toUpperCase() : null;
  try { if (c) localStorage.setItem(KEY, c); else localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  listeners.forEach((f) => f(c));
}
export function useStaffCode(): string | null {
  const [c, setC] = useState(savedStaffCode);
  useEffect(() => { listeners.add(setC); return () => { listeners.delete(setC); }; }, []);
  return c;
}

/**
 * The staff price of one line for this email, or null (no code saved, a
 * renewing plan, or a code that does not apply). Asked once per line.
 */
export function useStaffQuote(line: { plan: string; destination: string; data_gb: number | null; currency: string; mode: string } | null, email: string | null): { amount: number; currency: string } | null {
  const code = useStaffCode();
  const key = line && code && email && line.mode !== 'subscription' ? JSON.stringify([code, email, line.plan, line.destination, line.data_gb, line.currency]) : null;
  const [quote, setQuote] = useState<{ key: string; amount: number; currency: string } | null>(null);
  useEffect(() => {
    if (!key || !line || !code || !email) return;
    let live = true;
    light.appQuote({ plan: line.plan, destination: line.destination, data_gb: line.data_gb, email, currency: line.currency, code })
      .then((q) => { if (live && q.staff) setQuote({ key, amount: q.amount, currency: q.currency }); })
      .catch(() => {});
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return quote && quote.key === key ? { amount: quote.amount, currency: quote.currency } : null;
}
