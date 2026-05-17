import React, { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { useLayout } from '../hooks/useLayout';
import { useCustomGrid } from '../hooks/useCustomGrid';
import GaugeChart from '../components/GaugeChart';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import DashboardLayout from '../components/DashboardLayout';
import SubDashboardTabs from '../components/SubDashboardTabs';
import WidgetBank from '../components/WidgetBank';
import GridWidget from '../components/GridWidget';
import GridDropZone from '../components/GridDropZone';
import { AlertCircle, ChevronDown, ChevronRight, ChevronLeft, Layers, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { ALL_WIDGETS } from '../constants/widgets';

const G = {
  grid:   'rgba(20,65,245,0.18)',
  tick:   { fill: 'rgba(237,240,254,0.45)', fontSize: 11 },
  tip:    { backgroundColor: '#0B1748', border: '1px solid rgba(20,65,245,0.35)', borderRadius: '8px', color: '#EDF0FE', fontSize: 12 },
  legend: { fontSize: 11, color: 'rgba(237,240,254,0.55)' },
};
const C = {
  committed: '#3F64F7', uncommitted: '#FB79F3', overall: '#54E075',
  velocity: '#27DBE4', avg: '#F9BD33', done: '#54E075',
  inProgress: '#3F64F7', todo: '#44546A', flow: '#27DBE4',
};

function CardLabel({ children }) {
  return <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(237,240,254,0.5)' }}>{children}</p>;
}

const WIDGETS = [
  { id: 'commitment-gauges', label: 'Commitment Rates' },
  { id: 'kpi-summary',       label: 'Summary KPIs' },
  { id: 'chart-velocity',    label: 'Flow Throughput & Velocity' },
  { id: 'chart-commitment',  label: 'Commitment Rate Trend' },
  { id: 'chart-flowtime',    label: 'Median Flow Time' },
  { id: 'chart-flowdist',    label: 'Flow Distribution' },
  { id: 'pi-table',          label: 'PI Breakdown Table' },
];

export default function DeliveryDashboard() {
  const { t, isRTL, lang } = useLanguage();
  const { data, loading, error }   = useApi('/api/data/delivery');
  const { data: qaData }           = useApi('/api/data/qa');
  const { data: settings }         = useApi('/api/settings');
  const { isOpen: bankOpen, toggle: toggleBank, setIsOpen: setBankOpen, customWidgets } = useWidgetBank();
  const [selectedPI, setSelectedPI] = useState(null);
  const [drilldown, setDrilldown]   = useState(null);
  const layoutHook = useLayout('delivery', WIDGETS);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const customGrid = useCustomGrid('custom_grid_delivery', lang, customWidgets);

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="flex items-center gap-2 text-sm rounded-lg p-4"
      style={{ color: '#F36059', backgroundColor: 'rgba(243,96,89,0.1)', border: '1px solid rgba(243,96,89,0.25)' }}>
      <AlertCircle size={16} /> {error}
    </div>
  );

  const { piMetrics = [], flowMetrics = [], summary = {} } = data || {};
  const pi = selectedPI
    ? piMetrics.find(p => p.rawPi === selectedPI)
    : piMetrics[piMetrics.length - 1];
  const s = settings || {};
  const dWeight      = parseFloat(s.delivery_weight || 60);
  const qWeight      = parseFloat(s.quality_weight  || 40);
  const commitYellow = parseFloat(s.commitment_yellow || 80);
  const commitRed    = parseFloat(s.commitment_red   || 60);

  const commitColor  = (pi?.committedRate  || 0) >= commitYellow ? '#54E075' : (pi?.committedRate  || 0) >= commitRed ? '#F9BD33' : '#F36059';
  const overallColor = (pi?.overallRate    || 0) >= commitYellow ? '#54E075' : (pi?.overallRate    || 0) >= commitRed ? '#F9BD33' : '#F36059';
  const avgVelocity  = summary.avgVelocity || 0;

  const velocityData = flowMetrics.map(f => ({ pi: f.pi, Throughput: f.throughput }));
  const flowDistData = flowMetrics.map(f => ({
    pi: f.pi,
    Done:          f.flowDistribution?.done        || 0,
    'In Progress': f.flowDistribution?.inProgress  || 0,
    'To Do':       f.flowDistribution?.todo        || 0,
  }));
  const medianData = flowMetrics.map(f => ({ pi: f.pi, 'Median Days': f.medianFlowTime }));
  const flowByRawPi = Object.fromEntries(flowMetrics.map(f => [f.rawPi, f]));

  const piSelector = (
    <select
      value={selectedPI || ''}
      onChange={e => setSelectedPI(e.target.value || null)}
      className="sigma-input text-xs"
      style={{ width: 'auto', paddingTop: 6, paddingBottom: 6 }}
    >
      <option value="">Latest PI</option>
      {piMetrics.map(p => <option key={p.rawPi} value={p.rawPi}>{p.pi}</option>)}
    </select>
  );

  const widgetMap = {
    'commitment-gauges': pi && (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <CardLabel>Commitment Rates — {pi.pi}</CardLabel>
          {piSelector}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { value: pi.committedRate,   color: commitColor,  label: 'Committed Rate',   sub: `${pi.committedDone} / ${pi.totalCommitted} committed` },
            { value: pi.uncommittedRate, color: C.uncommitted, label: 'Uncommitted Rate', sub: `${pi.uncommittedDone} / ${pi.totalUncommitted} not committed` },
            { value: pi.overallRate,     color: overallColor, label: 'Overall Rate',      sub: `${pi.totalDone} / ${pi.totalFeatures} total` },
          ].map(({ value, color, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <GaugeChart value={value} color={color} label={label} />
              <p className="text-xs text-center" style={{ color: 'rgba(237,240,254,0.4)' }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>
    ),

    'kpi-summary': (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Average Velocity"  value={summary.avgVelocity}     unit=" items/PI" light="neutral" />
        <KpiCard label="Total Throughput"  value={summary.totalThroughput} unit=" items"    light="neutral" />
        <KpiCard label="Delivery Weight"   value={dWeight}                 unit="%"         light="neutral" />
        <KpiCard label="Quality Weight"    value={qWeight}                 unit="%"         light="neutral" />
      </div>
    ),

    'chart-velocity': (
      <div className="card">
        <CardLabel>Flow Throughput &amp; Average Velocity</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={velocityData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
            <XAxis dataKey="pi" tick={G.tick} axisLine={false} tickLine={false} />
            <YAxis tick={G.tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={G.tip} />
            <ReferenceLine y={avgVelocity} stroke={C.avg} strokeDasharray="4 4"
              label={{ value: `Avg ${avgVelocity}`, fill: C.avg, fontSize: 10 }} />
            <Line type="monotone" dataKey="Throughput" stroke={C.velocity} strokeWidth={2} dot={{ fill: C.velocity, r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ),

    'chart-commitment': (
      <div className="card">
        <CardLabel>Commitment Rate Trend</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={piMetrics} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
            <XAxis dataKey="pi" tick={G.tick} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={G.tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={G.tip} formatter={v => `${v}%`} />
            <Legend wrapperStyle={G.legend} />
            <Line type="monotone" dataKey="committedRate"   stroke={C.committed}   strokeWidth={2} dot={{ r: 3 }} name="Committed %"   />
            <Line type="monotone" dataKey="uncommittedRate" stroke={C.uncommitted} strokeWidth={2} dot={{ r: 3 }} name="Uncommitted %" />
            <Line type="monotone" dataKey="overallRate"     stroke={C.overall}     strokeWidth={2} dot={{ r: 3 }} name="Overall %"     />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ),

    'chart-flowtime': (
      <div className="card">
        <CardLabel>Median Flow Time (days)</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={medianData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
            <XAxis dataKey="pi" tick={G.tick} axisLine={false} tickLine={false} />
            <YAxis tick={G.tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={G.tip} formatter={v => `${v} days`} />
            <Bar dataKey="Median Days" fill={C.flow} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ),

    'chart-flowdist': (
      <div className="card">
        <CardLabel>Flow Distribution by PI</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={flowDistData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
            <XAxis dataKey="pi" tick={G.tick} axisLine={false} tickLine={false} />
            <YAxis tick={G.tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={G.tip} />
            <Legend wrapperStyle={G.legend} />
            <Area type="monotone" dataKey="Done"        stackId="1" stroke={C.done}       fill={C.done + '30'}       strokeWidth={2} />
            <Area type="monotone" dataKey="In Progress" stackId="1" stroke={C.inProgress} fill={C.inProgress + '30'} strokeWidth={2} />
            <Area type="monotone" dataKey="To Do"       stackId="1" stroke={C.todo}       fill={C.todo + '30'}       strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    ),

    'pi-table': (
      <div className="card">
        <CardLabel>PI Breakdown — click a row to expand flow detail</CardLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
                {['', 'PI', 'Total', 'Done', 'Committed', 'Com. Done', 'Com. Rate', 'Overall Rate'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'rgba(237,240,254,0.35)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {piMetrics.map(p => {
                const isOpen = drilldown === p.rawPi;
                const flow   = flowByRawPi[p.rawPi];
                return (
                  <React.Fragment key={p.rawPi}>
                    <tr className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(20,65,245,0.12)' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(20,65,245,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      onClick={() => setDrilldown(isOpen ? null : p.rawPi)}>
                      <td className="py-2 pr-2 w-5">
                        {isOpen
                          ? <ChevronDown size={13} style={{ color: '#3F64F7' }} />
                          : isRTL
                            ? <ChevronLeft  size={13} style={{ color: 'rgba(237,240,254,0.35)' }} />
                            : <ChevronRight size={13} style={{ color: 'rgba(237,240,254,0.35)' }} />}
                      </td>
                      <td className="py-2 pr-4 font-semibold text-sigma-ice">{p.pi}</td>
                      <td className="py-2 pr-4" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.totalFeatures}</td>
                      <td className="py-2 pr-4" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.totalDone}</td>
                      <td className="py-2 pr-4" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.totalCommitted}</td>
                      <td className="py-2 pr-4" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.committedDone}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.committedRate >= commitYellow ? 'badge-green' : p.committedRate >= commitRed ? 'badge-yellow' : 'badge-red'}`}>
                          {p.committedRate}%
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.overallRate >= commitYellow ? 'badge-green' : p.overallRate >= commitRed ? 'badge-yellow' : 'badge-red'}`}>
                          {p.overallRate}%
                        </span>
                      </td>
                    </tr>
                    {isOpen && flow && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div className="px-6 py-4 space-y-3"
                            style={{ backgroundColor: 'var(--p-card-bg)', borderBottom: '1px solid var(--p-card-border)' }}>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#3F64F7' }}>
                              {p.pi} — Flow Detail
                            </p>
                            <div className="grid grid-cols-4 gap-4">
                              {[
                                ['Throughput',       flow.throughput,                     'items'],
                                ['Median Flow Time', flow.medianFlowTime,                 'days'],
                                ['Avg Flow Time',    flow.avgFlowTime,                    'days'],
                                ['Done (flow)',      flow.flowDistribution?.done || 0,    'items'],
                              ].map(([label, value, unit]) => (
                                <div key={label} className="rounded-lg px-4 py-3"
                                  style={{ backgroundColor: 'rgba(20,65,245,0.1)', border: '1px solid rgba(20,65,245,0.2)' }}>
                                  <p className="text-xs mb-1" style={{ color: 'rgba(237,240,254,0.45)' }}>{label}</p>
                                  <p className="text-xl font-bold" style={{ color: '#27DBE4' }}>
                                    {value ?? '—'}
                                    <span className="text-xs font-normal ml-1" style={{ color: 'rgba(237,240,254,0.4)' }}>{unit}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {[
                                ['Done',        flow.flowDistribution?.done        || 0, '#54E075'],
                                ['In Progress', flow.flowDistribution?.inProgress  || 0, '#3F64F7'],
                                ['To Do',       flow.flowDistribution?.todo        || 0, '#44546A'],
                              ].map(([label, val, color]) => (
                                <div key={label} className="flex items-center gap-3 rounded-lg px-4 py-2"
                                  style={{ backgroundColor: 'rgba(20,65,245,0.08)', border: '1px solid rgba(20,65,245,0.15)' }}>
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                  <span className="text-xs" style={{ color: 'rgba(237,240,254,0.6)' }}>{label}</span>
                                  <span className="text-xs font-bold ml-auto" style={{ color }}>{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    ),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={customGrid.handleDragStart}
      onDragEnd={customGrid.handleDragEnd}
    >
      <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">

        <WidgetBank
          widgets={ALL_WIDGETS}
          activeWidgetIds={customGrid.gridWidgetIds}
          isOpen={bankOpen}
          onClose={() => setBankOpen(false)}
          style={{ order: 2 }}
        />

        <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
          <SubDashboardTabs parentId="delivery" parentPath="/delivery" parentLabel={t('delivery_title')} />
          <SectionHeader
            title={t('delivery_title')}
            titleKey="delivery.title"
            subtitle={t('delivery_subtitle')}
            action={
              <button
                onClick={toggleBank}
                className="flex items-center gap-1.5 btn-secondary text-xs py-1.5"
                style={bankOpen ? { backgroundColor: 'var(--p-accent)', color: '#fff', borderColor: 'var(--p-accent)' } : {}}
              >
                <Layers size={13} />
                {bankOpen ? 'Hide Widgets' : 'Add Widgets'}
              </button>
            }
          />
          <DashboardLayout
            dashboardId="delivery"
            useLayoutHook={layoutHook}
            widgetMap={widgetMap}
          />

          {/* ── Custom widgets zone (droppable even when empty) ── */}
          <GridDropZone>
            {customGrid.gridWidgets.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: 'rgba(237,240,254,0.35)', letterSpacing: '0.1em' }}>
                  {lang === 'he' ? 'ווידג\'טים מותאמים' : 'Custom Widgets'}
                </p>
                <SortableContext items={customGrid.gridWidgetIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-4">
                    {customGrid.gridWidgets.map(widget => (
                      <GridWidget
                        key={widget.id}
                        widget={widget}
                        delivery={data}
                        qa={qaData}
                        settings={settings}
                        onRemove={customGrid.removeWidget}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {bankOpen && customGrid.gridWidgets.length === 0 && (
              <div className="mt-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 gap-3"
                style={{ borderColor: 'rgba(120,150,255,0.2)', color: 'rgba(237,240,254,0.3)' }}>
                <LayoutGrid size={28} />
                <p className="text-sm">{lang === 'he' ? 'גרור ווידג\'ט לכאן' : 'Drag a widget here to add it'}</p>
              </div>
            )}
          </GridDropZone>
        </div>
      </div>

      <DragOverlay>
        {customGrid.activeWidget && (
          <div className="px-3 py-2 rounded-lg border text-xs font-medium shadow-xl"
            style={{ borderColor: 'var(--p-accent)', backgroundColor: 'rgba(20,65,245,0.2)', color: '#93C5FD' }}>
            {customGrid.activeWidget.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
