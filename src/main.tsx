import React from 'react';
import ReactDOM from 'react-dom/client';
import { Host } from './Host';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Host />
  </React.StrictMode>,
);
