/**
 * TrafficLightWidget
 *
 * Bulb colors are driven by CSS custom properties (--p-success, --p-warning,
 * --p-danger) so the custom palette color-picker can override them.
 *
 * The housing background uses --p-traffic-bg which is:
 *   • dark themes  → rgba(6,21,78,0.7)  (deep navy)
 *   • theme-light  → #1E293B            (slate-800) — as per Enterprise Light spec
 */
import React from 'react';
import { LIGHT_COLORS } from '../utils/thresholds';

export default function TrafficLightWidget({ label, value, unit = '%', light = 'neutral', yellowThreshold, redThreshold }) {
  const c = LIGHT_COLORS[light] || LIGHT_COLORS.neutral;

  // ── Bulb styles using CSS variables ──────────────────────────────────────
  const bulbStyle = (colorVar, isActive) => ({
    width: 28,
    height: 28,
    borderRadius: '50%',
    transition: 'background-color 0.25s, box-shadow 0.25s',
    backgroundColor: isActive
      ? `var(${colorVar})`
      : `color-mix(in srgb, var(${colorVar}) 8%, transparent)`,
    boxShadow: isActive
      ? `0 0 16px var(${colorVar}), 0 0 5px var(${colorVar})`
      : 'none',
  });

  return (
    <div className={`card border ${c.border} flex flex-col items-center gap-3 py-6`}>
      <p className="text-xs font-semibold text-center"
        style={{ color: 'var(--p-text-muted, rgba(237,240,254,0.55))' }}>
        {label}
      </p>

      {/* Traffic-light housing — slate-800 in light theme, deep navy in dark */}
      <div
        className="flex flex-col items-center gap-2 rounded-2xl px-3.5 py-4 w-14"
        style={{
          backgroundColor: 'var(--p-traffic-bg, rgba(6,21,78,0.7))',
          border: '1px solid var(--p-traffic-border, rgba(20,65,245,0.2))',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {/* Red — top */}
        <div style={bulbStyle('--p-danger',  light === 'red')} />
        {/* Amber — middle */}
        <div style={bulbStyle('--p-warning', light === 'yellow')} />
        {/* Green — bottom */}
        <div style={bulbStyle('--p-success', light === 'green')} />
      </div>

      <div className={`text-2xl font-bold ${c.text}`}>
        {typeof value === 'number'
          ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
          : value}
        <span className="text-sm font-normal ms-0.5 opacity-70">{unit}</span>
      </div>

      {(yellowThreshold !== undefined || redThreshold !== undefined) && (
        <div className="text-xs text-center space-y-0.5"
          style={{ color: 'var(--p-text-faint, rgba(237,240,254,0.3))' }}>
          {yellowThreshold !== undefined && <p>Yellow ≥ {yellowThreshold}{unit}</p>}
          {redThreshold    !== undefined && <p>Red ≥ {redThreshold}{unit}</p>}
        </div>
      )}
    </div>
  );
}
