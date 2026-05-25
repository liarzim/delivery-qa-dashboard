/**
 * WidgetBuilderForm — the configuration panel for a custom widget.
 *
 * This is a pure controlled component: all state lives in the parent.
 * Used by both WidgetBuilderPage (full-page) and WidgetDeepEditPanel (slide-over).
 *
 * Props:
 *   cfg       {object}   — current config object (from DEFAULT_CONFIG shape)
 *   onChange  {function} — called with (newCfg) on any field change
 *   sheets    {string[]} — available sheet names for the selected data source
 *   colMeta   {object}   — column metadata { colName: { type, options } }
 *   compact   {boolean}  — hide the data-source / sheet selectors (for deep-edit)
 */
import React from 'react';
import {
  BarChart2, TrendingUp, PieChart, Activity, Table2, SquareAsterisk, Gauge,
} from 'lucide-react';
import TableColumnPicker from './TableColumnPicker';

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
  { id: 'delivery',    label: 'Delivery' },
  { id: 'qa_bugs',     label: 'QA Bugs' },
  { id: 'qa_escaping', label: 'Escaping Defects' },
];

export default function WidgetBuilderForm({ cfg, onChange, sheets = [], colMeta = {}, compact = false }) {
  const set = (key, value) => onChange({ ...cfg, [key]: value });
  const columns = Object.keys(colMeta);
  const numericColumns = columns.filter(c => colMeta[c]?.type === 'number');

  return (
    <div className="space-y-5 text-xs">
      {/* Names */}
      <div className="space-y-2">
        <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>
          Widget Name (EN)
        </label>
        <input
          className="sigma-input w-full"
          value={cfg.name}
          onChange={e => set('name', e.target.value)}
          placeholder="My Widget"
        />
        <input
          className="sigma-input w-full"
          dir="rtl"
          value={cfg.name_he}
          onChange={e => set('name_he', e.target.value)}
          placeholder="שם בעברית"
        />
      </div>

      {/* Chart type */}
      <div>
        <label className="block font-semibold mb-2" style={{ color: 'rgba(237,240,254,0.55)' }}>
          Chart Type
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {CHART_TYPES.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => set('chartType', id)}
              className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all text-xs"
              style={cfg.chartType === id
                ? { backgroundColor: 'rgba(63,100,247,0.25)', border: '1px solid #3F64F7', color: '#EDF0FE' }
                : { backgroundColor: 'rgba(63,100,247,0.06)', border: '1px solid rgba(63,100,247,0.2)', color: 'rgba(237,240,254,0.5)' }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Data source + sheet */}
      {!compact && (
        <div className="space-y-2">
          <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>
            Data Source
          </label>
          <select className="sigma-input w-full" value={cfg.dataSource} onChange={e => onChange({ ...cfg, dataSource: e.target.value, sheet: '', xField: '', yField: '' })}>
            {DATA_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>
            Sheet
          </label>
          {sheets.length > 0 ? (
            <select className="sigma-input w-full" value={cfg.sheet} onChange={e => set('sheet', e.target.value)}>
              <option value="">— default sheet —</option>
              {sheets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input
              className="sigma-input w-full"
              value={cfg.sheet}
              onChange={e => set('sheet', e.target.value)}
              placeholder="Sheet name (leave blank for default)"
            />
          )}
        </div>
      )}

      {/* Formula */}
      {cfg.chartType !== 'table' && (
        <div className="space-y-2">
          <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>Formula</label>
          <div className="grid grid-cols-2 gap-1">
            {FORMULAS.map(f => (
              <button
                key={f.id}
                onClick={() => set('formula', f.id)}
                className="px-2 py-1.5 rounded text-left transition-all"
                style={cfg.formula === f.id
                  ? { backgroundColor: 'rgba(63,100,247,0.2)', border: '1px solid #3F64F7', color: '#EDF0FE' }
                  : { backgroundColor: 'rgba(63,100,247,0.06)', border: '1px solid rgba(63,100,247,0.15)', color: 'rgba(237,240,254,0.55)' }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {cfg.formula === 'custom' && (
            <input
              className="sigma-input w-full font-mono"
              value={cfg.customFormula}
              onChange={e => set('customFormula', e.target.value)}
              placeholder="SUM(field) / COUNT(*) * 100"
            />
          )}
        </div>
      )}

      {/* CountIf Ratio fields */}
      {cfg.formula === 'countif_ratio' && (
        <div className="space-y-2">
          <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>Condition</label>
          <select className="sigma-input w-full" value={cfg.countifField || ''} onChange={e => set('countifField', e.target.value)}>
            <option value="">— field —</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="sigma-input w-full" value={cfg.countifOp || 'eq'} onChange={e => set('countifOp', e.target.value)}>
            {COUNTIF_OPS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <input className="sigma-input w-full" value={cfg.countifValue || ''} onChange={e => set('countifValue', e.target.value)} placeholder="value" />
        </div>
      )}

      {/* X / Y axes */}
      {cfg.chartType !== 'kpi' && cfg.chartType !== 'gauge' && cfg.chartType !== 'table' && (
        <div className="space-y-2">
          <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>X Axis (group by)</label>
          <select className="sigma-input w-full" value={cfg.xField} onChange={e => set('xField', e.target.value)}>
            <option value="">— column —</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {['sum','average','min','max'].includes(cfg.formula) && (
            <>
              <label className="block font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>Y Axis (value)</label>
              <select className="sigma-input w-full" value={cfg.yField} onChange={e => set('yField', e.target.value)}>
                <option value="">— column —</option>
                {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      {/* Color */}
      {cfg.chartType !== 'table' && cfg.chartType !== 'kpi' && (
        <div className="flex items-center gap-3">
          <label className="font-semibold" style={{ color: 'rgba(237,240,254,0.55)' }}>Color</label>
          <input type="color" value={cfg.color} onChange={e => set('color', e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
        </div>
      )}

      {/* Table column picker */}
      {cfg.chartType === 'table' && columns.length > 0 && (
        <TableColumnPicker
          columns={columns}
          value={cfg.tableColumns || []}
          onChange={v => set('tableColumns', v)}
        />
      )}
    </div>
  );
}
