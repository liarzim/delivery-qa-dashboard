import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import DashboardRGL from '../components/DashboardRGL';
import { useRGLLayout } from '../hooks/useRGLLayout';
import CustomWidgetRenderer from '../components/CustomWidgetRenderer';
import KpiCard from '../components/KpiCard';
import TrafficLightWidget from '../components/TrafficLightWidget';
import SectionHeader from '../components/SectionHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import SubDashboardTabs from '../components/SubDashboardTabs';
import WidgetBank from '../components/WidgetBank';
import { getTrafficLight } from '../utils/thresholds';
import { AlertCircle, ChevronDown, ChevronRight, ChevronLeft, Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EditableText from '../components/EditableText';
import { useWidgetBank } from '../context/WidgetBankContext';
import { ALL_WIDGETS } from '../constants/widgets';

const G = {
  grid:   'rgba(20,65,245,0.18)',
  tick:   { fill: 'rgba(237,240,254,0.45)', fontSize: 11 },
  tip:    { backgroundColor: '#0B1748', border: '1px solid rgba(20,65,245,0.35)', borderRadius: '8px', color: '#EDF0FE', fontSize: 12 },
  legend: { fontSize: 11, color: 'rgba(237,240,254,0.55)' },
};
const C = {
  reopen: '#3F64F7', rejected: '#FB79F3', escaping: '#F36059',
  reopenDensity: '#27DBE4', rejectedDensity: '#F9BD33', escapingDensity: '#FF8E21',
};
const SQUAD_COLORS = ['#3F64F7', '#54E075', '#FB79F3', '#F9BD33', '#F36059', '#27DBE4'];

function CardLabel({ children, textKey }) {
  if (textKey) {
    return (
      <EditableText
        textKey={textKey}
        fallback={typeof children === 'string' ? children : ''}
        tag="p"
        className="font-semibold mb-4"
        style={{ color: 'rgba(237,240,254,0.5)', fontSize: 'var(--p-widget-title-size)' }}
      />
    );
  }
  return (
    <p className="font-semibold mb-4" style={{ color: 'rgba(237,240,254,0.5)', fontSize: 'var(--p-widget-title-size)' }}>
      {children}
    </p>
  );
}

const QA_DEFAULT_LAYOUT = [
  { i: 'traffic-lights',   x: 0, y: 0,  w: 12, h: 6,  minH: 2 },
  { i: 'density-kpis',     x: 0, y: 6,  w: 12, h: 4,  minH: 2 },
  { i: 'chart-trends',     x: 0, y: 10, w: 6,  h: 8,  minH: 3 },
  { i: 'chart-density',    x: 6, y: 10, w: 6,  h: 8,  minH: 3 },
  { i: 'squad-comparison', x: 0, y: 18, w: 12, h: 8,  minH: 3 },
  { i: 'pi-table',         x: 0, y: 26, w: 12, h: 10, minH: 3 },
];

export default function QADashboard() {
  const { t, isRTL, lang } = useLanguage();
  const { data, loading, error }   = useApi('/api/data/qa');
  const { data: settings }         = useApi('/api/settings');
  const { isOpen: bankOpen, toggle: toggleBank, setIsOpen: setBankOpen, customWidgets } = useWidgetBank();
  const [drilldown, setDrilldown]   = useState(null);
  const rglLayout = useRGLLayout('qa', QA_DEFAULT_LAYOUT);

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div className="flex items-center gap-2 text-sm rounded-lg p-4"
      style={{ color: '#F36059', backgroundColor: 'rgba(243,96,89,0.1)', border: '1px solid rgba(243,96,89,0.25)' }}>
      <AlertCircle size={16} /> {error}
    </div>
  );

  const { piMetrics = [], squadMetrics = [] } = data || {};
  // Filter out empty PIs (only in escaping data)
  const activePIs = piMetrics.filter(p => p.totalBugs > 0);
  const latest = activePIs[activePIs.length - 1] || {};
  const s = settings || {};

  const th = {
    reopenY:   parseFloat(s.reopen_yellow    || 5),  reopenR:   parseFloat(s.reopen_red       || 10),
    rejectedY: parseFloat(s.rejected_yellow  || 5),  rejectedR: parseFloat(s.rejected_red     || 10),
    escapingY: parseFloat(s.escaping_yellow  || 3),  escapingR: parseFloat(s.escaping_red     || 7),
    rdY:       parseFloat(s.reopen_density_yellow   || 2),  rdR: parseFloat(s.reopen_density_red      || 5),
    xdY:       parseFloat(s.rejected_density_yellow || 2),  xdR: parseFloat(s.rejected_density_red    || 5),
    edY:       parseFloat(s.escaping_density_yellow || 2),  edR: parseFloat(s.escaping_density_red    || 5),
  };

  const lights = {
    reopen:          getTrafficLight(latest.reopenPct,       th.reopenY,   th.reopenR),
    rejected:        getTrafficLight(latest.rejectedPct,     th.rejectedY, th.rejectedR),
    escaping:        getTrafficLight(latest.escapingPct,     th.escapingY, th.escapingR),
    reopenDensity:   getTrafficLight(latest.reopenDensity,   th.rdY,       th.rdR),
    rejectedDensity: getTrafficLight(latest.rejectedDensity, th.xdY,       th.xdR),
    escapingDensity: getTrafficLight(latest.escapingDensity, th.edY,       th.edR),
  };

  const trendData   = activePIs.map(p => ({ pi: p.pi, 'Reopen %': p.reopenPct, 'Rejected %': p.rejectedPct, 'Escaping %': p.escapingPct }));
  const densityData = activePIs.map(p => ({ pi: p.pi, 'Reopen Density': p.reopenDensity, 'Rejected Density': p.rejectedDensity, 'Escaping Density': p.escapingDensity }));

  const widgetMap = {
    'traffic-lights': (
      <div className="card p-5 h-full">
        <div className="grid grid-cols-3 gap-4">
          <TrafficLightWidget label="Reopen %"  value={latest.reopenPct   || 0} light={lights.reopen}   yellowThreshold={th.reopenY}   redThreshold={th.reopenR}   />
          <TrafficLightWidget label="Rejected %" value={latest.rejectedPct || 0} light={lights.rejected}  yellowThreshold={th.rejectedY} redThreshold={th.rejectedR} />
          <TrafficLightWidget label="Escaping %" value={latest.escapingPct || 0} light={lights.escaping}  yellowThreshold={th.escapingY} redThreshold={th.escapingR} />
        </div>
      </div>
    ),

    'density-kpis': (
      <div className="card p-5 h-full">
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Reopen Density"   value={latest.reopenDensity   || 0} unit="%" light={lights.reopenDensity}   sub={`Capacity: ${latest.capacity || '—'}`} />
          <KpiCard label="Rejected Density" value={latest.rejectedDensity || 0} unit="%" light={lights.rejectedDensity} sub={`Capacity: ${latest.capacity || '—'}`} />
          <KpiCard label="Escaping Density" value={latest.escapingDensity || 0} unit="%" light={lights.escapingDensity} sub={`Capacity: ${latest.capacity || '—'}`} />
        </div>
      </div>
    ),

    'chart-trends': (
      <div className="card p-5 h-full">
        <CardLabel textKey="qa.trends.caption">Bug Rate Trends (%)</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trendData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
            <XAxis dataKey="pi" tick={G.tick} axisLine={false} tickLine={false} />
            <YAxis tick={G.tick} axisLine={false} tickLine={false} unit="%" />
            <Tooltip contentStyle={G.tip} formatter={v => `${v}%`} />
            <Legend wrapperStyle={G.legend} />
            <Bar dataKey="Reopen %"   fill={C.reopen}   radius={[3,3,0,0]} />
            <Bar dataKey="Rejected %" fill={C.rejected} radius={[3,3,0,0]} />
            <Bar dataKey="Escaping %" fill={C.escaping} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ),

    'chart-density': (
      <div className="card p-5 h-full">
        <CardLabel textKey="qa.density.caption">Density Trends</CardLabel>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={densityData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
            <XAxis dataKey="pi" tick={G.tick} axisLine={false} tickLine={false} />
            <YAxis tick={G.tick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={G.tip} />
            <Legend wrapperStyle={G.legend} />
            <Bar dataKey="Reopen Density"   fill={C.reopenDensity}   radius={[3,3,0,0]} />
            <Bar dataKey="Rejected Density" fill={C.rejectedDensity} radius={[3,3,0,0]} />
            <Bar dataKey="Escaping Density" fill={C.escapingDensity} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ),

    'squad-comparison': (
      <div className="card p-5 h-full">
        <CardLabel textKey="qa.squad.caption">Squad Bug Comparison (all PIs)</CardLabel>
        {squadMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={squadMetrics} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={G.grid} />
              <XAxis dataKey="squad" tick={G.tick} axisLine={false} tickLine={false} />
              <YAxis tick={G.tick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={G.tip} />
              <Legend wrapperStyle={G.legend} />
              <Bar dataKey="totalBugs" name="Total Bugs" radius={[3,3,0,0]}>
                {squadMetrics.map((_, i) => <Cell key={i} fill={SQUAD_COLORS[i % SQUAD_COLORS.length]} />)}
              </Bar>
              <Bar dataKey="reopenCount"   name="Reopens"  fill={C.rejectedDensity} radius={[3,3,0,0]} />
              <Bar dataKey="rejectedCount" name="Rejected" fill={C.rejected}        radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>No squad data available.</p>
        )}
      </div>
    ),

    'pi-table': (
      <div className="card p-5 h-full overflow-auto">
        <CardLabel textKey="qa.pi_table.caption">PI Detail Breakdown — click a row to expand squad view</CardLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
                {['', 'PI', 'Bugs', 'Closed', 'Reopen', 'Reopen%', 'Rejected', 'Rej%', 'Escaping%', 'Capacity'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'rgba(237,240,254,0.35)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activePIs.map(p => {
                const isOpen = drilldown === p.rawPi;
                const rl = getTrafficLight(p.reopenPct,   th.reopenY,   th.reopenR);
                const xl = getTrafficLight(p.rejectedPct, th.rejectedY, th.rejectedR);
                const el = getTrafficLight(p.escapingPct, th.escapingY, th.escapingR);
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
                      <td className="py-2 pr-3 font-semibold text-sigma-ice">{p.pi}</td>
                      <td className="py-2 pr-3" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.totalBugs}</td>
                      <td className="py-2 pr-3" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.closedBugs}</td>
                      <td className="py-2 pr-3" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.reopenCount}</td>
                      <td className="py-2 pr-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full badge-${rl}`}>{p.reopenPct}%</span></td>
                      <td className="py-2 pr-3" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.rejectedCount}</td>
                      <td className="py-2 pr-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full badge-${xl}`}>{p.rejectedPct}%</span></td>
                      <td className="py-2 pr-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full badge-${el}`}>{p.escapingPct}%</span></td>
                      <td className="py-2 pr-3" style={{ color: 'rgba(237,240,254,0.6)' }}>{p.capacity}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0 }}>
                          <div className="px-6 py-4"
                            style={{ backgroundColor: 'var(--p-card-bg)', borderBottom: '1px solid var(--p-card-border)' }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#3F64F7' }}>
                              {p.pi} — Squad Breakdown
                            </p>
                            {(!p.squadBreakdown || p.squadBreakdown.length === 0)
                              ? <p className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>No squad data for this PI.</p>
                              : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(20,65,245,0.15)' }}>
                                      {['Squad', 'Bugs', 'Closed', 'Reopens', 'Reopen %', 'Rejected', 'Rej %'].map(h => (
                                        <th key={h} className="text-left py-1.5 pr-4 font-bold uppercase tracking-wider"
                                          style={{ color: 'rgba(237,240,254,0.3)' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.squadBreakdown.map((sq, idx) => {
                                      const sqRl = getTrafficLight(sq.reopenPct,   th.reopenY,   th.reopenR);
                                      const sqXl = getTrafficLight(sq.rejectedPct, th.rejectedY, th.rejectedR);
                                      return (
                                        <tr key={sq.squad} style={{ borderBottom: '1px solid rgba(20,65,245,0.1)' }}>
                                          <td className="py-1.5 pr-4 font-semibold" style={{ color: SQUAD_COLORS[idx % SQUAD_COLORS.length] }}>{sq.squad}</td>
                                          <td className="py-1.5 pr-4" style={{ color: 'rgba(237,240,254,0.65)' }}>{sq.totalBugs}</td>
                                          <td className="py-1.5 pr-4" style={{ color: 'rgba(237,240,254,0.65)' }}>{sq.closedBugs}</td>
                                          <td className="py-1.5 pr-4" style={{ color: 'rgba(237,240,254,0.65)' }}>{sq.reopenCount}</td>
                                          <td className="py-1.5 pr-4"><span className={`px-1.5 py-0.5 rounded-full badge-${sqRl}`}>{sq.reopenPct}%</span></td>
                                          <td className="py-1.5 pr-4" style={{ color: 'rgba(237,240,254,0.65)' }}>{sq.rejectedCount}</td>
                                          <td className="py-1.5 pr-4"><span className={`px-1.5 py-0.5 rounded-full badge-${sqXl}`}>{sq.rejectedPct}%</span></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
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

  const renderCustom = (widgetId) => {
    const numId = String(widgetId).replace('custom_', '');
    const cw = (customWidgets || []).find(w => String(w.id) === numId);
    return (
      <div className="card h-full overflow-hidden">
        <CustomWidgetRenderer
          widgetId={numId}
          name={cw?.name}
          config={cw?.config || {}}
        />
      </div>
    );
  };

  return (
    <div>
      <WidgetBank
        widgets={ALL_WIDGETS}
        activeWidgetIds={(rglLayout.rglItems || []).map(it => it.i)}
        isOpen={bankOpen}
        onClose={() => setBankOpen(false)}
        onAdd={rglLayout.addWidget}
      />

      <SubDashboardTabs parentId="qa" parentPath="/qa" parentLabel={t('qa_title')} />
      <SectionHeader
        title={t('qa_title')}
        titleKey="qa.title"
        subtitle={t('qa_subtitle')}
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
      <DashboardRGL
        rglLayout={rglLayout}
        widgetMap={widgetMap}
        renderCustom={renderCustom}
      />
    </div>
  );
}
