import React from 'react';
import EditableTitle from './EditableTitle';

export default function SectionHeader({ title, titleKey, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="font-bold text-sigma-ice">
          {titleKey
            ? <EditableTitle titleKey={titleKey} defaultTitle={title} className="text-base" />
            : <span style={{ fontSize: 'calc(var(--p-widget-title-size, 12px) * 1.33)' }}>{title}</span>}
        </h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.45)' }}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
