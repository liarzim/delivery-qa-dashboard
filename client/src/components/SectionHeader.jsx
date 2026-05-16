import React from 'react';

export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-base font-bold text-sigma-ice">{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.45)' }}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
