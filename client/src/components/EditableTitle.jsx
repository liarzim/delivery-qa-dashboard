/**
 * EditableTitle — click-to-edit inline title with a floating toolbar.
 *
 * Used by SectionHeader when `titleKey` is supplied and the user is Admin.
 * In non-edit-mode it renders as a plain <span>.
 * In edit-mode: click activates contenteditable + portal toolbar (Bold / Italic / size).
 * Saves to `title_overrides` in the settings DB on blur or Enter/Escape.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSettings } from '../context/SettingsContext';
import { useEditMode } from '../context/EditModeContext';

// Size options shown in the toolbar
const SIZES = [
  { key: 'sm',   label: 'S',  tw: 'text-xs'   },
  { key: 'base', label: 'M',  tw: 'text-base'  },
  { key: 'lg',   label: 'L',  tw: 'text-lg'    },
  { key: 'xl',   label: 'XL', tw: 'text-xl'    },
  { key: '2xl',  label: '2X', tw: 'text-2xl'   },
];
const SIZE_TW = Object.fromEntries(SIZES.map(s => [s.key, s.tw]));

function parseOverride(raw) {
  if (!raw) return { text: null, size: 'base', bold: false, italic: false };
  if (typeof raw === 'string') return { text: raw,  size: 'base', bold: false, italic: false };
  return {
    text:   raw.text   ?? null,
    size:   raw.size   ?? 'base',
    bold:   raw.bold   ?? false,
    italic: raw.italic ?? false,
  };
}

// ── Floating toolbar rendered via React Portal ────────────────────────────────
function FloatingToolbar({ anchorRef, size, bold, italic, onChange }) {
  const [style, setStyle] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    const top = r.top + window.scrollY - 48;
    const left = Math.max(8, r.left + window.scrollX);
    setStyle({ top, left });
  }, [anchorRef]);

  return createPortal(
    <div
      onMouseDown={e => e.preventDefault()} // keep contenteditable focused
      style={{
        position:  'absolute',
        top:       style.top,
        left:      style.left,
        zIndex:    9999,
        display:   'flex',
        alignItems: 'center',
        gap:       4,
        background: '#1E293B',
        border:    '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        padding:   '4px 8px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Bold */}
      <button
        style={{
          fontWeight: 700, fontSize: 13, padding: '2px 6px', borderRadius: 4, border: 'none',
          cursor: 'pointer',
          color:       bold ? '#818CF8' : '#94A3B8',
          background:  bold ? 'rgba(99,102,241,0.18)' : 'none',
        }}
        title="Bold"
        onClick={() => onChange({ bold: !bold })}
      >B</button>

      {/* Italic */}
      <button
        style={{
          fontStyle: 'italic', fontSize: 13, padding: '2px 6px', borderRadius: 4, border: 'none',
          cursor: 'pointer',
          color:       italic ? '#818CF8' : '#94A3B8',
          background:  italic ? 'rgba(99,102,241,0.18)' : 'none',
        }}
        title="Italic"
        onClick={() => onChange({ italic: !italic })}
      >I</button>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />

      {/* Size options */}
      {SIZES.map(s => (
        <button
          key={s.key}
          style={{
            fontSize: 11, fontWeight: 600, padding: '2px 5px', borderRadius: 4, border: 'none',
            cursor: 'pointer',
            color:      size === s.key ? '#818CF8' : '#94A3B8',
            background: size === s.key ? 'rgba(99,102,241,0.18)' : 'none',
          }}
          title={`Font size: ${s.label}`}
          onClick={() => onChange({ size: s.key })}
        >{s.label}</button>
      ))}
    </div>,
    document.body
  );
}

// ── EditableTitle ─────────────────────────────────────────────────────────────
export default function EditableTitle({ titleKey, defaultTitle, className = '' }) {
  const { settings, updateSettings } = useSettings();
  const { editMode }                 = useEditMode();
  const spanRef                      = useRef(null);
  const [active, setActive]          = useState(false);

  // Parse stored overrides
  const overrides = useMemo(() => {
    try { return JSON.parse(settings.title_overrides || '{}'); }
    catch { return {}; }
  }, [settings.title_overrides]);

  const ov = parseOverride(overrides[titleKey]);
  const displayText = ov.text ?? defaultTitle;
  const size   = ov.size;
  const bold   = ov.bold;
  const italic = ov.italic;

  const persist = useCallback((patch) => {
    const next = { ...ov, text: spanRef.current?.innerText?.trim() || defaultTitle, ...patch };
    updateSettings({ title_overrides: JSON.stringify({ ...overrides, [titleKey]: next }) });
  }, [ov, overrides, titleKey, defaultTitle, updateSettings]);

  const activate = useCallback(() => {
    if (!editMode) return;
    setActive(true);
    requestAnimationFrame(() => {
      const el = spanRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    });
  }, [editMode]);

  const handleBlur = useCallback(() => {
    setActive(false);
    persist({});
  }, [persist]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      spanRef.current?.blur();
    }
  }, []);

  // Exit active state when edit mode is toggled off
  useEffect(() => { if (!editMode) setActive(false); }, [editMode]);

  const sizeCls  = SIZE_TW[size] || 'text-base';
  const boldCls  = bold   ? 'font-bold'   : '';
  const italicCls = italic ? 'italic' : '';

  const editHint = editMode && !active
    ? 'cursor-pointer rounded px-0.5 outline outline-2 outline-dashed outline-transparent hover:outline-indigo-400/60 transition-[outline-color]'
    : '';
  const activeHint = active
    ? 'rounded px-0.5 outline outline-2 outline-dashed outline-indigo-500'
    : '';

  return (
    <>
      {active && (
        <FloatingToolbar
          anchorRef={spanRef}
          size={size}
          bold={bold}
          italic={italic}
          onChange={patch => persist(patch)}
        />
      )}
      <span
        ref={spanRef}
        contentEditable={active}
        suppressContentEditableWarning
        onClick={activate}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={[className, sizeCls, boldCls, italicCls, editHint, activeHint].filter(Boolean).join(' ')}
        title={editMode && !active ? 'Click to edit title' : undefined}
      >
        {displayText}
      </span>
    </>
  );
}
