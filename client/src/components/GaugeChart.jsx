import React from 'react';
import { getLightHex } from '../utils/thresholds';

export default function GaugeChart({ value = 0, max = 100, label, color = '#1441F5', size = 140 }) {
  const radius     = 50;
  const cx         = 60;
  const cy         = 60;
  const startAngle = -210;
  const totalAngle = 240;
  const angle      = startAngle + (Math.min(value, max) / max) * totalAngle;

  const polar = (deg, r) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  });

  const arcPath = (start, end, r) => {
    const s = polar(start, r);
    const e = polar(end, r);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const needleEnd = polar(angle, 38);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size * 0.85} viewBox="0 0 120 100">
        {/* Track */}
        <path
          d={arcPath(startAngle, startAngle + totalAngle, radius)}
          fill="none"
          stroke="rgba(20,65,245,0.2)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={arcPath(startAngle, angle, radius)}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#EDF0FE" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="#EDF0FE" />
        {/* Value */}
        <text x={cx} y={cy + 18} textAnchor="middle" fill="#EDF0FE" fontSize="14" fontWeight="700">
          {Math.round(value)}%
        </text>
      </svg>
      {label && (
        <span className="text-xs text-center" style={{ color: 'rgba(237,240,254,0.5)' }}>{label}</span>
      )}
    </div>
  );
}
