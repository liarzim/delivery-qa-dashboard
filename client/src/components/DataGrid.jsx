/**
 * DataGrid — interactive data table with type-aware filter headers.
 *
 * Text columns    → multi-select chip list + search box
 * Number columns  → operator dropdown (>, <, between, =) + value inputs
 * Date columns    → from/to date inputs
 *
 * Shows first MAX_ROWS rows for performance.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, Search } from 'lucide-react';
import { applyFilters } from '../utils/widgetAggregation';

const MAX_ROWS    = 500;
const MAX_COLUMNS = 20;

// ── Popover wrapper ─────────────────────────────────────────────────────────────
function Popover({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div className="absolute z-50 top-full mt-1 rounded-lg shadow-xl"
          style={{ backgroundColor: '#0B1748', border: '1px solid rgba(20,65,245,0.4)', minWidth: 200, left: '50%', transform: 'translateX(-50%)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Text filter ────────────────────────────────────────────────────────────────
function TextFilter({ column, filter, options, onChange }) {
  const [search, setSearch] = useState(filter?.search || '');
  const selected = filter?.selected || [];
  const visible = options.filter(o => o.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  const toggle = (val) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    onChange({ ...filter, type: 'text', active: next.length > 0 || !!search, selected: next, search });
  };
  const setS = (s) => {
    setSearch(s);
    onChange({ ...filter, type: 'text', active: selected.length > 0 || !!s, selected, search: s });
  };

  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 mb-2 rounded px-2 py-1"
        style={{ backgroundColor: 'rgba(20,65,245,0.15)', border: '1px solid rgba(20,65,245,0.3)' }}>
        <Search size={12} style={{ color: 'rgba(237,240,254,0.4)' }} />
        <input value={search} onChange={e => setS(e.target.value)} placeholder="Search…" className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: '#EDF0FE' }} />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {visible.map(opt => (
          <label key={opt} className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer hover:bg-white/5">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
              className="accent-sigma-accent" />
            <span className="text-xs text-sigma-ice/80 truncate">{opt || '(blank)'}</span>
          </label>
        ))}
        {!visible.length && <p className="text-xs py-2 text-center" style={{ color: 'rgba(237,240,254,0.3)' }}>No matches</p>}
      </div>
      {(selected.length > 0 || search) && (
        <button className="mt-2 w-full text-xs rounded px-2 py-1"
          style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.3)' }}
          onClick={() => { setSearch(''); onChange({ type: 'text', active: false, selected: [], search: '' }); }}>
          Clear
        </button>
      )}
    </div>
  );
}

// ── Number filter ──────────────────────────────────────────────────────────────
function NumberFilter({ column, filter, onChange }) {
  const f = filter || { type: 'number', op: 'gt', value: '', value2: '', active: false };
  const set = (patch) => {
    const next = { ...f, ...patch };
    next.active = next.value !== '' || next.value2 !== '';
    onChange(next);
  };
  return (
    <div className="p-3 space-y-2">
      <select value={f.op} onChange={e => set({ op: e.target.value })} className="sigma-input text-xs py-1">
        <option value="gt">{'> greater than'}</option>
        <option value="gte">{'≥ at least'}</option>
        <option value="lt">{'< less than'}</option>
        <option value="lte">{'≤ at most'}</option>
        <option value="eq">{'= equals'}</option>
        <option value="between">between</option>
      </select>
      <input type="number" value={f.value} onChange={e => set({ value: e.target.value })}
        placeholder={f.op === 'between' ? 'From' : 'Value'}
        className="sigma-input text-xs py-1" />
      {f.op === 'between' && (
        <input type="number" value={f.value2} onChange={e => set({ value2: e.target.value })}
          placeholder="To" className="sigma-input text-xs py-1" />
      )}
      {f.active && (
        <button className="w-full text-xs rounded px-2 py-1"
          style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.3)' }}
          onClick={() => onChange({ type: 'number', op: 'gt', value: '', value2: '', active: false })}>
          Clear
        </button>
      )}
    </div>
  );
}

// ── Date filter ────────────────────────────────────────────────────────────────
function DateFilter({ column, filter, onChange }) {
  const f = filter || { type: 'date', from: '', to: '', active: false };
  const set = (patch) => {
    const next = { ...f, ...patch };
    next.active = !!next.from || !!next.to;
    onChange(next);
  };
  return (
    <div className="p-3 space-y-2">
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>From</label>
        <input type="date" value={f.from} onChange={e => set({ from: e.target.value })} className="sigma-input text-xs py-1" />
      </div>
      <div>
        <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>To</label>
        <input type="date" value={f.to} onChange={e => set({ to: e.target.value })} className="sigma-input text-xs py-1" />
      </div>
      {f.active && (
        <button className="w-full text-xs rounded px-2 py-1"
          style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.3)' }}
          onClick={() => onChange({ type: 'date', from: '', to: '', active: false })}>
          Clear
        </button>
      )}
    </div>
  );
}

// ── Main DataGrid ──────────────────────────────────────────────────────────────
export default function DataGrid({ rows, columnMeta, filters, onFiltersChange }) {
  const columns = useMemo(() => Object.keys(columnMeta || {}).slice(0, MAX_COLUMNS), [columnMeta]);
  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const displayRows = filtered.slice(0, MAX_ROWS);

  const activeCount = Object.values(filters || {}).filter(f => f?.active).length;

  const setFilter = (col, f) => onFiltersChange({ ...(filters || {}), [col]: f });

  const headerStyle = {
    position: 'sticky', top: 0, zIndex: 10,
    backgroundColor: '#0B1748',
    borderBottom: '1px solid rgba(20,65,245,0.3)',
  };

  if (!rows.length) return (
    <div className="flex items-center justify-center h-full"
      style={{ color: 'rgba(237,240,254,0.3)', fontSize: 13 }}>
      No data loaded — select a Data Source above
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(20,65,245,0.2)', backgroundColor: 'rgba(20,65,245,0.06)' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(237,240,254,0.5)' }}>
          <Filter size={12} />
          <span>{filtered.length.toLocaleString()} / {rows.length.toLocaleString()} rows</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: 'rgba(20,65,245,0.2)', color: 'var(--p-accent)' }}>
              {activeCount} active filter{activeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button onClick={() => onFiltersChange({})}
            className="flex items-center gap-1 text-xs ml-2"
            style={{ color: '#F36059' }}>
            <X size={11} /> Clear all
          </button>
        )}
        <span className="ms-auto text-xs" style={{ color: 'rgba(237,240,254,0.25)' }}>
          {columns.length} columns · first {Math.min(MAX_ROWS, filtered.length)} rows shown
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {columns.map(col => {
                const meta   = columnMeta[col] || {};
                const f      = filters?.[col];
                const active = f?.active;
                return (
                  <th key={col} style={headerStyle} className="text-left px-2 py-0 whitespace-nowrap">
                    <div className="flex items-center gap-1 py-2">
                      <span className="truncate max-w-[100px] font-semibold"
                        style={{ color: 'rgba(237,240,254,0.7)' }} title={col}>
                        {col}
                      </span>
                      <Popover
                        trigger={
                          <button className="p-0.5 rounded shrink-0"
                            style={{ color: active ? 'var(--p-accent)' : 'rgba(237,240,254,0.25)' }}
                            title={`Filter ${col}`}>
                            <ChevronDown size={11} />
                          </button>
                        }
                      >
                        {meta.type === 'number' ? (
                          <NumberFilter column={col} filter={f} onChange={v => setFilter(col, v)} />
                        ) : meta.type === 'date' ? (
                          <DateFilter column={col} filter={f} onChange={v => setFilter(col, v)} />
                        ) : (
                          <TextFilter column={col} filter={f} options={meta.options || []} onChange={v => setFilter(col, v)} />
                        )}
                      </Popover>
                      {active && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--p-accent)' }} />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, ri) => (
              <tr key={ri}
                style={{ borderBottom: '1px solid rgba(20,65,245,0.07)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(20,65,245,0.08)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                {columns.map(col => (
                  <td key={col} className="px-2 py-1.5 whitespace-nowrap max-w-[160px] overflow-hidden overflow-ellipsis"
                    style={{ color: 'rgba(237,240,254,0.75)' }} title={String(row[col] ?? '')}>
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > MAX_ROWS && (
          <p className="text-center py-3 text-xs" style={{ color: 'rgba(237,240,254,0.3)' }}>
            Showing first {MAX_ROWS} of {filtered.length} filtered rows
          </p>
        )}
      </div>
    </div>
  );
}
