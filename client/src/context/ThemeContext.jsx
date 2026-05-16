import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext(null);

// ── Preset palettes ──────────────────────────────────────────────────────────
export const PALETTES = [
  // Enterprise Light is first and is the default
  { id: 'light',      labelKey: 'palette_light',      preview: ['#4338CA', '#6366F1', '#F8FAFC'], isLight: true },
  { id: 'enterprise', labelKey: 'palette_enterprise', preview: ['#1D6AB5', '#0E8C95', '#081729'] },
  { id: 'blue',       labelKey: 'palette_blue',       preview: ['#1441F5', '#27DBE4', '#112277'] },
  { id: 'purple',     labelKey: 'palette_purple',     preview: ['#7C3AED', '#C084FC', '#1A0B4E'] },
  { id: 'teal',       labelKey: 'palette_teal',       preview: ['#0D9488', '#2DD4BF', '#0B2E38'] },
  { id: 'slate',      labelKey: 'palette_slate',      preview: ['#3B82F6', '#93C5FD', '#0F1629'] },
  { id: 'green',      labelKey: 'palette_green',      preview: ['#059669', '#34D399', '#0C2E1A'] },
  // "custom" is a virtual entry — shown in UI as a color-picker card
  { id: 'custom',     labelKey: 'palette_custom',     preview: [] },
];

// ── Named palette color sets (applied via CSS vars, same as 'custom') ─────────
// Add entries here to support new presets without touching index.css.
const NAMED_PALETTE_VARS = {
  enterprise: {
    primary:    '#1D6AB5',   // professional navy-blue
    secondary:  '#0E8C95',   // teal accent
    background: '#081729',   // very dark navy
    success:    '#2D9A5F',   // forest green
    warning:    '#D47B0A',   // amber
    danger:     '#CC2B2B',   // corporate red
  },
};

// ── Default values for the custom color editor ───────────────────────────────
export const CUSTOM_COLOR_DEFAULTS = {
  primary:    '#1441F5',   // --p-accent
  secondary:  '#27DBE4',   // --p-accent-h (hover / highlight)
  background: '#112277',   // --p-bg
  success:    '#54E075',   // good KPI color
  warning:    '#F9BD33',   // warning KPI color
  danger:     '#F36059',   // bad KPI color
};

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Convert a hex color + alpha to an rgba string. */
function hexAlpha(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(20,65,245,${alpha})`;
  }
  const full = hex.length === 4
    ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Apply all CSS custom properties for a custom palette. */
function applyCustomVars(colors) {
  const c = { ...CUSTOM_COLOR_DEFAULTS, ...colors };
  const root = document.documentElement;

  root.style.setProperty('--p-accent',          c.primary);
  root.style.setProperty('--p-accent-h',         c.secondary);
  root.style.setProperty('--p-accent-shadow',    hexAlpha(c.primary,   0.35));
  root.style.setProperty('--p-accent-shadow-h',  hexAlpha(c.secondary, 0.5));
  root.style.setProperty('--p-bg',               c.background);
  root.style.setProperty('--p-grad',             `linear-gradient(150deg, ${c.background} 0%, ${c.background} 100%)`);
  root.style.setProperty('--p-orb1',             hexAlpha(c.primary,   0.28));
  root.style.setProperty('--p-orb2',             hexAlpha(c.secondary, 0.20));
  root.style.setProperty('--p-orb3',             hexAlpha(c.danger,    0.14));
  root.style.setProperty('--p-orb4',             hexAlpha(c.success,   0.12));
  root.style.setProperty('--p-card-border',      hexAlpha(c.primary,   0.22));
  root.style.setProperty('--p-sidebar-border',   hexAlpha(c.primary,   0.18));
  root.style.setProperty('--p-nav-active',       hexAlpha(c.primary,   0.20));
  root.style.setProperty('--p-nav-hover',        hexAlpha(c.primary,   0.10));
  root.style.setProperty('--p-header-bg',        hexAlpha(c.background, 0.70));
  root.style.setProperty('--p-input-bg',         hexAlpha(c.background, 0.50));
  root.style.setProperty('--p-input-border',     hexAlpha(c.primary,   0.35));
  root.style.setProperty('--p-success',          c.success);
  root.style.setProperty('--p-warning',          c.warning);
  root.style.setProperty('--p-danger',           c.danger);
  // Ensure dark text vars for dark themes
  root.style.setProperty('--p-text',             '#EDF0FE');
  root.style.setProperty('--p-text-muted',       'rgba(237,240,254,0.5)');
  root.style.setProperty('--p-text-faint',       'rgba(237,240,254,0.3)');
  root.style.setProperty('--p-card-bg',          'rgba(255,255,255,0.06)');
  root.style.setProperty('--p-sidebar-bg',       'rgba(255,255,255,0.055)');
}

/** Remove all custom CSS vars so the preset class rules take over. */
function clearCustomVars() {
  const vars = [
    '--p-accent', '--p-accent-h', '--p-accent-shadow', '--p-accent-shadow-h',
    '--p-bg', '--p-grad', '--p-orb1', '--p-orb2', '--p-orb3', '--p-orb4',
    '--p-card-border', '--p-sidebar-border', '--p-nav-active', '--p-nav-hover',
    '--p-header-bg', '--p-input-bg', '--p-input-border',
    '--p-success', '--p-warning', '--p-danger',
    '--p-text', '--p-text-muted', '--p-text-faint', '--p-card-bg', '--p-sidebar-bg',
  ];
  vars.forEach(v => document.documentElement.style.removeProperty(v));
}

// ── Storage helpers ───────────────────────────────────────────────────────────
function paletteKey(username) {
  return username ? `theme_${username}` : 'theme_guest';
}
function customKey(username) {
  return username ? `theme_custom_${username}` : 'theme_custom_guest';
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [palette, setPaletteState] = useState('light');
  const [customColors, setCustomColorsState] = useState(CUSTOM_COLOR_DEFAULTS);

  // ── Load saved preferences when user changes ───────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(paletteKey(user?.username)) || 'light';
    setPaletteState(saved);

    const savedCustom = localStorage.getItem(customKey(user?.username));
    if (savedCustom) {
      try { setCustomColorsState({ ...CUSTOM_COLOR_DEFAULTS, ...JSON.parse(savedCustom) }); }
      catch { /* ignore corrupted data */ }
    }
  }, [user?.username]);

  // ── Apply theme class / custom vars whenever palette or colors change ──────
  useEffect(() => {
    const root = document.documentElement;

    // Remove all preset theme classes
    PALETTES.forEach(p => root.classList.remove(`theme-${p.id}`));

    if (palette === 'custom') {
      clearCustomVars();
      applyCustomVars(customColors);
    } else if (NAMED_PALETTE_VARS[palette]) {
      // Named preset with explicit CSS vars — no CSS class needed
      clearCustomVars();
      applyCustomVars(NAMED_PALETTE_VARS[palette]);
    } else {
      clearCustomVars();
      // 'blue' is the default :root and needs no class; all others need their class
      if (palette !== 'blue') root.classList.add(`theme-${palette}`);
    }
  }, [palette, customColors]);

  // ── Public setters ─────────────────────────────────────────────────────────
  const setPalette = useCallback((id) => {
    setPaletteState(id);
    localStorage.setItem(paletteKey(user?.username), id);
  }, [user?.username]);

  const setCustomColors = useCallback((colors) => {
    const merged = { ...CUSTOM_COLOR_DEFAULTS, ...colors };
    setCustomColorsState(merged);
    localStorage.setItem(customKey(user?.username), JSON.stringify(merged));
    // If not already on custom, switch to it automatically
    setPaletteState(prev => {
      const next = 'custom';
      localStorage.setItem(paletteKey(user?.username), next);
      return next;
    });
  }, [user?.username]);

  return (
    <ThemeContext.Provider value={{ palette, setPalette, palettes: PALETTES, customColors, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
