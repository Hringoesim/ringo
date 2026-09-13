import React from 'react';
import ReactDOM from 'react-dom/client';
import { Host } from './Host';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// iOS/WKWebView only engages :active (our .press feedback) on touch when a
// touchstart listener exists — register a passive no-op once at boot.
document.addEventListener('touchstart', () => {}, { passive: true });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Host />
    </ErrorBoundary>
  </React.StrictMode>,
);
