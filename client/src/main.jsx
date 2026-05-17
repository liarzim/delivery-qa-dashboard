import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ── Cache invalidation ────────────────────────────────────────────────────────
// Bump APP_VERSION whenever the data schema or provider structure changes.
// On mismatch the processed Excel cache is wiped so stale data never surfaces.
const APP_VERSION = '2.1.5';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  // Clear processed Excel data (structure may have changed) but keep user
  // preferences: language, theme, layout, users, sub-dashboards, settings.
  ['dashboard_delivery', 'dashboard_qa'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('app_version', APP_VERSION);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
