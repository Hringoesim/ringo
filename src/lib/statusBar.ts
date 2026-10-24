// The native status bar's text colour (clock, signal, battery). Capacitor's
// StatusBar plugin is already installed and linked; its naming is inverted
// from the text: Style.Dark means light text for a dark background.
//
// The welcome screen asks for light text over its plum sky; every other screen
// follows the theme. Both the screen and the theme switch go through
// syncStatusBar, so whichever runs last (the Host syncs on launch, after the
// welcome screen has mounted) still honours the welcome screen's request.
import { Capacitor } from '@capacitor/core';
import { RC } from '../theme';

// A count, not a flag: the sign-in screen asks too, and can mount and unmount
// while the welcome screen still holds its own request.
let lightRequests = 0;

/** Re-apply the status bar text colour for the current theme and screen. */
export function syncStatusBar(): void {
  if (!Capacitor.isNativePlatform()) return;
  const light = lightRequests > 0 || RC.scheme === 'dark';
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: light ? Style.Dark : Style.Light }))
    .catch(() => {});
}

/** A screen with a dark photo under the clock: light text while shown, the theme's again after. */
export function requestLightStatusBar(on: boolean): void {
  lightRequests = Math.max(0, lightRequests + (on ? 1 : -1));
  syncStatusBar();
}
