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

let lightRequested = false;

/** Re-apply the status bar text colour for the current theme and screen. */
export function syncStatusBar(): void {
  if (!Capacitor.isNativePlatform()) return;
  const light = lightRequested || RC.scheme === 'dark';
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: light ? Style.Dark : Style.Light }))
    .catch(() => {});
}

/** The welcome screen: light text while shown, the theme's again after. */
export function requestLightStatusBar(on: boolean): void {
  lightRequested = on;
  syncStatusBar();
}
