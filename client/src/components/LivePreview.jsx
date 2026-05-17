/**
 * LivePreview — renders a Recharts chart (or KPI card / raw table) from
 * aggregated chart data.  Updates immediately as config changes.
 */
import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import SemiGaugeChart from './SemiGaugeChart';

const COLORS = ['#3F64F7','#27DBE4','#54E075','#F9BD33','#FB79F3','#F36059','#FF8E21','#0D9488'];

const G = {
  grid:   'rgba(20,65,245,0.15)',
  tick:   { fill: 'rgba(237,240,254,0.45)', fontSize: 10 },
  tip:    { backgroundColor: '#0B1748', border: '1px solid rgba(20,65,245,0.4)', borderRadius: 8, color: '#EDF0FE', fontSize: 11 },
};

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3"
      style={{ color: 'rgba(237,240,254,0.3)' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
      <p className="text-xs">{message}</p>
    </div>
  );
}

export default function LivePreview({ config, chartData, rawRows = [] }) {
  const color  = config.color || '#3F64F7';
  const type   = config.chartType || 'bar';
  const noData = !chartData || chartData.length === 0;

  // Always call hooks unconditionally (Rules of Hooks)
  const kpiTotal = useMemo(() => chartData?.reduce((a, b) => a + b.y, 0) ?? 0, [chartData]);

  // KPI Card
  if (type === 'kpi') {
    return (
      <div className="card h-full flex flex-col items-center justify-center gap-2">
        <p className="text-xs font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>{config.name || 'KPI'}</p>
        <p className="text-5xl font-bold" style={{ color }}>{kpiTotal.toLocaleString()}</p>
        <p className="text-xs" style={{ color: 'rgba(237,240,254,0.35)' }}>
          {config.formula?.toUpperCase()} of {config.yField || 'rows'} by {config.xField || '—'}
        </p>
      </div>
    );
  }

  // Raw Table — shows filtered raw rows with user-selected columns
  if (type === 'table') {
    if (!rawRows || rawRows.length === 0) return <EmptyState message="No data — choose a data source" />;

    const visibleCols = (config.tableColumns || [])
      .filter(c => c.visible)
      .map(c => c.key);
    const cols = visibleCols.length > 0
      ? visibleCols
      : Object.keys(rawRows[0] || {}).slice(0, 10);

    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#0B1748' }}>
            <tr style={{ borderBottom: '1px solid rgba(20,65,245,0.3)' }}>
              {cols.map(col => (
                <th key={col} className="text-left px-3 py-2 font-semibold whitespace-nowrap"
                  style={{ color: 'rgba(237,240,254,0.5)' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawRows.slice(0, 500).map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(20,65,245,0.07)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(20,65,245,0.08)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                {cols.map(col => (
                  <td key={col} className="px-3 py-1.5 whitespace-nowrap"
                    style={{ color: 'rgba(237,240,254,0.85)' }}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rawRows.length > 500 && (
          <p className="text-center text-xs py-2" style={{ color: 'rgba(237,240,254,0.3)' }}>
            Showing first 500 of {rawRows.length} rows
          </p>
        )}
      </div>
    );
  }

  // Gauge — single aggregated percentage value, optional second needle
  if (type === 'gauge') {
    const primaryVals = chartData.map(d => d.y).filter(n => isFinite(n));
    const primaryAvg  = primaryVals.length > 0
      ? primaryVals.reduce((s, v) => s + v, 0) / primaryVals.length
      : 0;

    let secondaryAvg = null;
    if (config.gauge2Field && rawRows.length > 0) {
      const vals = rawRows
        .map(row => parseFloat(row[config.gauge2Field]))
        .filter(n => !isNaN(n));
      if (vals.length > 0)
        secondaryAvg = vals.reduce((s, v) => s + v, 0) / vals.length;
    }

    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <SemiGaugeChart
          value={primaryAvg}
          value2={secondaryAvg}
          yellowThreshold={Number(config.gaugeYellowThreshold ?? 60)}
          greenThreshold={Number(config.gaugeGreenThreshold  ?? 80)}
          label1={config.gaugeLabel1 || config.yField  || '% Actual'}
          label2={config.gaugeLabel2 || config.gauge2Field || '% Adjusted'}
        />
      </div>
    );
  }

  if (noData) return <EmptyState message="No data — choose an X-axis field" />;

  // Common chart props
  const commonAxis = {
    xAxis: <XAxis dataKey="x" tick={G.tick} axisLine={false} tickLine={false} />,
    yAxis: <YAxis tick={G.tick} axisLine={false} tickLine={false} />,
    grid:  <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />,
    tip:   <Tooltip contentStyle={G.tip} />,
  };

  if (type === 'bar') return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        {commonAxis.grid}{commonAxis.xAxis}{commonAxis.yAxis}{commonAxis.tip}
        <Bar dataKey="y" name={config.yField || 'Value'} fill={color} radius={[4,4,0,0]} maxBarSize={60} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (type === 'line') return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        {commonAxis.grid}{commonAxis.xAxis}{commonAxis.yAxis}{commonAxis.tip}
        <Line type="monotone" dataKey="y" name={config.yField || 'Value'} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
      </LineChart>
    </ResponsiveContainer>
  );

  if (type === 'area') return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        {commonAxis.grid}{commonAxis.xAxis}{commonAxis.yAxis}{commonAxis.tip}
        <defs>
          <linearGradient id="wbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" name={config.yField || 'Value'} stroke={color} fill="url(#wbGrad)" strokeWidth={2} dot={{ r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (type === 'pie') return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="y" nameKey="x" cx="50%" cy="50%" outerRadius="70%"
          label={({ x, percent }) => `${x} (${(percent * 100).toFixed(0)}%)`}
          labelLine={{ stroke: 'rgba(237,240,254,0.25)' }}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={G.tip} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 10, color: 'rgba(237,240,254,0.55)' }} />
      </PieChart>
    </ResponsiveContainer>
  );

  return <EmptyState message={`Unknown chart type: ${type}`} />;
}
