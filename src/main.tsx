import React from 'react';
import ReactDOM from 'react-dom/client';
import { bootConfig } from './config';
import { Host } from './Host';
import './index.css';

// Wire backend + auth from environment (awaits the Supabase session bridge when
// configured) before the app renders.
bootConfig().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Host />
    </React.StrictMode>,
  );
});
