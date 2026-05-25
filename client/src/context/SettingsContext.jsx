/**
 * SettingsContext — syncs with server DB via /api/settings.
 * GET is public (no auth needed). PUT requires Admin token.
 * Starts with DEFAULT_SETTINGS and merges server values once loaded.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const SettingsContext = createContext(null);

export const DEFAULT_SETTINGS = {
  excel_path:                '',
  delivery_file:             'delivery.xlsx',
  qa_bug_file:               'qa_bugs.xlsx',
  qa_escaping_file:          'qa_escaping.xlsx',
  delivery_weight:           '60',
  quality_weight:            '40',
  reopen_yellow:             '5',
  reopen_red:                '10',
  rejected_yellow:           '5',
  rejected_red:              '10',
  escaping_yellow:           '3',
  escaping_red:              '7',
  reopen_density_yellow:     '2',
  reopen_density_red:        '5',
  rejected_density_yellow:   '2',
  rejected_density_red:      '5',
  escaping_density_yellow:   '2',
  escaping_density_red:      '5',
  commitment_yellow:         '80',
  commitment_red:            '60',
  weighted_yellow:           '50',
  weighted_red:              '30',
  pi_name_map:               '{}',
  squad_visibility:          '{}',
  title_overrides:           '{}',
  widget_title_size:         '12',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    apiFetch('/api/settings')
      .then(data => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => {}); // Keep defaults if server unreachable
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--p-widget-title-size',
      (settings.widget_title_size || 12) + 'px'
    );
  }, [settings.widget_title_size]);

  const updateSettings = async (updates) => {
    // Optimistic update so UI reflects changes instantly
    setSettings(prev => ({ ...prev, ...updates }));
    try {
      await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(updates) });
    } catch (e) {
      console.error('Settings save failed:', e.message);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
