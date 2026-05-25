import React from 'react';
import { LIGHT_COLORS } from '../utils/thresholds';

export default function KpiCard({ label, value, unit = '', light = 'neutral', sub, icon: Icon }) {
  const c = LIGHT_COLORS[light] || LIGHT_COLORS.neutral;
  return (
    <div className={`card border ${c.border} ${c.bg} flex flex-col gap-1`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-tight" style={{ color: 'rgba(237,240,254,0.55)', fontSize: 'var(--p-widget-title-size)' }}>{label}</span>
        <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0 mt-0.5`} />
      </div>
      <div className={`text-2xl font-bold ${c.text} leading-none mt-1`}>
        {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
        {unit && <span className="text-sm font-normal ml-0.5 opacity-70">{unit}</span>}
      </div>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.4)' }}>{sub}</p>}
    </div>
  );
}
