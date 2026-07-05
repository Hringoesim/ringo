// notify.ts — request notification permission. Native uses the embedded Swift
// NotifyPlugin (real iOS dialog); web falls back to the Notification API.
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NotifyPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
}
const Native = registerPlugin<NotifyPlugin>('Notify');

export async function requestNotifications(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const r = await Native.requestPermission();
      return !!r.granted;
    } catch {
      return false;
    }
  }
  try {
    if (typeof Notification === 'undefined') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  } catch {
    return false;
  }
}
