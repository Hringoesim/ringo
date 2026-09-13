// browser.ts — the system browser sheet (SFSafariViewController on iOS) for
// the site's terms, privacy policy, contact page and install guide, and the
// OS-level open for Apple's eSIM installer link.
import { Capacitor } from '@capacitor/core';

export async function openInSheet(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }
  window.open(url, '_blank', 'noopener');
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
