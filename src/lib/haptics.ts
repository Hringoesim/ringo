// haptics.ts — light wrapper around Capacitor Haptics.
// No-ops on the web; gives real taptic feedback in the native iOS app.
import { Capacitor } from '@capacitor/core';

type Strength = 'light' | 'medium' | 'heavy';

export function haptic(strength: Strength = 'light') {
  if (!Capacitor.isNativePlatform()) return;
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => {
      const style =
        strength === 'heavy' ? ImpactStyle.Heavy : strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
      return Haptics.impact({ style });
    })
    .catch(() => {});
}

export function hapticSelection() {
  if (!Capacitor.isNativePlatform()) return;
  void import('@capacitor/haptics').then(({ Haptics }) => Haptics.selectionChanged()).catch(() => {});
}

// Success / warning / error taptic — for confirmations (payment, activation),
// gentle blocks (paywall/KYC gate), and failures.
export function hapticNotify(type: 'success' | 'warning' | 'error' = 'success') {
  if (!Capacitor.isNativePlatform()) return;
  void import('@capacitor/haptics')
    .then(({ Haptics, NotificationType }) => {
      const t =
        type === 'error' ? NotificationType.Error : type === 'warning' ? NotificationType.Warning : NotificationType.Success;
      return Haptics.notification({ type: t });
    })
    .catch(() => {});
}
