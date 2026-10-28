import React from 'react';
import ReactDOM from 'react-dom/client';
import { Host } from './Host';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { installTouchHaptics } from './lib/haptics';
import { i18n } from './lib/i18n';

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
