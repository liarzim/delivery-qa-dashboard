/**
 * LivePreview — renders a Recharts chart (or KPI card / raw table) from
 * aggregated chart data.  Updates immediately as config changes.
 */
import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

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

export default function LivePreview({ config, chartData }) {
  const color  = config.color || '#3F64F7';
  const type   = config.chartType || 'bar';
  const noData = !chartData || chartData.length === 0;

  // KPI Card
  if (type === 'kpi') {
    const total = useMemo(() => chartData?.reduce((a, b) => a + b.y, 0) ?? 0, [chartData]);
    return (
      <div className="card h-full flex flex-col items-center justify-center gap-2">
        <p className="text-xs font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>{config.name || 'KPI'}</p>
        <p className="text-5xl font-bold" style={{ color }}>{total.toLocaleString()}</p>
        <p className="text-xs" style={{ color: 'rgba(237,240,254,0.35)' }}>
          {config.formula?.toUpperCase()} of {config.yField || 'rows'} by {config.xField || '—'}
        </p>
      </div>
    );
  }

  // Raw Table
  if (type === 'table') {
    if (noData) return <EmptyState message="No data — choose X-axis field" />;
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(20,65,245,0.3)' }}>
              <th className="text-left px-3 py-2 font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>{config.xField}</th>
              <th className="text-right px-3 py-2 font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>Value</th>
              <th className="text-right px-3 py-2 font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>Rows</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(20,65,245,0.08)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(20,65,245,0.08)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                <td className="px-3 py-1.5 text-sigma-ice">{row.x}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color }}>{row.y.toLocaleString()}</td>
                <td className="px-3 py-1.5 text-right" style={{ color: 'rgba(237,240,254,0.4)' }}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
