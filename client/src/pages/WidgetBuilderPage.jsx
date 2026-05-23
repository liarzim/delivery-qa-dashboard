/**
 * WidgetBuilderPage — split-screen custom widget builder.
 *
 * Top half: config panel (left) + live chart preview (right)
 * Bottom half: interactive data grid with type-aware filters
 *
 * Routes:
 *   /widget-builder       → create new widget
 *   /widget-builder/:id   → edit existing widget
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { fetchRawData, fetchSheets, widgetApi } from '../services/widgetApi';
import { buildColumnMeta, buildChartData, applyFilters } from '../utils/widgetAggregation';
import LivePreview from '../components/LivePreview';
import DataGrid from '../components/DataGrid';
import WidgetBuilderForm from '../components/WidgetBuilderForm';
import {
  Save, Globe, AlertCircle, CheckCircle2, Loader2, Pencil,
} from 'lucide-react';

const DEFAULT_CONFIG = {
  name: '',
  name_he: '',
  chartType: 'bar',
  dataSource: 'delivery',
  sheet: '',
  xField: '',
  yField: '',
  formula: 'count',
  customFormula: '',
  color: '#3F64F7',
  filters: {},
  tableColumns: [],
  // Gauge-specific
  gaugeYellowThreshold: '60',
  gaugeGreenThreshold:  '80',
  gauge2Field:          '',
  gaugeLabel1:          '',
  gaugeLabel2:          '',
  // Conditional % formula
  countifField:    '',
  countifOp:       'eq',
  countifValue:    '',
  denomMode:       'total',   // 'total' | 'condition'
  denomField:      '',
  denomOp:         'eq',
  denomValue:      '',
};

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold shadow-xl"
      style={toast.type === 'error'
        ? { backgroundColor: 'rgba(243,96,89,0.15)', border: '1px solid rgba(243,96,89,0.3)', color: '#F36059' }
        : { backgroundColor: 'rgba(84,224,117,0.15)', border: '1px solid rgba(84,224,117,0.3)', color: '#54E075' }}>
      {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {toast.msg}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WidgetBuilderPage() {
  const { id }       = useParams();   // undefined → new widget; string → edit mode
  const { user }     = useAuth();
  const { refresh: refreshBank } = useWidgetBank();
  const navigate     = useNavigate();

  const [config, setConfig]         = useState(DEFAULT_CONFIG);
  const [rawData, setRawData]       = useState([]);
  const [columnMeta, setColMeta]    = useState({});
  const [availableSheets, setSheets] = useState([]);
  const [dataLoading, setDL]        = useState(false);
  const [saving, setSaving]         = useState(false);
  const [publishing, setPub]        = useState(false);
  const [toast, setToast]           = useState(null);
  const [widgetId, setWidgetId]     = useState(id || null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch available sheets when delivery is selected
  useEffect(() => {
    if (config.dataSource !== 'delivery') { setSheets([]); return; }
    fetchSheets('delivery', user).then(setSheets).catch(() => setSheets([]));
  }, [config.dataSource, user]);

  // Load raw data whenever data source or sheet changes
  useEffect(() => {
    setDL(true);
    setRawData([]);
    setColMeta({});
    fetchRawData(config.dataSource, user, config.sheet || undefined).then(rows => {
      setRawData(rows);
      if (rows.length) {
        setColMeta(buildColumnMeta(rows));
        setConfig(c => ({
          ...c,
          xField: c.xField || Object.keys(rows[0])[0] || '',
          yField: c.yField || '',
        }));
      }
    }).finally(() => setDL(false));
  }, [config.dataSource, config.sheet, user]);

  // Load existing widget in edit mode
  useEffect(() => {
    if (!widgetId) return;
    widgetApi.get(widgetId, user).then(w => {
      if (w?.config) setConfig({ ...DEFAULT_CONFIG, ...w.config, name: w.name });
    }).catch(() => {});
  }, [widgetId, user]);

  const set = (patch) => setConfig(c => ({ ...c, ...patch }));

  const chartData    = useMemo(() => buildChartData(rawData, config), [rawData, config]);
  const filteredRows = useMemo(() => applyFilters(rawData, config.filters || {}), [rawData, config.filters]);

  // Save personal
  const handleSave = async () => {
    if (!config.name.trim()) { showToast('Please enter a widget name', 'error'); return; }
    setSaving(true);
    try {
      if (widgetId) {
        await widgetApi.update(widgetId, { name: config.name, config }, user);
        showToast('Widget saved');
      } else {
        const w = await widgetApi.create({ name: config.name, config }, user);
        setWidgetId(String(w.id));
        navigate(`/widget-builder/${w.id}`, { replace: true });
        showToast('Widget created');
      }
      refreshBank(); // keep Widget Bank in sync
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  // Publish to global bank
  const handlePublish = async () => {
    if (!widgetId) { showToast('Save the widget first', 'error'); return; }
    setPub(true);
    try {
      await widgetApi.publish(widgetId, user);
      showToast('Submitted for admin approval');
      refreshBank(); // status changed to pending
    } catch (e) { showToast(e.message, 'error'); }
    finally { setPub(false); }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)', margin: '-24px' }}>
      <Toast toast={toast} />

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(20,65,245,0.2)', backgroundColor: 'rgba(20,65,245,0.05)' }}>
        <div className="flex items-center gap-2">
          <Pencil size={16} style={{ color: 'var(--p-accent)' }} />
          <span className="font-semibold text-sm text-sigma-ice">
            {widgetId ? `Edit: ${config.name || 'Widget'}` : 'New Custom Widget'}
          </span>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--p-accent)', color: '#fff' }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={handlePublish} disabled={publishing || !widgetId}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'rgba(84,224,117,0.12)', color: '#54E075', border: '1px solid rgba(84,224,117,0.3)' }}>
            {publishing ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
            {publishing ? 'Submitting…' : 'Publish to Global Bank'}
          </button>
        </div>
      </div>

      {/* ── Top panel: Config + Preview ────────────────────────────────────── */}
      <div className="flex shrink-0" style={{ height: '62vh', borderBottom: '1px solid rgba(20,65,245,0.2)' }}>

        {/* Config panel */}
        <div className="w-72 overflow-y-auto p-4 shrink-0"
          style={{ borderRight: '1px solid rgba(20,65,245,0.2)', backgroundColor: 'rgba(20,65,245,0.04)' }}>

          <WidgetBuilderForm
            cfg={config}
            onChange={setConfig}
            sheets={availableSheets}
            colMeta={columnMeta}
          />

          {/* Active filters summary */}
          {Object.values(config.filters).some(f => f?.active) && (
            <div className="mt-4 p-2 rounded-lg text-xs"
              style={{ backgroundColor: 'rgba(20,65,245,0.1)', border: '1px solid rgba(20,65,245,0.25)' }}>
              <span style={{ color: 'rgba(237,240,254,0.5)' }}>
                {Object.values(config.filters).filter(f => f?.active).length} active filter(s) applied
              </span>
              <button onClick={() => set({ filters: {} })} className="ml-2" style={{ color: '#F36059' }}>
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className="flex-1 p-4 overflow-hidden">
          {dataLoading ? (
            <div className="h-full flex items-center justify-center gap-2 text-sm"
              style={{ color: 'rgba(237,240,254,0.4)' }}>
              <Loader2 size={20} className="animate-spin" /> Loading data…
            </div>
          ) : rawData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm"
              style={{ color: 'rgba(237,240,254,0.4)' }}>
              <AlertCircle size={24} />
              <p>No data available — make sure the Excel files are configured</p>
            </div>
          ) : (
            <>
              <p className="text-xs mb-2 font-semibold text-sigma-ice/50">
                Live Preview · {chartData.length} groups from {rawData.length} rows
              </p>
              <div style={{ height: 'calc(100% - 28px)' }}>
                <LivePreview config={config} chartData={chartData} rawRows={filteredRows} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom panel: Data Grid ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <DataGrid
          rows={rawData}
          columnMeta={columnMeta}
          filters={config.filters}
          onFiltersChange={filters => set({ filters })}
        />
      </div>
    </div>
  );
}
