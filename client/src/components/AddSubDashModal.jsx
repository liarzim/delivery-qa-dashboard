/**
 * AddSubDashModal — quick-create dialog for a new sub-dashboard.
 *
 * Triggered by the "+" button next to the Dashboards section in the sidebar.
 * Saves directly to localStorage under 'sub_dashboards'.
 *
 * Props:
 *   onClose   {() => void}
 *   onCreated {(entry) => void}  — called after successful save
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Plus } from 'lucide-react';
import { store } from '../lib/store';
import { useLanguage } from '../context/LanguageContext';
import IconPicker from './IconPicker';

export default function AddSubDashModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const nameRef = useRef(null);
  const [form, setForm] = useState({
    name_en:  '',
    name_he:  '',
    parentId: '',
    icon:     'LayoutDashboard',
  });

  // Auto-focus name field + close on Escape
  useEffect(() => {
    nameRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = patch => setForm(f => ({ ...f, ...patch }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name_en.trim()) return;
    const entry = {
      id:       Date.now(),
      name_en:  form.name_en.trim(),
      name_he:  form.name_he.trim(),
      parentId: form.parentId || null,
      icon:     form.icon || 'LayoutDashboard',
    };
    const next = [...store.get('sub_dashboards', []), entry];
    store.set('sub_dashboards', next);
    onCreated(entry);
    onClose();
  };

  // ── Shared label style ─────────────────────────────────────────────────────
  const labelStyle = { color: 'var(--p-text-muted, rgba(237,240,254,0.5))' };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--p-card-bg, #0B1748)',
          border: '1px solid var(--p-card-border, rgba(20,65,245,0.35))',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold" style={{ color: 'var(--p-text, #EDF0FE)' }}>
            {t('sub_modal_title')}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--p-text-faint, rgba(237,240,254,0.3))' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,130,255,0.15)'; e.currentTarget.style.color = 'var(--p-text, #EDF0FE)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--p-text-faint, rgba(237,240,254,0.3))'; }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* English name (required) */}
          <div>
            <label className="text-xs font-semibold block mb-1" style={labelStyle}>
              {t('sub_new_name_en')} *
            </label>
            <input
              ref={nameRef}
              value={form.name_en}
              onChange={e => set({ name_en: e.target.value })}
              placeholder="My Dashboard"
              className="sigma-input"
            />
          </div>

          {/* Hebrew name (optional) */}
          <div>
            <label dir="rtl" className="text-xs font-semibold block mb-1" style={labelStyle}>
              {t('sub_new_name_he')}
            </label>
            <input
              dir="rtl"
              value={form.name_he}
              onChange={e => set({ name_he: e.target.value })}
              placeholder="לוח שלי"
              className="sigma-input"
              style={{ textAlign: 'right' }}
            />
          </div>

          {/* Parent dashboard */}
          <div>
            <label className="text-xs font-semibold block mb-1" style={labelStyle}>
              {t('sub_new_parent')}
            </label>
            <select
              value={form.parentId}
              onChange={e => set({ parentId: e.target.value })}
              className="sigma-input"
            >
              <option value="">{t('sub_parent_none')}</option>
              <option value="overview">{t('nav_overview')}</option>
              <option value="delivery">{t('nav_delivery')}</option>
              <option value="qa">{t('nav_qa')}</option>
            </select>
          </div>

          {/* Icon picker */}
          <div>
            <label className="text-xs font-semibold block mb-1" style={labelStyle}>
              {t('sub_new_icon')}
            </label>
            <IconPicker
              value={form.icon}
              onChange={icon => set({ icon })}
              size="sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary text-sm py-2">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!form.name_en.trim()}
              className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1.5"
            >
              <Plus size={13} />
              {t('sub_add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
