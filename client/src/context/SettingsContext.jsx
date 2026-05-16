/**
 * SettingsContext — 100% localStorage. No server calls.
 * Reads from 'app_settings' on mount; writes back on every updateSettings call.
 */
import React, { createContext, useContext, useState } from 'react';
import { store } from '../lib/store';

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
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...store.get('app_settings', {}),
  }));

  const updateSettings = (updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      store.set('app_settings', next);
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
