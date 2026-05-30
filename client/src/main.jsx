import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ── Cache invalidation ────────────────────────────────────────────────────────
// Bump APP_VERSION whenever the data schema or provider structure changes.
// On mismatch the processed Excel cache is wiped so stale data never surfaces.
const APP_VERSION = '2.4.9';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  // Clear processed Excel data (structure may have changed) but keep user
  // preferences: language, theme, layout, users, sub-dashboards, settings.
  ['dashboard_delivery', 'dashboard_qa'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('app_version', APP_VERSION);
}

// ── Seed default Delivery sub-dashboards ─────────────────────────────────────
const DELIVERY_SUBS_SEED_KEY = 'seeded_delivery_subs_v1';
if (!localStorage.getItem(DELIVERY_SUBS_SEED_KEY)) {
  const DEFAULT_DELIVERY_SUBS = [
    { id: 900001, name_en: 'Commitment compliance metrics', name_he: 'מדדי עמידה בהתחייבות', parentId: 'delivery', icon: 'Target' },
    { id: 900002, name_en: 'Flow Velocity',                 name_he: 'קצב אספקת תכולות',       parentId: 'delivery', icon: 'TrendingUp' },
    { id: 900003, name_en: 'Flow Time',                     name_he: 'משך הזמן לסיום תכולה',   parentId: 'delivery', icon: 'Clock' },
    { id: 900004, name_en: 'Flow Distribution',             name_he: 'חלוקת קיבולת',           parentId: 'delivery', icon: 'PieChart' },
    { id: 900005, name_en: 'Summary and conclusions',       name_he: 'סיכום ומסקנות',          parentId: 'delivery', icon: 'FileText' },
  ];
  try {
    const existing = JSON.parse(localStorage.getItem('sub_dashboards') || '[]');
    const seededIds = new Set(DEFAULT_DELIVERY_SUBS.map(d => d.id));
    const merged = existing.filter(d => !seededIds.has(d.id)).concat(DEFAULT_DELIVERY_SUBS);
    localStorage.setItem('sub_dashboards', JSON.stringify(merged));
    localStorage.setItem(DELIVERY_SUBS_SEED_KEY, '1');
  } catch { /* ignore quota errors */ }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
