/**
 * SemiGaugeChart — semicircular gauge with colored zones and needle(s).
 *
 * Props:
 *   value              {number}        primary value (0–100)
 *   value2             {number|null}   optional second value for dashed needle
 *   yellowThreshold    {number}        boundary between red and orange (default 60)
 *   greenThreshold     {number}        boundary between orange and green (default 80)
 *   label1             {string}        caption below primary value
 *   label2             {string}        caption below secondary value
 */
import React from 'react';

const RED    = '#E53935';
const ORANGE = '#FF9800';
const GREEN  = '#00BFA5';

function zoneColor(v, yellow, green) {
  if (v >= green)  return GREEN;
  if (v >= yellow) return ORANGE;
  return RED;
}

export default function SemiGaugeChart({
  value  = 0,
  value2 = null,
  yellowThreshold = 60,
  greenThreshold  = 80,
  label1 = '% Actual',
  label2 = '% Adjusted',
}) {
  // SVG layout constants
  const cx = 140, cy = 138;   // circle centre
  const R  = 108, r  = 84;    // outer / inner radius (arc thickness = 24)

  // Percentage → SVG coordinate on circle
  // 0% → left (180°), 50% → top (90°), 100% → right (0°)
  const toXY = (pct, radius) => {
    const θ = Math.PI * (1 - pct / 100);
    return {
      x: cx + radius * Math.cos(θ),
      y: cy - radius * Math.sin(θ),
    };
  };

  const f = n => n.toFixed(2);

  // Filled donut-slice path for a zone
  const zonePath = (p1, p2) => {
    const o1 = toXY(p1, R), o2 = toXY(p2, R);
    const i2 = toXY(p2, r), i1 = toXY(p1, r);
    const lg = (p2 - p1) > 50 ? 1 : 0;
    return `M${f(o1.x)},${f(o1.y)} A${R},${R} 0 ${lg} 1 ${f(o2.x)},${f(o2.y)} `
         + `L${f(i2.x)},${f(i2.y)} A${r},${r} 0 ${lg} 0 ${f(i1.x)},${f(i1.y)} Z`;
  };

  // White tick divider between zones
  const tickPath = (pct) => {
    const inner = toXY(pct, r - 3);
    const outer = toXY(pct, R + 3);
    return `M${f(inner.x)},${f(inner.y)} L${f(outer.x)},${f(outer.y)}`;
  };

  // Text anchor based on position around the arc
  const anchor = (pct) => pct <= 12 ? 'end' : pct >= 88 ? 'start' : 'middle';

  const clamp = v => Math.max(0, Math.min(100, Number(v) || 0));
  const v1 = clamp(value);
  const v2 = value2 != null ? clamp(value2) : null;

  // Needle tips
  const n1 = toXY(v1, R - 10);
  const n2 = v2 != null ? toXY(v2, R - 22) : null;

  const c1 = zoneColor(v1, yellowThreshold, greenThreshold);
  const c2 = v2 != null ? zoneColor(v2, yellowThreshold, greenThreshold) : null;

  const LABEL_TICKS = [0, 20, 40, 60, 80, 100];
  const DIV_TICKS   = [20, 40, 60, 80];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* ── Gauge SVG ─────────────────────────────────────────────────────── */}
      <svg viewBox="0 0 280 148" width="100%" style={{ maxWidth: 420, overflow: 'visible' }}>

        {/* Colored zone arcs */}
        <path d={zonePath(0, yellowThreshold)} fill={RED} />
        <path d={zonePath(yellowThreshold, greenThreshold)} fill={ORANGE} />
        <path d={zonePath(greenThreshold, 100)} fill={GREEN} />

        {/* White tick dividers */}
        {DIV_TICKS.map(t => (
          <path key={t} d={tickPath(t)} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        ))}

        {/* Percentage labels outside the arc */}
        {LABEL_TICKS.map(t => {
          const pos = toXY(t, R + 17);
          return (
            <text key={t}
              x={pos.x.toFixed(1)} y={pos.y.toFixed(1)}
              textAnchor={anchor(t)} dominantBaseline="middle"
              fontSize="9.5" fontWeight="500"
              fill="rgba(80,80,100,0.85)">
              {t}%
            </text>
          );
        })}

        {/* Primary needle — solid dark */}
        <line
          x1={cx} y1={cy}
          x2={f(n1.x)} y2={f(n1.y)}
          stroke="#1a1a3e" strokeWidth="2.5" strokeLinecap="round"
        />

        {/* Secondary needle — dashed blue */}
        {n2 && (
          <line
            x1={cx} y1={cy}
            x2={f(n2.x)} y2={f(n2.y)}
            stroke="#1441F5" strokeWidth="1.8" strokeLinecap="round"
            strokeDasharray="5 3"
          />
        )}

        {/* Pivot dot */}
        <circle cx={cx} cy={cy} r={5.5} fill="#1a1a3e" />
        <circle cx={cx} cy={cy} r={2.5} fill="white" />
      </svg>

      {/* ── Value labels ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 32, marginTop: 4, justifyContent: 'center' }}>
        {/* Primary */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 34, fontWeight: 800, color: c1,
            lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
          }}>
            {v1.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 11, marginTop: 5, color: 'rgba(80,80,100,0.8)',
            display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: c1, display: 'inline-block', flexShrink: 0,
            }} />
            {label1}
          </div>
        </div>

        {/* Secondary (optional) */}
        {v2 != null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 34, fontWeight: 800, color: c2,
              lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
            }}>
              {v2.toFixed(1)}%
            </div>
            <div style={{
              fontSize: 11, marginTop: 5, color: 'rgba(80,80,100,0.8)',
              display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: c2, display: 'inline-block', flexShrink: 0,
              }} />
              {label2}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
