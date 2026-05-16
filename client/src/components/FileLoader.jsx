/**
 * FileLoader (Data Source Dialog) — replaces the old file-picker overlay.
 *
 * Instead of uploading files from the browser, users enter the server-side
 * file paths to their Excel files. The server reads and processes them.
 *
 * - Paths are pre-filled from admin defaults (Settings) or last-used session.
 * - Admin users get a "Browse" button that opens a server-side folder dialog.
 * - Paths are saved in localStorage so the next session auto-loads.
 */
import React, { useState, useEffect } from 'react';
import { FolderOpen, RefreshCw, AlertCircle, HardDrive, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const PATHS_KEY = 'data_paths';

function getSavedPaths() {
  try { return JSON.parse(localStorage.getItem(PATHS_KEY) || 'null'); } catch { return null; }
}

function isFullPath(p) {
  return typeof p === 'string' && (p.includes('/') || p.includes('\\'));
}

function buildDefaultPaths(settings) {
  const folder = (settings.excel_path || '').replace(/[\\/]+$/, '');
  const sep    = folder.includes('/') ? '/' : '\\';
  const join   = (f) => folder ? `${folder}${sep}${f}` : f;
  return {
    deliveryPath: join(settings.delivery_file    || 'delivery.xlsx'),
    bugsPath:     join(settings.qa_bug_file      || 'qa_bugs.xlsx'),
    escapingPath: join(settings.qa_escaping_file || 'qa_escaping.xlsx'),
  };
}

// ── Single path row ───────────────────────────────────────────────────────────
function PathRow({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 600,
        marginBottom: 5, color: 'rgba(237,240,254,0.5)',
      }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="sigma-input"
        style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
        dir="ltr"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FileLoader() {
  const { loadFromPaths, loading, error, skipFiles, delivery } = useData();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const { user } = useAuth();

  const isAdmin        = user?.role === 'Admin';
  const hasExistingData = !!delivery;

  const saved   = getSavedPaths();
  const savedOk = saved && isFullPath(saved.deliveryPath) && isFullPath(saved.bugsPath);

  const [deliveryPath, setDeliveryPath] = useState(savedOk ? saved.deliveryPath : '');
  const [bugsPath,     setBugsPath]     = useState(savedOk ? saved.bugsPath     : '');
  const [escapingPath, setEscapingPath] = useState(savedOk ? saved.escapingPath : '');

  // Once settings arrive from the server, fill the inputs with the admin defaults.
  // Only fires when excel_path becomes a non-empty value (i.e. server response landed).
  useEffect(() => {
    if (savedOk) return; // user has valid saved paths — don't overwrite
    const d = buildDefaultPaths(settings);
    if (isFullPath(d.deliveryPath)) {
      setDeliveryPath(d.deliveryPath);
      setBugsPath(d.bugsPath);
      setEscapingPath(d.escapingPath);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.excel_path]);

  const resetToDefaults = () => {
    const d = buildDefaultPaths(settings);
    setDeliveryPath(d.deliveryPath);
    setBugsPath(d.bugsPath);
    setEscapingPath(d.escapingPath);
  };

  const handleLoad = () => {
    loadFromPaths({
      deliveryPath: deliveryPath.trim() || undefined,
      bugsPath:     bugsPath.trim()     || undefined,
      escapingPath: escapingPath.trim() || undefined,
    });
  };

  // Admin-only: open server-side Windows folder dialog
  const handleBrowse = async () => {
    try {
      const { path: folder } = await apiFetch('/api/settings/select-folder');
      if (!folder) return;
      const sep = folder.includes('/') ? '/' : '\\';
      setDeliveryPath(`${folder}${sep}${settings.delivery_file    || 'delivery.xlsx'}`);
      setBugsPath(`${folder}${sep}${settings.qa_bug_file      || 'qa_bugs.xlsx'}`);
      setEscapingPath(`${folder}${sep}${settings.qa_escaping_file || 'qa_escaping.xlsx'}`);
    } catch {
      // Browse cancelled or failed — ignore
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div style={{
        width: '100%', maxWidth: 520,
        backgroundColor: 'rgba(255,255,255,0.055)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(20,65,245,0.35)',
        borderRadius: 18, padding: 32,
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            backgroundColor: 'var(--p-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 28px var(--p-accent-shadow)',
          }}>
            <HardDrive size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#EDF0FE', marginBottom: 6 }}>
            {t('loader_title')}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(237,240,254,0.5)', lineHeight: 1.5 }}>
            {t('loader_subtitle')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '10px 14px', borderRadius: 8, marginBottom: 20,
            backgroundColor: 'rgba(243,96,89,0.1)',
            border: '1px solid rgba(243,96,89,0.3)',
            color: '#F36059', fontSize: '0.78rem', lineHeight: 1.5,
            whiteSpace: 'pre-line',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Path inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <PathRow
            label={t('loader_delivery_path')}
            value={deliveryPath}
            onChange={setDeliveryPath}
            placeholder="C:\data\delivery.xlsx"
          />
          <PathRow
            label={t('loader_bugs_path')}
            value={bugsPath}
            onChange={setBugsPath}
            placeholder="C:\data\qa_bugs.xlsx"
          />
          <PathRow
            label={t('loader_escaping_path')}
            value={escapingPath}
            onChange={setEscapingPath}
            placeholder="C:\data\qa_escaping.xlsx"
          />
        </div>

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {/* Reset to admin defaults */}
          <button
            onClick={resetToDefaults}
            disabled={loading}
            style={{
              padding: '10px 14px', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: 'rgba(237,240,254,0.5)',
              fontSize: '0.78rem', fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            {t('loader_reset')}
          </button>

          {/* Admin-only: browse folder on server */}
          {isAdmin && (
            <button
              onClick={handleBrowse}
              disabled={loading}
              title="Browse server folder"
              style={{
                padding: '10px 14px', flexShrink: 0,
                border: '1px solid rgba(20,65,245,0.3)',
                borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: 'rgba(20,65,245,0.1)',
                color: 'rgba(237,240,254,0.6)',
                fontSize: '0.78rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <FolderOpen size={14} />
              {t('loader_browse')}
            </button>
          )}

          {/* Load */}
          <button
            onClick={handleLoad}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 20px',
              backgroundColor: 'var(--p-accent)',
              border: 'none', borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: '0.9rem', fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 18px var(--p-accent-shadow)',
              transition: 'opacity 0.15s',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? <><RefreshCw size={16} className="animate-spin" /> {t('loader_loading')}</>
              : <><FileSpreadsheet size={16} /> {t('loader_load')}</>}
          </button>
        </div>

        {/* Skip / cancel */}
        <button
          onClick={skipFiles}
          disabled={loading}
          style={{
            width: '100%', padding: '10px 20px',
            background: 'none', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: '0.8rem', fontWeight: 500,
            color: loading ? 'rgba(237,240,254,0.2)' : 'rgba(237,240,254,0.4)',
            borderRadius: 8, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.color = 'rgba(237,240,254,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = loading ? 'rgba(237,240,254,0.2)' : 'rgba(237,240,254,0.4)'; }}
        >
          {hasExistingData ? t('cancel_reload') : t('skip_load')}
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
