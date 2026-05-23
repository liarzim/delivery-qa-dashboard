/**
 * EditableText — inline-editable text span for Admin edit mode.
 *
 * When editMode is ON and the user is Admin, the text becomes a
 * contenteditable span with a subtle dashed underline. On blur it saves
 * the override to title_overrides[textKey] via the settings API.
 *
 * Props:
 *   textKey   {string}  — stable dotted key, e.g. "delivery.velocity.caption"
 *   fallback  {string}  — original hard-coded text shown when no override exists
 *   className {string}  — forwarded to the span
 *   style     {object}  — forwarded to the span
 *   tag       {string}  — HTML tag to render, default "span"
 */
import React, { useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEditMode } from '../context/EditModeContext';
import { useSettings } from '../context/SettingsContext';

export default function EditableText({ textKey, fallback, className, style, tag: Tag = 'span' }) {
  const { user }           = useAuth();
  const { editMode }       = useEditMode();
  const { settings, updateSettings } = useSettings();
  const ref                = useRef(null);
  const isAdmin            = user?.role === 'Admin';
  const active             = editMode && isAdmin;

  // Parse current overrides
  const overrides = React.useMemo(() => {
    try { return JSON.parse(settings?.title_overrides || '{}'); }
    catch { return {}; }
  }, [settings?.title_overrides]);

  const currentText = overrides[textKey] ?? fallback;

  // Sync DOM when override changes externally (language switch etc.)
  useEffect(() => {
    if (ref.current && !active) ref.current.textContent = currentText;
  }, [currentText, active]);

  const handleBlur = () => {
    const newText = ref.current?.textContent?.trim();
    if (!newText || newText === currentText) return;
    const next = { ...overrides, [textKey]: newText };
    updateSettings({ title_overrides: JSON.stringify(next) });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ref.current?.blur(); }
    if (e.key === 'Escape') {
      if (ref.current) ref.current.textContent = currentText;
      ref.current?.blur();
    }
  };

  if (!active) {
    return <Tag className={className} style={style}>{currentText}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        outline: 'none',
        cursor: 'text',
        borderBottom: '1px dashed rgba(249,189,51,0.6)',
        minWidth: 20,
      }}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      title="Click to edit (Admin mode)"
    >
      {currentText}
    </Tag>
  );
}
