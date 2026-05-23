/**
 * WidgetDeepEditPanel — Admin-only slide-over for editing a custom widget in place.
 *
 * Props:
 *   widgetId  {string|number} — numeric DB id (e.g. 5, extracted from "custom_5")
 *   onClose   {function}      — called when panel should close
 *   onSaved   {function}      — called after successful save (triggers bank refresh)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { widgetApi, fetchRawData, fetchSheets } from '../services/widgetApi';
import { buildChartData, buildColumnMeta } from '../utils/widgetAggregation';
import WidgetBuilderForm from './WidgetBuilderForm';
import LivePreview from './LivePreview';

export default function WidgetDeepEditPanel({ widgetId, onClose, onSaved }) {
  const { user }               = useAuth();
  const [cfg, setCfg]          = useState(null);
  const [originalName, setOriginalName] = useState('');
  const [sheets, setSheets]    = useState([]);
  const [rows, setRows]        = useState([]);
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState(null);

  // Load widget config on mount
  useEffect(() => {
    widgetApi.get(widgetId, user).then(w => {
      setCfg(w.config || {});
      setOriginalName(w.name || '');
    });
  }, [widgetId, user]);

  // Load sheets when dataSource changes
  useEffect(() => {
    if (!cfg?.dataSource) return;
    fetchSheets(cfg.dataSource, user).then(setSheets).catch(() => setSheets([]));
  }, [cfg?.dataSource, user]);

  // Load raw rows when dataSource/sheet changes
  useEffect(() => {
    if (!cfg?.dataSource) return;
    fetchRawData(cfg.dataSource, user, cfg.sheet || undefined)
      .then(setRows)
      .catch(() => setRows([]));
  }, [cfg?.dataSource, cfg?.sheet, user]);

  const colMeta   = useMemo(() => buildColumnMeta(rows), [rows]);
  const chartData = useMemo(() => {
    if (!rows.length || !cfg) return [];
    return buildChartData(rows, cfg);
  }, [rows, cfg]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await widgetApi.update(widgetId, { config: cfg, name: cfg.name || originalName }, user);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 860,
          maxWidth: '95vw',
          backgroundColor: 'var(--p-sidebar-bg)',
          borderLeft: '1px solid var(--p-card-border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--p-card-border)' }}>
          <p className="text-sm font-bold text-sigma-ice">
            Deep Edit — <span style={{ color: 'var(--p-accent)' }}>{originalName || `Widget #${widgetId}`}</span>
          </p>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 transition-colors">
            <X size={16} style={{ color: 'rgba(237,240,254,0.5)' }} />
          </button>
        </div>

        {/* Body: form (left) + preview (right) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Config form */}
          <div className="w-72 shrink-0 overflow-y-auto p-5"
            style={{ borderRight: '1px solid var(--p-card-border)' }}>
            <WidgetBuilderForm
              cfg={cfg}
              onChange={setCfg}
              sheets={sheets}
              colMeta={colMeta}
            />
          </div>

          {/* Live preview */}
          <div className="flex-1 p-5 overflow-hidden flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(237,240,254,0.35)' }}>Live Preview</p>
            <div className="flex-1 rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--p-card-border)', minHeight: 200 }}>
              <LivePreview config={cfg} chartData={chartData} rawRows={rows} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderTop: '1px solid var(--p-card-border)' }}>
          {error && <p className="text-xs" style={{ color: '#F36059' }}>{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-xs py-1.5 px-4 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: 'var(--p-accent)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
