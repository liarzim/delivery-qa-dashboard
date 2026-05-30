import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ── Cache invalidation ────────────────────────────────────────────────────────
// Bump APP_VERSION whenever the data schema or provider structure changes.
// On mismatch the processed Excel cache is wiped so stale data never surfaces.
const APP_VERSION = '2.4.13';
const storedVersion = localStorage.getItem('app_version');
if (storedVersion !== APP_VERSION) {
  // Clear processed Excel data (structure may have changed) but keep user
  // preferences: language, theme, layout, users, sub-dashboards, settings.
  ['dashboard_delivery', 'dashboard_qa', 'seeded_delivery_subs'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem('app_version', APP_VERSION);
}

// ── Seed default Delivery sub-dashboards ─────────────────────────────────────
// Re-runs on every version bump so new entries are always applied.
if (localStorage.getItem('seeded_delivery_subs') !== APP_VERSION) {
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

    // Ensure sub-dashboard 900001 (מדדי עמידה בהתחייבות) has the
    // commitment-status-dist widget in its layout cache.
    const LAYOUT_CACHE_KEY = 'layout_server_cache';
    const layoutCache = JSON.parse(localStorage.getItem(LAYOUT_CACHE_KEY) || '{}');
    const sub901Items = layoutCache['sub_900001']?.rglItems;
    const hasWidget = Array.isArray(sub901Items) && sub901Items.some(it => it.i === 'commitment-status-dist');
    if (!hasWidget) {
      const existing901 = Array.isArray(sub901Items) ? sub901Items : [];
      const maxY = existing901.reduce((m, it) => Math.max(m, it.y + it.h), 0);
      layoutCache['sub_900001'] = {
        rglItems: [...existing901, { i: 'commitment-status-dist', x: 0, y: maxY, w: 8, h: 12, minW: 4, minH: 6 }],
      };
      localStorage.setItem(LAYOUT_CACHE_KEY, JSON.stringify(layoutCache));
    }

    localStorage.setItem('seeded_delivery_subs', APP_VERSION);
  } catch { /* ignore quota errors */ }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
