// haptics.ts — light wrapper around Capacitor Haptics.
// No-ops on the web; gives real taptic feedback in the native iOS app.
import { Capacitor } from '@capacitor/core';

type Strength = 'light' | 'medium' | 'heavy';

// One tap, one tick: once the touch-down tick has fired (installTouchHaptics),
// a screen's own tick for the same tap is skipped, until shortly after the
// finger lifts. Success, warning and error ticks are never skipped.
let quietUntil = 0;
let touching = false;
function due(): boolean {
  return !touching && Date.now() >= quietUntil;
}
function impact(strength: Strength) {
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: strength === 'heavy' ? ImpactStyle.Heavy : strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }))
    .catch(() => {});
}

export function haptic(strength: Strength = 'light') {
  if (!Capacitor.isNativePlatform() || !due()) return;
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => {
      const style =
        strength === 'heavy' ? ImpactStyle.Heavy : strength === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
      return Haptics.impact({ style });
    })
    .catch(() => {});
}

export function hapticSelection() {
  if (!Capacitor.isNativePlatform() || !due()) return;
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

/**
 * App-wide touch feedback (owner 2026-10-24: "haptic touch and haptic
 * feedback on the app"): a light tick the moment a finger lands on anything
 * tappable (a button, a link, a card: class "press", role button/tab/switch),
 * and a firmer one when it is held, the way iOS Haptic Touch answers a long
 * press. A scroll that starts on a card cancels the hold. Installed once at launch.
 */
export function installTouchHaptics(): void {
  if (!Capacitor.isNativePlatform() || typeof document === 'undefined') return;
  const TAPPABLE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], .press, select, input[type="checkbox"]';
  let hold: ReturnType<typeof setTimeout> | null = null;
  let startY = 0;
  const cancel = () => { if (hold) { clearTimeout(hold); hold = null; } };
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element | null)?.closest?.(TAPPABLE) as HTMLElement | null;
    if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
    impact('light');
    touching = true;
    startY = e.clientY;
    cancel();
    hold = setTimeout(() => { hold = null; impact('medium'); }, 450);
  }, { passive: true, capture: true });
  document.addEventListener('pointermove', (e) => { if (hold && Math.abs(e.clientY - startY) > 8) cancel(); }, { passive: true, capture: true });
  const lift = () => { cancel(); if (touching) { touching = false; quietUntil = Date.now() + 250; } };
  for (const ev of ['pointerup', 'pointercancel'] as const) document.addEventListener(ev, lift, { passive: true, capture: true });
  document.addEventListener('scroll', cancel, { passive: true, capture: true });
}
