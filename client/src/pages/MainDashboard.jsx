import React, { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useApi } from '../hooks/useApi';
import { store } from '../lib/store';
import GridWidget from '../components/GridWidget';
import WidgetBank from '../components/WidgetBank';
import SectionHeader from '../components/SectionHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import SubDashboardTabs from '../components/SubDashboardTabs';
import { LayoutGrid } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { getTrafficLight, LIGHT_COLORS } from '../utils/thresholds';

const ALL_WIDGETS = [
  { id: 'committed-rate',   label: 'Committed Rate',    category: 'Delivery' },
  { id: 'uncommitted-rate', label: 'Uncommitted Rate',  category: 'Delivery' },
  { id: 'overall-rate',     label: 'Overall Rate',      category: 'Delivery' },
  { id: 'avg-velocity',     label: 'Avg Velocity',      category: 'Delivery' },
  { id: 'throughput',       label: 'Throughput',        category: 'Delivery' },
  { id: 'committed-gauge',  label: 'Committed Gauge',   category: 'Delivery' },
  { id: 'reopen-pct',       label: 'Reopen %',          category: 'QA' },
  { id: 'rejected-pct',     label: 'Rejected %',        category: 'QA' },
  { id: 'escaping-pct',     label: 'Escaping %',        category: 'QA' },
  { id: 'reopen-density',   label: 'Reopen Density',    category: 'QA' },
  { id: 'escaping-density', label: 'Escaping Density',  category: 'QA' },
];

const DEFAULT_LAYOUT = [
  'committed-rate', 'overall-rate', 'avg-velocity',
  'reopen-pct', 'rejected-pct', 'escaping-pct',
];

// ── Traffic Light card ────────────────────────────────────────────────────────

function OverviewLight({ label, formula, value, unit, light, yellowThreshold, redThreshold, higherIsBetter }) {
  const c = LIGHT_COLORS[light] || LIGHT_COLORS.neutral;

  const bulbStyle = (colorVar, isActive) => ({
    width: 30, height: 30, borderRadius: '50%',
    transition: 'background-color 0.25s, box-shadow 0.25s',
    backgroundColor: isActive
      ? `var(${colorVar})`
      : `color-mix(in srgb, var(${colorVar}) 8%, transparent)`,
    boxShadow: isActive
      ? `0 0 18px var(${colorVar}), 0 0 6px var(${colorVar})`
      : 'none',
  });

  const thresholdDir = higherIsBetter ? '≤' : '≥';

  return (
    <div
      className={`rounded-xl border ${c.border} flex flex-col items-center gap-3 py-6 px-4`}
      style={{ backgroundColor: 'var(--p-card-bg, rgba(6,21,78,0.45))', backdropFilter: 'blur(6px)' }}>

      {/* Label */}
      <p className="text-xs font-bold tracking-widest text-center uppercase"
        style={{ color: 'rgba(237,240,254,0.65)', letterSpacing: '0.07em' }}>
        {label}
      </p>

      {/* Formula hint */}
      {formula && (
        <p className="text-xs text-center"
          style={{
            color: 'rgba(237,240,254,0.3)', fontStyle: 'italic',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
          {formula}
        </p>
      )}

      {/* Traffic-light housing */}
      <div className="flex flex-col items-center gap-2.5 rounded-2xl px-4 py-4 w-16"
        style={{
          backgroundColor: 'var(--p-traffic-bg, rgba(4,13,54,0.8))',
          border: '1px solid var(--p-traffic-border, rgba(20,65,245,0.25))',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.45)',
        }}>
        <div style={bulbStyle('--p-danger',  light === 'red')} />
        <div style={bulbStyle('--p-warning', light === 'yellow')} />
        <div style={bulbStyle('--p-success', light === 'green')} />
      </div>

      {/* Value — high-contrast, large */}
      <div className={`text-3xl font-black leading-none ${c.text}`} style={{ letterSpacing: '-0.02em' }}>
        {typeof value === 'number'
          ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
          : (value ?? '—')}
        {unit && <span className="text-base font-semibold ms-0.5 opacity-70">{unit}</span>}
      </div>

      {/* Threshold legend */}
      <div className="text-xs text-center space-y-0.5" style={{ color: 'rgba(237,240,254,0.28)' }}>
        {yellowThreshold !== undefined && (
          <p>
            <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', backgroundColor:'var(--p-warning)', marginRight:4, verticalAlign:'middle' }} />
            Yellow {higherIsBetter ? '≤' : '≥'} {yellowThreshold}{unit}
          </p>
        )}
        {redThreshold !== undefined && (
          <p>
            <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', backgroundColor:'var(--p-danger)', marginRight:4, verticalAlign:'middle' }} />
            Red {thresholdDir} {redThreshold}{unit}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Three-light panel ─────────────────────────────────────────────────────────

function OverviewTrafficLights({ delivery, qa, settings, t }) {
  if (!delivery || !qa) {
    return (
      <div className="rounded-xl mb-6 flex items-center justify-center py-8"
        style={{ border: '1px dashed rgba(20,65,245,0.2)', color: 'rgba(237,240,254,0.3)' }}>
        <p className="text-sm">{t('traffic_no_data')}</p>
      </div>
    );
  }

  // ── Light A: Commitment Adherence — (Commited_Done / Total_Commited) * 100
  const totalCommittedDone = (delivery.piMetrics || []).reduce((s, p) => s + (p.committedDone || 0), 0);
  const totalCommitted     = (delivery.piMetrics || []).reduce((s, p) => s + (p.totalCommitted || 0), 0);
  const commitmentPct      = totalCommitted > 0
    ? Math.round((totalCommittedDone / totalCommitted) * 1000) / 10
    : null;

  // ── Light B: Quality Index — reopened / strictly-closed * 100
  // Uses the pre-computed summary.qualityIndexPct when available (strict State="Closed" denom)
  const qualityIndexPct = qa.summary?.qualityIndexPct != null
    ? qa.summary.qualityIndexPct
    : null;

  // ── Light C: Weighted Score — (A * deliveryWeight%) + (B * qualityWeight%)
  const dw = parseFloat(settings?.delivery_weight ?? 60) / 100;
  const qw = parseFloat(settings?.quality_weight  ?? 40) / 100;
  const weightedScore = (commitmentPct != null && qualityIndexPct != null)
    ? Math.round(((commitmentPct * dw) + (qualityIndexPct * qw)) * 10) / 10
    : null;

  // ── Thresholds from Admin Settings ────────────────────────────────────────
  const commYellow    = parseFloat(settings?.commitment_yellow ?? 80);
  const commRed       = parseFloat(settings?.commitment_red   ?? 60);
  const reopenYellow  = parseFloat(settings?.reopen_yellow    ?? 5);
  const reopenRed     = parseFloat(settings?.reopen_red       ?? 10);
  const weightYellow  = parseFloat(settings?.weighted_yellow  ?? 50);
  const weightRed     = parseFloat(settings?.weighted_red     ?? 30);

  const lightA = commitmentPct  != null ? getTrafficLight(commitmentPct,  commYellow,   commRed,   true)  : 'neutral';
  const lightB = qualityIndexPct != null ? getTrafficLight(qualityIndexPct, reopenYellow, reopenRed, false) : 'neutral';
  const lightC = weightedScore  != null ? getTrafficLight(weightedScore,  weightYellow, weightRed, true)  : 'neutral';

  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'rgba(237,240,254,0.4)', letterSpacing: '0.1em' }}>
          {t('traffic_lights_section')}
        </h2>
        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.22)' }}>
          {t('traffic_lights_subtitle')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <OverviewLight
          label={t('traffic_commitment')}
          formula={t('traffic_commitment_formula')}
          value={commitmentPct}
          unit="%"
          light={lightA}
          yellowThreshold={commYellow}
          redThreshold={commRed}
          higherIsBetter
        />
        <OverviewLight
          label={t('traffic_quality')}
          formula={t('traffic_quality_formula')}
          value={qualityIndexPct}
          unit="%"
          light={lightB}
          yellowThreshold={reopenYellow}
          redThreshold={reopenRed}
          higherIsBetter={false}
        />
        <OverviewLight
          label={t('traffic_weighted')}
          formula={t('traffic_weighted_formula')}
          value={weightedScore}
          unit=""
          light={lightC}
          yellowThreshold={weightYellow}
          redThreshold={weightRed}
          higherIsBetter
        />
      </div>
    </div>
  );
}

// ── Main dashboard page ───────────────────────────────────────────────────────

export default function MainDashboard() {
  const { t } = useLanguage();
  const { isOpen: bankOpen } = useWidgetBank();
  const { data: delivery, loading: dLoading } = useApi('/api/data/delivery');
  const { data: qa,       loading: qLoading } = useApi('/api/data/qa');
  const { data: settings }                     = useApi('/api/settings');

  const [gridWidgetIds, setGridWidgetIds] = useState(
    () => store.get('layout', DEFAULT_LAYOUT),
  );
  const [activeId, setActiveId] = useState(null);

  const saveLayout = useCallback((ids) => store.set('layout', ids), []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const gridWidgets  = gridWidgetIds.map(id => ALL_WIDGETS.find(w => w.id === id)).filter(Boolean);
  const activeWidget = activeId
    ? ALL_WIDGETS.find(w => w.id === activeId || `bank-${w.id}` === activeId)
    : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    if (String(active.id).startsWith('bank-')) {
      const widgetId = String(active.id).replace('bank-', '');
      if (!gridWidgetIds.includes(widgetId)) {
        const newIds = [...gridWidgetIds, widgetId];
        setGridWidgetIds(newIds);
        saveLayout(newIds);
      }
      return;
    }
    if (active.id !== over.id) {
      const oldIndex = gridWidgetIds.indexOf(active.id);
      const newIndex = gridWidgetIds.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newIds = arrayMove(gridWidgetIds, oldIndex, newIndex);
        setGridWidgetIds(newIds);
        saveLayout(newIds);
      }
    }
  };

  const removeWidget = (id) => {
    const newIds = gridWidgetIds.filter(w => w !== id);
    setGridWidgetIds(newIds);
    saveLayout(newIds);
  };

  const resetLayout = () => { setGridWidgetIds(DEFAULT_LAYOUT); saveLayout(DEFAULT_LAYOUT); };

  if (dLoading || qLoading) return <LoadingSpinner message="Loading dashboard data…" />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
        <WidgetBank widgets={ALL_WIDGETS} activeWidgetIds={gridWidgetIds} isOpen={bankOpen} />

        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          <SubDashboardTabs parentId="overview" parentPath="/" parentLabel={t('overview_title')} />
          <SectionHeader
            title={t('overview_title')}
            titleKey="overview.title"
            subtitle={t('overview_subtitle')}
            action={
              <button onClick={resetLayout} className="btn-secondary text-xs py-1.5">
                {t('overview_reset_layout')}
              </button>
            }
          />

          {/* ── 3 Traffic Lights ── */}
          <OverviewTrafficLights delivery={delivery} qa={qa} settings={settings} t={t} />

          {gridWidgets.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 gap-3"
              style={{ borderColor: 'rgba(120,150,255,0.2)', color: 'rgba(237,240,254,0.3)' }}>
              <LayoutGrid size={32} />
              <p className="text-sm">{t('overview_drop_hint')}</p>
            </div>
          ) : (
            <SortableContext items={gridWidgetIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-4">
                {gridWidgets.map(widget => (
                  <GridWidget
                    key={widget.id}
                    widget={widget}
                    delivery={delivery}
                    qa={qa}
                    settings={settings}
                    onRemove={removeWidget}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeWidget && (
          <div className="px-3 py-2 rounded-lg text-xs font-medium shadow-xl"
            style={{ border: '1px solid var(--p-accent)', backgroundColor: 'rgba(20,65,245,0.2)', color: '#93C5FD' }}>
            {activeWidget.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
