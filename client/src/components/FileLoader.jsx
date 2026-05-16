/**
 * FileLoader — browser file-picker dialog for Excel data sources.
 * Replaces the old server-path text inputs with <input type="file"> pickers.
 * Files are parsed entirely in the browser via browserExcelReader.js.
 */
import React, { useState } from 'react';
import { Upload, RefreshCw, AlertCircle, BarChart3, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';

// ── Single file-picker row ────────────────────────────────────────────────────
function FileRow({ label, file, onChange, required }) {
  const inputId = `file-${label.replace(/\s/g, '-')}`;
  return (
    <div>
      <label htmlFor={inputId} style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 600,
        marginBottom: 5, color: 'rgba(237,240,254,0.5)',
      }}>
        {label}{required && <span style={{ color: '#F36059' }}> *</span>}
      </label>
      <label htmlFor={inputId} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
        border: file
          ? '1px solid rgba(84,224,117,0.4)'
          : '1px dashed rgba(20,65,245,0.4)',
        backgroundColor: file
          ? 'rgba(84,224,117,0.06)'
          : 'rgba(20,65,245,0.06)',
        transition: 'all 0.15s',
      }}>
        <FileSpreadsheet size={15} style={{ flexShrink: 0, color: file ? '#54E075' : 'rgba(237,240,254,0.35)' }} />
        <span style={{ fontSize: '0.8rem', color: file ? '#54E075' : 'rgba(237,240,254,0.4)', flex: 1 }}>
          {file ? file.name : 'Click to select file…'}
        </span>
        {file && (
          <span style={{ fontSize: '0.7rem', color: 'rgba(237,240,254,0.3)' }}>
            {(file.size / 1024).toFixed(0)} KB
          </span>
        )}
      </label>
      <input id={inputId} type="file" accept=".xlsx,.xls,.xlsm,.csv"
        style={{ display: 'none' }}
        onChange={e => onChange(e.target.files[0] || null)} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FileLoader() {
  const { loadFromFiles, loading, error, skipFiles, delivery } = useData();
  const { settings }   = useSettings();
  const { t }          = useLanguage();

  const [deliveryFile, setDeliveryFile] = useState(null);
  const [bugsFile,     setBugsFile]     = useState(null);
  const [escapingFile, setEscapingFile] = useState(null);

  const hasExistingData = !!delivery;

  const handleLoad = () => {
    loadFromFiles({
      deliveryFile:  deliveryFile  || undefined,
      bugsFile:      bugsFile      || undefined,
      escapingFile:  escapingFile  || undefined,
      settings,
    });
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
            <Upload size={24} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#EDF0FE', marginBottom: 6 }}>
            Load Dashboard Data
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(237,240,254,0.5)', lineHeight: 1.5 }}>
            Select your Excel files. They are processed entirely in your browser — nothing is uploaded.
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
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        {/* File pickers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <FileRow label="Delivery File"         file={deliveryFile}  onChange={setDeliveryFile}  required />
          <FileRow label="QA Bugs File"          file={bugsFile}      onChange={setBugsFile} />
          <FileRow label="QA Escaping File"      file={escapingFile}  onChange={setEscapingFile} />
        </div>

        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={loading || !deliveryFile}
          style={{
            width: '100%', padding: '10px 20px', marginBottom: 12,
            backgroundColor: 'var(--p-accent)',
            border: 'none', borderRadius: 10,
            cursor: (loading || !deliveryFile) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: '0.9rem', fontWeight: 700, color: '#fff',
            boxShadow: '0 4px 18px var(--p-accent-shadow)',
            opacity: (loading || !deliveryFile) ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading
            ? <><RefreshCw size={16} className="animate-spin" /> Processing…</>
            : <><BarChart3 size={16} /> Load Data</>}
        </button>

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
          {hasExistingData ? 'Cancel' : 'Continue without data'}
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
