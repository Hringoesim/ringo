import React from 'react';
import ReactDOM from 'react-dom/client';
import { Host } from './Host';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { installTouchHaptics } from './lib/haptics';
import { i18n } from './lib/i18n';
import { Capacitor } from '@capacitor/core';

// Host.tsx hides the native splash once the first screen has painted. Its own
// backstop only starts once React has mounted, so this one covers the time
// before that (the bundle and the language file): a launch can never be
// stranded on the splash.
if (Capacitor.isNativePlatform()) {
  setTimeout(() => void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide()).catch(() => {}), 6000);
}

// iOS/WKWebView only engages :active (our .press feedback) on touch when a
// touchstart listener exists — register a passive no-op once at boot.
document.addEventListener('touchstart', () => {}, { passive: true });

// A light tick on every touch, a firmer one on a long press (haptics.ts).
installTouchHaptics();

// The app's language is loaded first, so no screen paints in English and then switches.
void i18n.ready.then(() => ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Host />
    </ErrorBoundary>
  </React.StrictMode>,
));
