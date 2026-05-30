import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from './LoadingSpinner';

const COLORS = {
  done:            '#54E075',
  notDoneSigma:    '#F04E4E',
  notDoneCustomer: '#F9BD33',
};

const LABELS = {
  done:            'בוצע',
  notDoneSigma:    'לא בוצע (סיגמה)',
  notDoneCustomer: 'לא בוצע (לקוח)',
};

function buildSlices(tally) {
  return ['done', 'notDoneSigma', 'notDoneCustomer']
    .map(key => ({ name: LABELS[key], value: tally[key] || 0, key }))
    .filter(s => s.value > 0);
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const total = payload[0].payload.total;
  const pct   = total ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ backgroundColor: '#0B1748', border: '1px solid rgba(20,65,245,0.35)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#EDF0FE' }}>
      <div className="font-semibold">{name}</div>
      <div>{value} ({pct}%)</div>
    </div>
  );
};

export default function CommitmentStatusPieWidget() {
  const { data, loading, error } = useApi('/api/data/delivery/status-dist');
  const [stage, setStage] = useState('');

  if (loading) return <LoadingSpinner />;
  if (error || !data) return (
    <div className="card flex items-center justify-center text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>
      {error || 'No data'}
    </div>
  );

  const tally  = stage ? (data.byStage?.[stage] || data.overall) : data.overall;
  const slices = buildSlices(tally).map(s => ({ ...s, total: tally.total }));

  return (
    <div className="card h-full flex flex-col gap-3 p-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: '#EDF0FE' }}>{tally.total}</span>
          <span className="text-xs" style={{ color: 'rgba(237,240,254,0.45)' }}>פיצ&apos;רים</span>
        </div>
        <div className="flex items-center gap-2" dir="rtl">
          <span className="text-xs font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>
            :סינון לפי Delivery Stage
          </span>
          <select
            value={stage}
            onChange={e => setStage(e.target.value)}
            className="sigma-input text-xs"
            style={{ minWidth: 100, padding: '2px 8px' }}
          >
            <option value="">(All) הכל</option>
            {(data.stages || []).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-center" style={{ color: 'rgba(237,240,254,0.75)' }}>
        התפלגות סטטוסים כוללת
      </p>

      {/* Pie */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={({ name, value, percent }) =>
                `(${Math.round(percent * 100)}%) ${value}`
              }
              labelLine={false}
            >
              {slices.map(s => (
                <Cell key={s.key} fill={COLORS[s.key]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={v => <span style={{ fontSize: 11, color: 'rgba(237,240,254,0.65)' }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
