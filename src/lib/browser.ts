// browser.ts — the system browser sheet (SFSafariViewController on iOS) and
// the app's own URL scheme. Stripe's hosted Checkout, the site's terms and
// the install guide all open here rather than inside the app's web view: the
// sheet has Apple Pay, autofill and the address bar the buyer expects to see
// when paying.
import { Capacitor } from '@capacitor/core';

export async function openInSheet(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }
  window.open(url, '_blank', 'noopener');
}

export async function closeSheet(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {
    /* nothing open */
  }
}

/** Opens a URL with the OS (Settings, Mail, the eSIM installer), not a sheet.
 *  Apple's esimsetup.apple.com link only does its job through
 *  UIApplication.open, which is what AppLauncher calls. */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { AppLauncher } = await import('@capacitor/app-launcher');
    await AppLauncher.openUrl({ url });
    return;
  }
  window.open(url, '_blank', 'noopener');
}

/** Fires when the user closes the sheet (Done) — or when we close it. */
export async function onSheetClosed(handler: () => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { Browser } = await import('@capacitor/browser');
  const sub = await Browser.addListener('browserFinished', handler);
  return () => { void sub.remove(); };
}

/** ringo://checkout?status=paid&session_id=cs_… from public/app-return.html. */
export interface ReturnLink { status: 'paid' | 'cancelled'; session: string | null }
export function parseReturnLink(url: string): ReturnLink | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'ringo:' || (u.host !== 'checkout' && u.pathname.replace(/^\/+/, '') !== 'checkout')) return null;
    const status = u.searchParams.get('status') === 'paid' ? 'paid' : 'cancelled';
    const session = u.searchParams.get('session_id');
    return { status, session: session && /^cs_(live|test)_[A-Za-z0-9]{8,}$/.test(session) ? session : null };
  } catch {
    return null;
  }
}

export async function onAppUrl(handler: (url: string) => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { App } = await import('@capacitor/app');
  const sub = await App.addListener('appUrlOpen', ({ url }) => handler(url));
  return () => { void sub.remove(); };
}
