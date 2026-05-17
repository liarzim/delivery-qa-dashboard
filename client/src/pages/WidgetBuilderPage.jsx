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
import { useLanguage } from '../context/LanguageContext';
import { fetchRawData, fetchSheets, widgetApi } from '../services/widgetApi';
import { buildColumnMeta, buildChartData, applyFilters } from '../utils/widgetAggregation';
import LivePreview from '../components/LivePreview';
import DataGrid from '../components/DataGrid';
import TableColumnPicker from '../components/TableColumnPicker';
import SectionHeader from '../components/SectionHeader';
import {
  BarChart2, TrendingUp, PieChart, Activity, Table2, SquareAsterisk,
  Save, Globe, AlertCircle, CheckCircle2, Loader2, Pencil, Gauge,
} from 'lucide-react';

// ── Chart type buttons ─────────────────────────────────────────────────────────
const CHART_TYPES = [
  { id: 'bar',   Icon: BarChart2,      label: 'Bar' },
  { id: 'line',  Icon: TrendingUp,     label: 'Line' },
  { id: 'area',  Icon: Activity,       label: 'Area' },
  { id: 'pie',   Icon: PieChart,       label: 'Pie' },
  { id: 'kpi',   Icon: SquareAsterisk, label: 'KPI' },
  { id: 'table', Icon: Table2,         label: 'Table' },
  { id: 'gauge', Icon: Gauge,          label: 'Gauge' },
];

const FORMULAS = [
  { id: 'count',         label: 'Count' },
  { id: 'sum',           label: 'Sum' },
  { id: 'average',       label: 'Average' },
  { id: 'min',           label: 'Min' },
  { id: 'max',           label: 'Max' },
  { id: 'countif_ratio', label: 'Conditional %' },
  { id: 'custom',        label: 'Custom…' },
];

const COUNTIF_OPS = [
  { id: 'eq',           label: 'equals' },
  { id: 'not_eq',       label: 'not equals' },
  { id: 'contains',     label: 'contains' },
  { id: 'not_contains', label: 'does not contain' },
  { id: 'starts_with',  label: 'starts with' },
];

const DATA_SOURCES = [
  { id: 'delivery',     label: 'Delivery' },
  { id: 'qa_bugs',      label: 'QA Bugs' },
  { id: 'qa_escaping',  label: 'Escaping Defects' },
];

const DEFAULT_CONFIG = {
  name: '',
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

// ── Small shared form row ──────────────────────────────────────────────────────
function Row({ label, children }) {
  return (
    <div className="mb-3">
      <label className="text-xs mb-1 block font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>{label}</label>
      {children}
    </div>
  );
}

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
  const { id }   = useParams();   // undefined → new widget; string → edit mode
  const { user } = useAuth();
  const { t }    = useLanguage();
  const navigate = useNavigate();

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

  const columns      = useMemo(() => Object.keys(columnMeta), [columnMeta]);
  const numericCols  = useMemo(() => columns.filter(c => columnMeta[c]?.type === 'number'), [columns, columnMeta]);
  const chartData    = useMemo(() => buildChartData(rawData, config), [rawData, config]);
  const filteredRows = useMemo(() => applyFilters(rawData, config.filters || {}), [rawData, config.filters]);

  // Effective column list for the table picker: user-ordered OR default (all columns)
  const effectiveTableColumns = useMemo(() => {
    if (config.tableColumns && config.tableColumns.length > 0) return config.tableColumns;
    return columns.map(key => ({ key, visible: true }));
  }, [config.tableColumns, columns]);

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
    } catch (e) { showToast(e.message, 'error'); }
    finally { setPub(false); }
  };

  const inputClass = 'sigma-input text-sm py-1.5';

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

          <Row label="Widget Name">
            <input value={config.name} onChange={e => set({ name: e.target.value })}
              className={inputClass} placeholder="e.g. Bug Count by PI" />
          </Row>

          <Row label="Data Source">
            <select value={config.dataSource} onChange={e => set({ dataSource: e.target.value, sheet: '', xField: '', yField: '', filters: {}, tableColumns: [] })}
              className={inputClass}>
              {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Row>

          {/* Sheet selector — only for delivery (Excel has multiple sheets) */}
          {config.dataSource === 'delivery' && availableSheets.length > 0 && (
            <Row label="Sheet">
              <select value={config.sheet} onChange={e => set({ sheet: e.target.value, xField: '', yField: '', tableColumns: [] })}
                className={inputClass}>
                <option value="">— auto (FLOW priority) —</option>
                {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
          )}

          <Row label="Chart Type">
            <div className="grid grid-cols-3 gap-1.5">
              {CHART_TYPES.map(({ id: cid, Icon, label }) => (
                <button key={cid} onClick={() => set({ chartType: cid })}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors"
                  style={config.chartType === cid
                    ? { backgroundColor: 'var(--p-accent)', color: '#fff' }
                    : { backgroundColor: 'rgba(20,65,245,0.1)', color: 'rgba(237,240,254,0.6)', border: '1px solid rgba(20,65,245,0.25)' }}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </Row>

          {/* ── Formula — moved up so it's always visible ──────────────── */}
          <Row label="Formula">
            <select value={config.formula} onChange={e => set({ formula: e.target.value, yField: e.target.value === 'count' ? '' : config.yField })}
              className={inputClass}>
              {FORMULAS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </Row>

          {/* ── Conditional % formula builder ──────────────────────────── */}
          {config.formula === 'countif_ratio' && (
            <>
              {/* Numerator */}
              <div className="mb-2 px-2 py-1.5 rounded text-xs font-semibold"
                style={{ backgroundColor: 'rgba(20,65,245,0.1)', color: 'rgba(237,240,254,0.5)' }}>
                Numerator — count rows where…
              </div>
              <Row label="Column">
                <select value={config.countifField}
                  onChange={e => set({ countifField: e.target.value, countifValue: '' })}
                  className={inputClass}>
                  <option value="">— select column —</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Row>
              <Row label="Condition">
                <select value={config.countifOp}
                  onChange={e => set({ countifOp: e.target.value })}
                  className={inputClass}>
                  {COUNTIF_OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </Row>
              <Row label="Value">
                {/* datalist gives autocomplete from known column values (works for Hebrew too) */}
                <input
                  list="countif-values"
                  value={config.countifValue}
                  onChange={e => set({ countifValue: e.target.value })}
                  className={inputClass}
                  dir="auto"
                  placeholder='e.g. בוצע  (comma for OR: בוצע, סגור)'
                  spellCheck={false}
                />
                {config.countifField && columnMeta[config.countifField]?.options?.length > 0 && (
                  <datalist id="countif-values">
                    {columnMeta[config.countifField].options.map(v => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                )}
                <p className="text-xs mt-1" style={{ color: 'rgba(237,240,254,0.25)' }}>
                  Comma-separated = OR logic
                </p>
              </Row>

              {/* Denominator */}
              <div className="mb-2 px-2 py-1.5 rounded text-xs font-semibold mt-1"
                style={{ backgroundColor: 'rgba(20,65,245,0.1)', color: 'rgba(237,240,254,0.5)' }}>
                Denominator — divide by…
              </div>
              <Row label="Denominator type">
                <select
                  value={config.denomMode || 'total'}
                  onChange={e => set({ denomMode: e.target.value, denomField: '', denomValue: '' })}
                  className={inputClass}>
                  <option value="total">All rows in group</option>
                  <option value="condition">Rows matching another condition</option>
                </select>
              </Row>
              {config.denomMode === 'condition' && (
                <>
                  <Row label="Column">
                    <select value={config.denomField}
                      onChange={e => set({ denomField: e.target.value, denomValue: '' })}
                      className={inputClass}>
                      <option value="">— select column —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Row>
                  <Row label="Condition">
                    <select value={config.denomOp}
                      onChange={e => set({ denomOp: e.target.value })}
                      className={inputClass}>
                      {COUNTIF_OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </Row>
                  <Row label="Value">
                    <input
                      list="denom-values"
                      value={config.denomValue}
                      onChange={e => set({ denomValue: e.target.value })}
                      className={inputClass}
                      dir="auto"
                      placeholder="e.g. פעיל"
                      spellCheck={false}
                    />
                    {config.denomField && columnMeta[config.denomField]?.options?.length > 0 && (
                      <datalist id="denom-values">
                        {columnMeta[config.denomField].options.map(v => (
                          <option key={v} value={v} />
                        ))}
                      </datalist>
                    )}
                  </Row>
                </>
              )}
            </>
          )}

          {config.formula === 'custom' && (
            <Row label="Expression">
              <input
                value={config.customFormula}
                onChange={e => set({ customFormula: e.target.value })}
                className={inputClass}
                dir="ltr"
                placeholder='e.g. COUNTIF(סטטוס,"בוצע") / COUNT(*) * 100'
                spellCheck={false}
              />
              <p className="text-xs mt-1" style={{ color: 'rgba(237,240,254,0.3)' }}>
                Functions: COUNT(*), COUNTIF(col,"val"), SUM(col), AVG(col), MIN(col), MAX(col)
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.2)' }}>
                Hebrew column names and values are supported
              </p>
            </Row>
          )}

          {/* Table column selector — only for table chart type */}
          {config.chartType === 'table' && columns.length > 0 && (
            <Row label="Table Columns">
              <TableColumnPicker
                columns={effectiveTableColumns}
                onChange={cols => set({ tableColumns: cols })}
              />
            </Row>
          )}

          {/* Gauge config — only for gauge chart type */}
          {config.chartType === 'gauge' && (
            <>
              <div className="mb-2 px-2 py-1.5 rounded text-xs"
                style={{ backgroundColor: 'rgba(20,65,245,0.08)', color: 'rgba(237,240,254,0.45)' }}>
                Select a numeric Y-Axis field (e.g. a % column). The gauge shows the average value across all rows.
              </div>
              <Row label="Yellow threshold (%)">
                <input
                  type="number" min="0" max="100"
                  value={config.gaugeYellowThreshold}
                  onChange={e => set({ gaugeYellowThreshold: e.target.value })}
                  className={inputClass} />
              </Row>
              <Row label="Green threshold (%)">
                <input
                  type="number" min="0" max="100"
                  value={config.gaugeGreenThreshold}
                  onChange={e => set({ gaugeGreenThreshold: e.target.value })}
                  className={inputClass} />
              </Row>
              <Row label="Second needle (optional)">
                <select
                  value={config.gauge2Field}
                  onChange={e => set({ gauge2Field: e.target.value })}
                  className={inputClass}>
                  <option value="">— none —</option>
                  {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Row>
              <Row label="Label 1">
                <input
                  value={config.gaugeLabel1}
                  onChange={e => set({ gaugeLabel1: e.target.value })}
                  className={inputClass}
                  placeholder={config.yField || '% Actual'} />
              </Row>
              {config.gauge2Field && (
                <Row label="Label 2">
                  <input
                    value={config.gaugeLabel2}
                    onChange={e => set({ gaugeLabel2: e.target.value })}
                    className={inputClass}
                    placeholder={config.gauge2Field || '% Adjusted'} />
                </Row>
              )}
            </>
          )}

          {/* X / Y axis — shown below formula so context is clear */}
          {config.formula !== 'countif_ratio' && (
            <>
              <Row label="X-Axis (Group by)">
                {dataLoading ? (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>
                    <Loader2 size={12} className="animate-spin" /> Loading columns…
                  </div>
                ) : (
                  <select value={config.xField} onChange={e => set({ xField: e.target.value })} className={inputClass}>
                    <option value="">— select column —</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </Row>
              <Row label="Y-Axis (Measure)">
                <select value={config.yField} onChange={e => set({ yField: e.target.value })} className={inputClass}
                  disabled={config.formula === 'count'}>
                  <option value="">{config.formula === 'count' ? '(row count)' : '— select column —'}</option>
                  {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Row>
            </>
          )}
          {config.formula === 'countif_ratio' && (
            <Row label="X-Axis (Group by)">
              {dataLoading ? (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>
                  <Loader2 size={12} className="animate-spin" /> Loading columns…
                </div>
              ) : (
                <>
                  <select value={config.xField} onChange={e => set({ xField: e.target.value })} className={inputClass}>
                    <option value="">— no grouping (single total) —</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className="text-xs mt-1" style={{ color: 'rgba(237,240,254,0.25)' }}>
                    Leave blank for one overall % (ideal for Gauge)
                  </p>
                </>
              )}
            </Row>
          )}

          <Row label="Accent Color">
            <div className="flex items-center gap-2">
              <input type="color" value={config.color} onChange={e => set({ color: e.target.value })}
                className="w-10 h-9 cursor-pointer rounded border-0 p-0.5"
                style={{ backgroundColor: 'transparent' }} />
              <span className="text-xs font-mono" style={{ color: 'rgba(237,240,254,0.5)' }}>{config.color}</span>
            </div>
          </Row>

          {/* Active filters summary */}
          {Object.values(config.filters).some(f => f?.active) && (
            <div className="mt-2 p-2 rounded-lg text-xs"
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
