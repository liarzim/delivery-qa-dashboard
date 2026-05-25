/**
 * SettingsPage — 100% localStorage. No server calls.
 *
 * Settings are written to SettingsContext (which persists to localStorage).
 * Users are managed via AuthContext (localStorage users list).
 * Sub-dashboards are stored directly in localStorage under 'sub_dashboards'.
 */
import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { store } from '../lib/store';
import SectionHeader from '../components/SectionHeader';
import { widgetApi } from '../services/widgetApi';
import IconPicker, { resolveIcon } from '../components/IconPicker';
import en from '../i18n/en';
import * as XLSX from 'xlsx';
import {
  Save, RefreshCw, Plus, Trash2, AlertCircle, CheckCircle2,
  Users, Sliders, Map, LayoutDashboard, Wrench, Check, X, Languages, FolderOpen,
  Upload, Download, Pencil,
} from 'lucide-react';
import { apiFetch, getToken } from '../lib/api';

// ── Tiny shared input components ──────────────────────────────────────────────
function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-start gap-6 py-4" style={{ borderBottom: '1px solid rgba(20,65,245,0.15)' }}>
      <div className="w-52 shrink-0">
        <p className="text-sm font-semibold text-sigma-ice">{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.4)' }}>{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="sigma-input" />;
}
function NumberInput({ value, onChange, min = 0, max = 100 }) {
  return <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} className="sigma-input" style={{ width: '6rem' }} />;
}
function ThresholdRow({ label, yellowKey, redKey, form, setForm, t }) {
  return (
    <div className="flex items-center gap-4 py-2.5" style={{ borderBottom: '1px solid rgba(20,65,245,0.1)' }}>
      <span className="text-sm text-sigma-ice/80 w-40 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-sigma-yellow" />
        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('threshold_yellow')}</span>
        <NumberInput value={form[yellowKey] ?? ''} onChange={v => setForm(f => ({ ...f, [yellowKey]: v }))} />
        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-sigma-red" />
        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('threshold_red')}</span>
        <NumberInput value={form[redKey] ?? ''} onChange={v => setForm(f => ({ ...f, [redKey]: v }))} />
        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>%</span>
      </div>
    </div>
  );
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold shadow-xl z-50"
      style={toast.type === 'error'
        ? { backgroundColor: 'rgba(243,96,89,0.15)', border: '1px solid rgba(243,96,89,0.3)', color: '#F36059' }
        : { backgroundColor: 'rgba(84,224,117,0.15)', border: '1px solid rgba(84,224,117,0.3)', color: '#54E075' }}
    >
      {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {toast.msg}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t, titleOverrides, setTitleOverride, removeTitleOverride } = useLanguage();
  const { settings, updateSettings } = useSettings();
  const { getAll, addUser, removeUser, user } = useAuth();
  const { clearData } = useData();

  const [form, setForm]   = useState({ ...settings });
  // piRows: [{raw: string, display: string}]
  const [piRows, setPiRows] = useState([]);
  const [toast, setToast] = useState(null);
  const [users, setUsers]       = useState([]);
  const [newUser, setNewUser]   = useState({ username: '', password: '', role: 'Management' });
  const [subDashes, setSubDashes] = useState([]);
  const [newSub, setNewSub]     = useState({ name_en: '', name_he: '', parentId: '', icon: 'LayoutDashboard' });
  const [pendingWidgets, setPendingWidgets] = useState([]);
  const [widgetActioning, setWidgetActioning] = useState(null); // id being approved/rejected
  const [syncStatus, setSyncStatus] = useState(null); // null | 'exporting' | 'importing' | 'done' | 'error'
  const [syncMsg, setSyncMsg]        = useState('');
  const importInputRef               = React.useRef(null);
  const [newOverrideKey, setNewOverrideKey] = useState('');
  const [newOverrideEn, setNewOverrideEn] = useState('');
  const [newOverrideHe, setNewOverrideHe] = useState('');
  // Inline edit state for existing overrides
  const [editingKey, setEditingKey] = useState(null);
  const [editEn, setEditEn]         = useState('');
  const [editHe, setEditHe]         = useState('');

  // ── Sync form from settings ──────────────────────────────────────────────
  useEffect(() => {
    setForm({ ...settings });
    try {
      const obj = JSON.parse(settings.pi_name_map || '{}');
      setPiRows(Object.entries(obj).map(([raw, display]) => ({ raw, display })));
    } catch {
      setPiRows([]);
    }
  }, [settings]);

  // ── Load users & sub-dashboards ──────────────────────────────────────────
  useEffect(() => {
    getAll().then(setUsers).catch(() => setUsers([]));
    setSubDashes(store.get('sub_dashboards', []));
  }, [getAll]);

  // ── Load pending widget submissions ──────────────────────────────────────
  useEffect(() => {
    widgetApi.pending(user).then(setPendingWidgets).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApproveWidget = async (id) => {
    setWidgetActioning(id);
    try {
      await widgetApi.approve(id, user);
      showToast(t('widget_approved'));
      widgetApi.pending(user).then(setPendingWidgets).catch(() => {});
    } catch (e) { showToast(e.message, 'error'); }
    finally { setWidgetActioning(null); }
  };
  const handleRejectWidget = async (id) => {
    setWidgetActioning(id);
    try {
      await widgetApi.reject(id, user);
      showToast(t('widget_rejected'));
      widgetApi.pending(user).then(setPendingWidgets).catch(() => {});
    } catch (e) { showToast(e.message, 'error'); }
    finally { setWidgetActioning(null); }
  };

  const handleExport = async () => {
    setSyncStatus('exporting');
    setSyncMsg('');
    try {
      const res = await fetch('/api/config/export', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `system-config-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSyncStatus('done');
      setSyncMsg('Export complete.');
    } catch (err) {
      setSyncStatus('error');
      setSyncMsg(`Export failed: ${err.message}`);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importInputRef.current) importInputRef.current.value = '';
    setSyncStatus('importing');
    setSyncMsg('');
    try {
      const text    = await file.text();
      const payload = JSON.parse(text);
      const result  = await apiFetch('/api/config/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSyncStatus('done');
      setSyncMsg(`Import complete (${result.imported.settings} settings, ${result.imported.widgets} widgets, ${result.imported.layouts} layouts) — reloading…`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setSyncStatus('error');
      setSyncMsg(`Import failed: ${err.message}`);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Save settings ────────────────────────────────────────────────────────
  const save = () => {
    // Build JSON object from table rows; skip blank rows
    const piMap = {};
    for (const { raw, display } of piRows) {
      const k = raw.trim();
      if (k) piMap[k] = display.trim();
    }
    updateSettings({ ...form, pi_name_map: JSON.stringify(piMap) });
    showToast(t('success_saved'));
  };

  // ── PI row helpers ────────────────────────────────────────────────────────
  const addPiRow = () => setPiRows(r => [...r, { raw: '', display: '' }]);

  const updatePiRow = (i, field, value) =>
    setPiRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const deletePiRow = (i) =>
    setPiRows(r => r.filter((_, idx) => idx !== i));

  // Detect duplicate raw names for inline warning
  const rawCounts = piRows.reduce((acc, { raw }) => {
    const k = raw.trim();
    if (k) acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // ── PI CSV/XLSX upload ────────────────────────────────────────────────────
  const handlePiUpload = async (file) => {
    if (!file) return;
    try {
      let rows = [];
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'csv') {
        const text = await file.text();
        rows = text.split(/\r?\n/).map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      } else {
        const buf = await file.arrayBuffer();
        const wb  = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }

      // Skip header row (row 0), build piRows
      const parsed = rows
        .slice(1)
        .map(r => ({ raw: String(r[0] ?? '').trim(), display: String(r[1] ?? '').trim() }))
        .filter(({ raw }) => raw !== '');

      if (parsed.length === 0) {
        showToast('No valid rows found in file', 'error');
        return;
      }
      setPiRows(parsed);
      showToast(`Loaded ${parsed.length} mapping${parsed.length !== 1 ? 's' : ''}`);
    } catch (e) {
      showToast(`Upload failed: ${e.message}`, 'error');
    }
  };

  // ── Download CSV template ─────────────────────────────────────────────────
  const downloadTemplate = () => {
    const csv = 'raw_pi_name,display_name\nPI 2024.1,Q1 2024\nPI 2024.2,Q2 2024\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'pi_mapping_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── User management ───────────────────────────────────────────────────────
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    try {
      await addUser(newUser);
      const next = await getAll();
      setUsers(next);
      setNewUser({ username: '', password: '', role: 'Management' });
      showToast(t('success_user_created'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
  const handleDeleteUser = async (id, username) => {
    if (!confirm(`${t('confirm_delete')} "${username}"?`)) return;
    try {
      await removeUser(id);
      const next = await getAll();
      setUsers(next);
      showToast(t('success_user_deleted'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // ── Sub-dashboard management ──────────────────────────────────────────────
  const handleAddSub = () => {
    if (!newSub.name_en) return;
    // parentId: empty string → standalone (no parent)
    const entry = { id: Date.now(), ...newSub, parentId: newSub.parentId || null, icon: newSub.icon || 'LayoutDashboard' };
    const next  = [...subDashes, entry];
    store.set('sub_dashboards', next);
    setSubDashes(next);
    setNewSub({ name_en: '', name_he: '', parentId: '', icon: 'LayoutDashboard' });
    showToast(t('success_sub_created'));
  };
  const handleDeleteSub = (id) => {
    if (!confirm(t('sub_confirm_delete'))) return;
    const next = subDashes.filter(d => d.id !== id);
    store.set('sub_dashboards', next);
    setSubDashes(next);
    showToast(t('success_sub_deleted'));
  };

  const handleAddTitleOverride = () => {
    if (!newOverrideKey || (!newOverrideEn && !newOverrideHe)) return;
    setTitleOverride(newOverrideKey, newOverrideEn, newOverrideHe);
    setNewOverrideKey('');
    setNewOverrideEn('');
    setNewOverrideHe('');
    showToast(t('success_saved'));
  };

  const totalWeight = parseFloat(form.delivery_weight || 0) + parseFloat(form.quality_weight || 0);

  const cardStyle = {
    backgroundColor: 'var(--p-card-bg)',
    border: '1px solid var(--p-card-border)',
    borderRadius: '12px',
    padding: '20px',
  };
  const sectionTitleStyle = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--p-text)' };

  return (
    <div className="max-w-3xl space-y-8">
      <SectionHeader title={t('settings_title')} subtitle={t('settings_subtitle')} />
      <Toast toast={toast} />

      {/* Data Files */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <LayoutDashboard size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_data_sources')}</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: 'rgba(237,240,254,0.45)' }}>
          {t('settings_data_sources_desc')}
        </p>
        <SettingRow label={t('settings_excel_folder')} description={t('settings_excel_folder_desc')}>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.excel_path || ''}
              onChange={e => setForm(f => ({ ...f, excel_path: e.target.value }))}
              placeholder="C:\data\excel"
              className="sigma-input flex-1"
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              dir="ltr"
            />
            <button
              onClick={async () => {
                try {
                  const { path } = await apiFetch('/api/settings/select-folder');
                  if (path) setForm(f => ({ ...f, excel_path: path }));
                } catch { /* cancelled */ }
              }}
              className="btn-secondary flex items-center gap-1.5 text-xs px-3"
              title="Browse for folder on this server"
            >
              <FolderOpen size={13} /> Browse
            </button>
          </div>
        </SettingRow>
        <SettingRow label={t('settings_delivery_file')} description={t('settings_delivery_file_desc')}>
          <TextInput value={form.delivery_file || ''} onChange={v => setForm(f => ({ ...f, delivery_file: v }))} placeholder="delivery.xlsx" />
        </SettingRow>
        <SettingRow label={t('settings_qa_bug_file')} description={t('settings_qa_bug_file_desc')}>
          <TextInput value={form.qa_bug_file || ''} onChange={v => setForm(f => ({ ...f, qa_bug_file: v }))} placeholder="qa_bugs.xlsx" />
        </SettingRow>
        <SettingRow label={t('settings_qa_escaping_file')} description={t('settings_qa_escaping_file_desc')}>
          <TextInput value={form.qa_escaping_file || ''} onChange={v => setForm(f => ({ ...f, qa_escaping_file: v }))} placeholder="qa_escaping.xlsx" />
        </SettingRow>
        <div className="mt-4">
          <button onClick={clearData} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={12} /> {t('settings_reload_data')}
          </button>
        </div>
      </div>

      {/* Delivery Weights */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Sliders size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_delivery_weights')}</h3>
        </div>
        <SettingRow label={t('settings_delivery_weight')} description={t('settings_delivery_weight_desc')}>
          <div className="flex items-center gap-3">
            <NumberInput value={form.delivery_weight || ''} onChange={v => setForm(f => ({ ...f, delivery_weight: v }))} />
            <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>%</span>
          </div>
        </SettingRow>
        <SettingRow label={t('settings_quality_weight')} description={t('settings_quality_weight_desc')}>
          <div className="flex items-center gap-3">
            <NumberInput value={form.quality_weight || ''} onChange={v => setForm(f => ({ ...f, quality_weight: v }))} />
            <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>%</span>
            {totalWeight !== 100 && (
              <span className="text-xs flex items-center gap-1" style={{ color: '#FF8E21' }}>
                <AlertCircle size={12} />
                {t('settings_total_should_be_100', { val: totalWeight })}
              </span>
            )}
          </div>
        </SettingRow>
        <div className="mt-4">
          <p className="text-xs mb-3" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_commitment_thresholds')}</p>
          <ThresholdRow label={t('threshold_committed_rate')} yellowKey="commitment_yellow" redKey="commitment_red" form={form} setForm={setForm} t={t} />
        </div>
        <div className="mt-4">
          <p className="text-xs mb-3" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_weighted_thresholds')}</p>
          <ThresholdRow label={t('threshold_weighted_score')} yellowKey="weighted_yellow" redKey="weighted_red" form={form} setForm={setForm} t={t} />
        </div>
      </div>

      {/* QA Thresholds */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Sliders size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_qa_thresholds')}</h3>
          <span className="text-xs ml-1" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_qa_thresholds_note')}</span>
        </div>
        <div className="mb-5 mt-4">
          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>{t('settings_percentage_metrics')}</p>
          <ThresholdRow label={t('threshold_reopen')}   yellowKey="reopen_yellow"   redKey="reopen_red"   form={form} setForm={setForm} t={t} />
          <ThresholdRow label={t('threshold_rejected')} yellowKey="rejected_yellow" redKey="rejected_red" form={form} setForm={setForm} t={t} />
          <ThresholdRow label={t('threshold_escaping')} yellowKey="escaping_yellow" redKey="escaping_red" form={form} setForm={setForm} t={t} />
        </div>
        <div>
          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>{t('settings_density_metrics')}</p>
          <ThresholdRow label={t('threshold_reopen_density')}   yellowKey="reopen_density_yellow"   redKey="reopen_density_red"   form={form} setForm={setForm} t={t} />
          <ThresholdRow label={t('threshold_rejected_density')} yellowKey="rejected_density_yellow" redKey="rejected_density_red" form={form} setForm={setForm} t={t} />
          <ThresholdRow label={t('threshold_escaping_density')} yellowKey="escaping_density_yellow" redKey="escaping_density_red" form={form} setForm={setForm} t={t} />
        </div>
      </div>

      {/* PI Name Map */}
      <div style={cardStyle}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Map size={15} style={{ color: 'var(--p-accent)' }} />
            <h3 style={sectionTitleStyle}>{t('settings_pi_name_map')}</h3>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Download template */}
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 btn-secondary text-xs py-1.5"
              title="Download CSV template"
            >
              <Download size={12} /> Template
            </button>

            {/* Upload CSV / XLSX */}
            <label className="flex items-center gap-1.5 btn-secondary text-xs py-1.5 cursor-pointer">
              <Upload size={12} /> Upload CSV / XLSX
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.xlsm"
                className="hidden"
                onChange={e => { handlePiUpload(e.target.files[0]); e.target.value = ''; }}
              />
            </label>

            {/* Add row */}
            <button
              onClick={addPiRow}
              className="flex items-center gap-1.5 btn-primary text-xs py-1.5"
            >
              <Plus size={12} /> Add Row
            </button>
          </div>
        </div>

        <p className="text-xs mb-4" style={{ color: 'rgba(237,240,254,0.4)' }}>
          {t('settings_pi_name_map_desc')}
        </p>

        {/* Table */}
        {piRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 rounded-xl"
            style={{ border: '2px dashed rgba(20,65,245,0.2)', color: 'rgba(237,240,254,0.3)' }}>
            <Map size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No mappings — PI names shown as-is</p>
            <p className="text-xs mt-1 opacity-70">Click "Add Row" or upload a CSV / XLSX file</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(20,65,245,0.2)' }}>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_2.5rem] text-xs font-bold uppercase tracking-wider px-3 py-2"
              style={{ backgroundColor: 'rgba(20,65,245,0.1)', color: 'rgba(237,240,254,0.45)', borderBottom: '1px solid rgba(20,65,245,0.2)', letterSpacing: '0.07em' }}>
              <span>Raw PI Name (from file)</span>
              <span>Display Name</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
              {piRows.map(({ raw, display }, i) => {
                const isDupe = raw.trim() && rawCounts[raw.trim()] > 1;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-2 px-3 py-2"
                    style={{ borderBottom: '1px solid rgba(20,65,245,0.1)', backgroundColor: isDupe ? 'rgba(249,189,51,0.04)' : undefined }}
                  >
                    {/* Raw name */}
                    <div className="relative">
                      <input
                        value={raw}
                        onChange={e => updatePiRow(i, 'raw', e.target.value)}
                        placeholder="e.g. PI 2024.1"
                        dir="ltr"
                        className="sigma-input text-xs py-1.5 w-full"
                        style={isDupe ? { borderColor: 'rgba(249,189,51,0.5)' } : undefined}
                      />
                      {isDupe && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                          style={{ color: '#F9BD33' }} title="Duplicate raw name">
                          <AlertCircle size={12} />
                        </span>
                      )}
                    </div>

                    {/* Display name */}
                    <input
                      value={display}
                      onChange={e => updatePiRow(i, 'display', e.target.value)}
                      placeholder="e.g. Q1 2024"
                      dir="auto"
                      className="sigma-input text-xs py-1.5 w-full"
                    />

                    {/* Delete */}
                    <button
                      onClick={() => deletePiRow(i)}
                      className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                      style={{ color: 'rgba(237,240,254,0.25)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#F36059'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(237,240,254,0.25)'}
                      title="Remove row"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer: row count */}
            <div className="px-3 py-2 text-xs flex items-center justify-between"
              style={{ backgroundColor: 'rgba(20,65,245,0.05)', borderTop: '1px solid rgba(20,65,245,0.15)', color: 'rgba(237,240,254,0.3)' }}>
              <span>{piRows.filter(r => r.raw.trim()).length} mapping{piRows.filter(r => r.raw.trim()).length !== 1 ? 's' : ''}</span>
              {Object.values(rawCounts).some(c => c > 1) && (
                <span className="flex items-center gap-1" style={{ color: '#F9BD33' }}>
                  <AlertCircle size={11} /> Duplicate raw names detected — only the last will be used
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Titles & Localization */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Languages size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_titles_section')}</h3>
        </div>
        <p className="text-xs mb-4 mt-1" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_titles_desc')}</p>

        {/* Existing overrides list */}
        <div className="space-y-1 mb-4">
          {Object.keys(titleOverrides).length === 0 ? (
            <p className="text-sm py-3 text-center" style={{ color: 'rgba(237,240,254,0.3)' }}>
              {t('settings_titles_no_overrides')}
            </p>
          ) : Object.entries(titleOverrides).map(([key, vals]) => {
            const isEditing = editingKey === key;
            return (
              <div key={key}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: isEditing ? 'rgba(20,65,245,0.12)' : 'rgba(20,65,245,0.06)',
                  border: `1px solid ${isEditing ? 'rgba(20,65,245,0.4)' : 'rgba(20,65,245,0.15)'}`,
                }}>
                <div className="flex-1 min-w-0">
                  {/* Key label — always visible */}
                  <p className="text-xs font-mono font-semibold mb-1.5" style={{ color: 'var(--p-accent)' }}>{key}</p>

                  {isEditing ? (
                    /* ── Edit mode: inline inputs ── */
                    <div className="flex gap-3 flex-wrap">
                      <div className="flex-1 min-w-32">
                        <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.35)' }}>EN</label>
                        <input
                          value={editEn}
                          onChange={e => setEditEn(e.target.value)}
                          placeholder={en[key] || 'English text…'}
                          autoFocus
                          className="sigma-input text-xs py-1.5 w-full"
                        />
                      </div>
                      <div className="flex-1 min-w-32">
                        <label dir="auto" className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.35)' }}>HE</label>
                        <input
                          value={editHe}
                          onChange={e => setEditHe(e.target.value)}
                          placeholder="טקסט עברי…"
                          dir="auto"
                          className="sigma-input text-xs py-1.5 w-full"
                        />
                      </div>
                    </div>
                  ) : (
                    /* ── View mode: values + default ── */
                    <>
                      <div className="flex gap-4 flex-wrap">
                        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.55)' }}>
                          <span className="font-semibold mr-1" style={{ color: 'rgba(237,240,254,0.3)' }}>EN:</span>{vals.en || '—'}
                        </span>
                        <span className="text-xs" dir="auto" style={{ color: 'rgba(237,240,254,0.55)' }}>
                          <span className="font-semibold mr-1" style={{ color: 'rgba(237,240,254,0.3)' }}>HE:</span>{vals.he || '—'}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'rgba(237,240,254,0.2)' }}>
                        {t('settings_titles_default_en')}: {en[key] ?? key}
                      </p>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  {isEditing ? (
                    <>
                      {/* Save edit */}
                      <button
                        onClick={() => {
                          setTitleOverride(key, editEn, editHe);
                          setEditingKey(null);
                          showToast(t('success_saved'));
                        }}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: '#54E075' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(84,224,117,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                        title="Save changes"
                      >
                        <Check size={14} />
                      </button>
                      {/* Cancel edit */}
                      <button
                        onClick={() => setEditingKey(null)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'rgba(237,240,254,0.35)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(237,240,254,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Edit */}
                      <button
                        onClick={() => { setEditingKey(key); setEditEn(vals.en || ''); setEditHe(vals.he || ''); }}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'rgba(237,240,254,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--p-accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(237,240,254,0.25)'}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => { removeTitleOverride(key); showToast(t('success_saved')); }}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'rgba(237,240,254,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F36059'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(237,240,254,0.25)'}
                        title={t('settings_titles_remove')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add new override form */}
        <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(20,65,245,0.2)' }}>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>
              {t('settings_titles_key')}
            </label>
            <select
              value={newOverrideKey}
              onChange={e => setNewOverrideKey(e.target.value)}
              className="sigma-input"
              style={{ width: '100%', maxWidth: '32rem' }}>
              <option value="">{t('settings_titles_key_placeholder')}</option>
              {Object.keys(en).sort().map(k => (
                <option key={k} value={k}>{k} — {en[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-40">
              <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>
                {t('settings_titles_en')}
              </label>
              <TextInput
                value={newOverrideEn}
                onChange={setNewOverrideEn}
                placeholder={newOverrideKey ? (en[newOverrideKey] || '') : 'English text…'}
              />
            </div>
            <div className="flex-1 min-w-40">
              <label dir="auto" className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>
                {t('settings_titles_he')}
              </label>
              <TextInput
                value={newOverrideHe}
                onChange={setNewOverrideHe}
                placeholder="טקסט עברי…"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddTitleOverride}
              disabled={!newOverrideKey || (!newOverrideEn && !newOverrideHe)}
              className="btn-primary flex items-center gap-1.5 py-2">
              <Plus size={14} /> {t('settings_titles_add')}
            </button>
          </div>
        </div>
      </div>

      {/* Save all */}
      <div className="flex justify-end">
        <button onClick={save} className="btn-primary flex items-center gap-2">
          <Save size={14} /> {t('settings_save_all')}
        </button>
      </div>

      {/* Sub-Dashboards */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_sub_dashboards')}</h3>
        </div>
        <p className="text-xs mb-4 mt-1" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_sub_dashboards_desc')}</p>
        <div className="space-y-1 mb-4">
          {subDashes.length === 0 ? (
            <p className="text-sm py-3 text-center" style={{ color: 'rgba(237,240,254,0.3)' }}>{t('sub_empty')}</p>
          ) : subDashes.map(d => {
            const DashIcon = resolveIcon(d.icon);
            return (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(20,65,245,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(20,65,245,0.2)' }}>
                <DashIcon size={14} style={{ color: 'var(--p-accent)' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-sigma-ice">{d.name_en}</p>
                <p dir="auto" className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>
                  {d.name_he && <span>{d.name_he} · </span>}
                  {d.parentId
                    ? <span style={{ color: 'var(--p-accent)' }}>↳ {d.parentId}</span>
                    : <span>{t('sub_parent_none')}</span>
                  }
                </p>
              </div>
              <button onClick={() => handleDeleteSub(d.id)} className="p-1.5 rounded transition-colors hover:text-sigma-red" style={{ color: 'rgba(237,240,254,0.25)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          );})}
        </div>
        <div className="pt-4 space-y-3" style={{ borderTop: '1px solid rgba(20,65,245,0.2)' }}>
          {/* Row 1: names */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('sub_new_name_en')}</label>
              <TextInput value={newSub.name_en} onChange={v => setNewSub(s => ({ ...s, name_en: v }))} placeholder="My Dashboard" />
            </div>
            <div className="flex-1 min-w-32">
              <label dir="auto" className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('sub_new_name_he')}</label>
              <TextInput value={newSub.name_he} onChange={v => setNewSub(s => ({ ...s, name_he: v }))} placeholder="לוח שלי" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('sub_new_parent')}</label>
              <select
                value={newSub.parentId}
                onChange={e => setNewSub(s => ({ ...s, parentId: e.target.value }))}
                className="sigma-input"
                style={{ width: 'auto' }}
              >
                <option value="">{t('sub_parent_none')}</option>
                <option value="overview">{t('nav_overview')}</option>
                <option value="delivery">{t('nav_delivery')}</option>
                <option value="qa">{t('nav_qa')}</option>
              </select>
            </div>
          </div>
          {/* Row 2: icon picker */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('sub_new_icon')}</label>
            <IconPicker
              value={newSub.icon}
              onChange={icon => setNewSub(s => ({ ...s, icon }))}
              size="md"
            />
          </div>
          {/* Row 3: action */}
          <div className="flex justify-end">
            <button onClick={handleAddSub} disabled={!newSub.name_en} className="btn-primary flex items-center gap-1.5 py-2">
              <Plus size={14} /> {t('sub_add')}
            </button>
          </div>
        </div>
      </div>

      {/* Widget Approvals */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_widget_approvals')}</h3>
        </div>
        <p className="text-xs mb-4 mt-1" style={{ color: 'rgba(237,240,254,0.4)' }}>
          {t('settings_widget_approvals_desc')}
        </p>
        {pendingWidgets.length === 0 ? (
          <p className="text-sm py-3 text-center" style={{ color: 'rgba(237,240,254,0.3)' }}>
            {t('widget_no_pending')}
          </p>
        ) : pendingWidgets.map(w => {
          const cfg = (() => { try { return JSON.parse(w.config_json || '{}'); } catch { return {}; } })();
          return (
            <div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
              style={{ backgroundColor: 'rgba(20,65,245,0.06)', border: '1px solid rgba(20,65,245,0.18)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(20,65,245,0.2)' }}>
                <Wrench size={14} style={{ color: 'var(--p-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sigma-ice truncate">{w.name}</p>
                <p className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>
                  {w.username} · {cfg.chartType || '?'} · {cfg.dataSource || '?'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleApproveWidget(w.id)}
                  disabled={widgetActioning === w.id}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(84,224,117,0.12)', color: '#54E075', border: '1px solid rgba(84,224,117,0.3)' }}>
                  <Check size={11} /> {t('widget_approve')}
                </button>
                <button
                  onClick={() => handleRejectWidget(w.id)}
                  disabled={widgetActioning === w.id}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.3)' }}>
                  <X size={11} /> {t('widget_reject')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Sync */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>System Sync</h3>
        </div>
        <p className="text-xs mb-4" style={{ color: 'rgba(237,240,254,0.4)' }}>
          Export all settings, approved widgets, and user layouts to a portable JSON file. Import on another machine to restore the same configuration. Note: the export file includes each user's personal layout preferences (widget positions and sizes) alongside global config.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            disabled={syncStatus === 'exporting' || syncStatus === 'importing'}
            className="flex items-center gap-1.5 btn-secondary text-xs py-2 px-4 disabled:opacity-50"
          >
            <Download size={13} /> {syncStatus === 'exporting' ? 'Exporting…' : 'Export System Update'}
          </button>

          <label
            className={`flex items-center gap-1.5 btn-secondary text-xs py-2 px-4 cursor-pointer ${syncStatus === 'exporting' || syncStatus === 'importing' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload size={13} /> {syncStatus === 'importing' ? 'Importing…' : 'Import System Update'}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              disabled={syncStatus === 'exporting' || syncStatus === 'importing'}
            />
          </label>
        </div>
        {syncMsg && (
          <p className={`text-xs mt-3 ${syncStatus === 'error' ? 'text-sigma-red' : 'text-sigma-green'}`}>
            {syncMsg}
          </p>
        )}
      </div>

      {/* User Management */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} style={{ color: 'var(--p-accent)' }} />
          <h3 style={sectionTitleStyle}>{t('settings_users')}</h3>
        </div>
        <div className="flex items-end gap-2 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_username')}</label>
            <TextInput value={newUser.username} onChange={v => setNewUser(u => ({ ...u, username: v }))} placeholder="new_user" />
          </div>
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_password')}</label>
            <TextInput type="password" value={newUser.password} onChange={v => setNewUser(u => ({ ...u, password: v }))} placeholder="••••••••" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'rgba(237,240,254,0.4)' }}>{t('settings_role')}</label>
            <select value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))} className="sigma-input" style={{ width: 'auto' }}>
              <option value="Management">Management</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <button onClick={handleAddUser} disabled={!newUser.username || !newUser.password} className="btn-primary flex items-center gap-1.5 py-2">
            <Plus size={14} /> {t('settings_add_user')}
          </button>
        </div>
        <div className="space-y-1">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(20,65,245,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={u.role === 'Admin' ? { backgroundColor: 'rgba(20,65,245,0.2)', color: '#3F64F7' } : { backgroundColor: 'rgba(237,240,254,0.08)', color: 'rgba(237,240,254,0.6)' }}>
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm text-sigma-ice">{u.username}</p>
                <p className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>{u.role}</p>
              </div>
              <button onClick={() => handleDeleteUser(u.id, u.username)} className="p-1.5 rounded transition-colors hover:text-sigma-red" style={{ color: 'rgba(237,240,254,0.25)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
