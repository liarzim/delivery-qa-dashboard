/**
 * CustomWidgetRenderer — fetches raw data, aggregates, and renders a saved
 * custom widget from its stored config_json.
 *
 * Used by GridWidget when widget.id starts with 'custom_'.
 * Also used on sub-dashboards that include custom widgets.
 *
 * Props:
 *   widgetId   {number|string}  — the custom_widgets.id from the DB
 *   config     {object}         — parsed config_json (passed directly to avoid
 *                                 a second API fetch if caller already has it)
 *   name       {string}         — widget name (shown in error/empty states)
 *   compact    {boolean}        — hide title bar when true (widget grid mode)
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchRawData } from '../services/widgetApi';
import { buildChartData } from '../utils/widgetAggregation';
import LivePreview from './LivePreview';
import { Loader2, AlertCircle, Pencil } from 'lucide-react';

export default function CustomWidgetRenderer({ widgetId, config, name, compact = false }) {
  const { user }    = useAuth();
  const { lang }    = useLanguage();
  const navigate    = useNavigate();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!config?.dataSource) return;
    setLoading(true);
    setError(null);
    fetchRawData(config.dataSource, user)
      .then(setRows)
      .catch(e => setError(e.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [config?.dataSource, user]);

  const chartData = useMemo(() => {
    if (!rows.length || !config) return [];
    return buildChartData(rows, config);
  }, [rows, config]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card h-full flex items-center justify-center gap-2 text-xs"
        style={{ color: 'rgba(237,240,254,0.4)' }}>
        <Loader2 size={14} className="animate-spin" />
        Loading…
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="card h-full flex flex-col items-center justify-center gap-1.5 text-xs"
        style={{ color: '#F36059' }}>
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }

  // ── No config ──────────────────────────────────────────────────────────────
  if (!config) {
    return (
      <div className="card h-full flex items-center justify-center text-xs"
        style={{ color: 'rgba(237,240,254,0.35)' }}>
        No configuration
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="card h-full flex flex-col" style={{ padding: compact ? '0' : undefined }}>
      {!compact && (
        <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'rgba(237,240,254,0.7)' }}>
            {lang === 'he' && config.name_he
              ? config.name_he
              : (name || config.name || 'Custom Widget')}
          </p>
          {widgetId && (
            <button
              onClick={() => navigate(`/widget-builder/${widgetId}`)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'rgba(237,240,254,0.3)' }}
              title="Edit widget"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      )}
      <div className={`flex-1 ${compact ? '' : 'px-2 pb-3'}`} style={{ minHeight: 0 }}>
        <LivePreview config={config} chartData={chartData} rawRows={rows} />
      </div>
    </div>
  );
}
