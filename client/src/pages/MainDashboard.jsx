import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import WidgetBank from '../components/WidgetBank';
import DashboardRGL from '../components/DashboardRGL';
import SectionHeader from '../components/SectionHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import SubDashboardTabs from '../components/SubDashboardTabs';
import WidgetSlotContent from '../components/WidgetSlotContent';
import CustomWidgetRenderer from '../components/CustomWidgetRenderer';
import { Check, LayoutGrid, Layers, RotateCcw, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useEditMode } from '../context/EditModeContext';
import { useAuth } from '../context/AuthContext';
import { useRGLLayout } from '../hooks/useRGLLayout';
import { getTrafficLight, LIGHT_COLORS } from '../utils/thresholds';
import { ALL_WIDGETS, DEFAULT_OVERVIEW_RGL_LAYOUT } from '../constants/widgets';

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
  const { t, lang } = useLanguage();
  const { isOpen: bankOpen, toggle: toggleBank, setIsOpen: setBankOpen, customWidgets } = useWidgetBank();
  const { data: delivery, loading: dLoading } = useApi('/api/data/delivery');
  const { data: qa,       loading: qLoading } = useApi('/api/data/qa');
  const { data: settings }                     = useApi('/api/settings');

  const rglLayout = useRGLLayout('overview', DEFAULT_OVERVIEW_RGL_LAYOUT);

  // ── Edit-mode controls (externalized — DashboardRGL toolbar is suppressed) ──
  const { editMode, toggleEditMode } = useEditMode();
  const { user } = useAuth();
  const isAdmin  = user?.role === 'Admin';
  const canEdit  = editMode && isAdmin;

  // ── Toast notification for Set as Default / Reset to Default ─────────────
  const toastTimer = useRef(null);
  const [toast, setToast] = useState(null); // { text: string, type: 'success'|'error' }
  const showToast = useCallback((text, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const widgetMap = useMemo(() => {
    const map = {};
    for (const w of ALL_WIDGETS) {
      const displayW = lang === 'he' ? { ...w, label: w.label_he || w.label } : w;
      map[w.id] = (
        <WidgetSlotContent
          widget={displayW}
          delivery={delivery}
          qa={qa}
          settings={settings}
        />
      );
    }
    return map;
  }, [lang, delivery, qa, settings]);

  const renderCustom = useCallback((widgetId) => {
    const numId = String(widgetId).replace('custom_', '');
    const cw    = (customWidgets || []).find(w => String(w.id) === numId);
    if (!cw) {
      return (
        <div className="card flex items-center justify-center text-xs"
          style={{ color: 'rgba(237,240,254,0.4)' }}>
          Widget not found
        </div>
      );
    }
    return (
      <CustomWidgetRenderer
        widgetId={numId}
        config={cw.config || {}}
        name={cw.name}
      />
    );
  }, [customWidgets]);

  const activeWidgetIds = rglLayout.rglItems.map(item => item.i);

  if (dLoading || qLoading) return <LoadingSpinner message="Loading dashboard data…" />;

  return (
    <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">

      <WidgetBank
        widgets={ALL_WIDGETS}
        activeWidgetIds={activeWidgetIds}
        isOpen={bankOpen}
        onClose={() => setBankOpen(false)}
        style={{ order: 2 }}
      />

      <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
        <SubDashboardTabs parentId="overview" parentPath="/" parentLabel={t('overview_title')} />

        <SectionHeader
          title={t('overview_title')}
          titleKey="overview.title"
          subtitle={t('overview_subtitle')}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toast feedback pill */}
              {toast && (
                <span className="text-xs px-2 py-1 rounded-md"
                  style={{
                    backgroundColor: toast.type === 'success' ? 'rgba(84,224,117,0.15)' : 'rgba(243,96,89,0.1)',
                    color:           toast.type === 'success' ? '#54E075' : '#F36059',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(84,224,117,0.35)' : 'rgba(243,96,89,0.25)'}`,
                  }}>
                  {toast.text}
                </span>
              )}
              {/* Set as Default — edit mode only */}
              {canEdit && (
                <button
                  onClick={async () => {
                    try   { await rglLayout.setAsMaster();   showToast('Default layout saved'); }
                    catch { showToast('Save failed', 'error'); }
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(249,189,51,0.12)', color: '#F9BD33', border: '1px solid rgba(249,189,51,0.3)' }}
                >
                  <Star size={12} /> Set as Default
                </button>
              )}
              {/* Reset to Default — outside edit mode when layout is customised */}
              {rglLayout.hasCustom && !editMode && (
                <button
                  onClick={async () => {
                    try   { await rglLayout.resetToMaster(); showToast('Layout reset'); }
                    catch { showToast('Reset failed', 'error'); }
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.25)' }}
                >
                  <RotateCcw size={12} /> Reset to Default
                </button>
              )}
              {/* Edit Layout / Done */}
              {isAdmin && (
                <button
                  onClick={toggleEditMode}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={editMode
                    ? { backgroundColor: 'rgba(84,224,117,0.15)', color: '#54E075', border: '1px solid rgba(84,224,117,0.35)' }
                    : { backgroundColor: 'rgba(63,100,247,0.12)', color: 'rgba(237,240,254,0.7)', border: '1px solid rgba(63,100,247,0.3)' }}
                >
                  {editMode ? <><Check size={12} /> Done</> : <><LayoutGrid size={12} /> Edit Layout</>}
                </button>
              )}
              {/* Add Widgets */}
              <button
                onClick={toggleBank}
                className="flex items-center gap-1.5 btn-secondary text-xs py-1.5"
                style={bankOpen ? { backgroundColor: 'var(--p-accent)', color: '#fff', borderColor: 'var(--p-accent)' } : {}}
              >
                <Layers size={13} />
                {bankOpen ? 'Hide Widgets' : 'Add Widgets'}
              </button>
            </div>
          }
        />

        <OverviewTrafficLights delivery={delivery} qa={qa} settings={settings} t={t} />

        <DashboardRGL
          rglLayout={rglLayout}
          widgetMap={widgetMap}
          renderCustom={renderCustom}
          suppressToolbar
        />
      </div>
    </div>
  );
}
