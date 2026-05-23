import React, { useState } from 'react';
import { GripVertical, CheckCircle2, X, Layers, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useLanguage } from '../context/LanguageContext';
import { widgetApi } from '../services/widgetApi';

// ── Single draggable item ──────────────────────────────────────────────────────
function BankItem({ widget, isOnGrid, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  // HTML5 drag so react-grid-layout can receive the drop
  const handleDragStart = (e) => {
    e.dataTransfer.setData('widgetId', String(widget.id));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const baseBg = isOnGrid
    ? 'rgba(20,65,245,0.04)'
    : 'rgba(20,65,245,0.08)';

  // ── Confirm-delete mode ────────────────────────────────────────────────────
  if (confirming) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg select-none"
        style={{ backgroundColor: 'rgba(243,96,89,0.12)', border: '1px solid rgba(243,96,89,0.4)' }}
      >
        <p className="text-xs flex-1 truncate" style={{ color: 'rgba(237,240,254,0.7)' }}>
          Delete &ldquo;{widget.label}&rdquo;?
        </p>
        <button
          onClick={() => { onDelete(widget.id); setConfirming(false); }}
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ backgroundColor: '#F36059', color: '#fff' }}
          title="Confirm delete"
        >✓</button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ backgroundColor: 'rgba(237,240,254,0.1)', color: 'rgba(237,240,254,0.7)' }}
          title="Cancel"
        >✗</button>
      </div>
    );
  }

  return (
    <div
      draggable={!isOnGrid && !confirming}
      onDragStart={!isOnGrid ? handleDragStart : undefined}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all select-none"
      style={{
        backgroundColor: baseBg,
        border: isOnGrid
          ? '1px solid rgba(20,65,245,0.15)'
          : '1px solid rgba(20,65,245,0.2)',
        opacity: isOnGrid ? 0.45 : 1,
        cursor: isOnGrid ? 'not-allowed' : 'grab',
      }}
    >
      <span className="shrink-0" style={{ color: 'rgba(237,240,254,0.35)' }}>
        <GripVertical size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate text-sigma-ice">{widget.label}</p>
        <p className="text-xs truncate" style={{ color: 'rgba(237,240,254,0.4)' }}>{widget.category}</p>
      </div>
      {isOnGrid && <CheckCircle2 size={12} className="text-sigma-accent shrink-0" />}
      {onDelete && !isOnGrid && (
        <button
          onClick={e => { e.stopPropagation(); setConfirming(true); }}
          className="shrink-0 p-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: '#F36059' }}
          title="Remove from bank"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
      style={{ color: 'rgba(237,240,254,0.35)' }}>
      {children}
    </p>
  );
}

// ── Main bank panel ────────────────────────────────────────────────────────────
export default function WidgetBank({ widgets, activeWidgetIds, isOpen, onClose, style }) {
  const { user }                   = useAuth();
  const { customWidgets, refresh } = useWidgetBank();
  const { lang }                   = useLanguage();
  const isHe                       = lang === 'he';
  const isAdmin                    = user?.role === 'Admin';

  // ── Built-in widgets: grouped by category ─────────────────────────────────
  const categories = [...new Set(widgets.map(w => w.category))];

  // ── Custom widgets: "approved" + "yours (non-approved)" ───────────────────
  const approvedWidgets = customWidgets.filter(w => w.status === 'approved');
  // Exclude own widgets that are already approved — they appear in "Approved" only
  const userWidgets     = customWidgets.filter(
    w => w.username === user?.username && w.status !== 'approved',
  );

  // ── Admin: delete an approved widget from the bank ────────────────────────
  async function handleAdminDelete(compositeId) {
    const numId = String(compositeId).replace('custom_', '');
    try {
      await widgetApi.remove(numId, user);
      refresh();
    } catch (err) {
      console.error('Failed to delete widget', err);
    }
  }

  // Build a display widget object from a DB custom widget row
  function toDisplayWidget(w) {
    const cfg      = w.config || {};
    const labelEn  = w.name  || 'Untitled';
    const labelHe  = cfg.name_he || labelEn;
    return {
      id:       `custom_${w.id}`,
      label:    isHe ? labelHe : labelEn,
      category: isHe ? 'ווידג\'ט מותאם' : 'Custom',
      config:   cfg,
      status:   w.status,
    };
  }

  const approvedDisplay = approvedWidgets.map(toDisplayWidget);
  const userDisplay     = userWidgets.map(toDisplayWidget);

  const hasCustom = approvedDisplay.length > 0 || userDisplay.length > 0;

  return (
    <aside
      className={`shrink-0 transition-all duration-200 overflow-hidden ${isOpen ? 'w-60' : 'w-0'}`}
      style={{ borderInlineStart: '1px solid var(--p-card-border)', backgroundColor: 'var(--p-sidebar-bg)', ...style }}
    >
      <div className="w-60 h-full flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
          <div className="flex items-center gap-2">
            <Layers size={14} style={{ color: 'var(--p-accent)' }} />
            <div>
              <p className="text-xs font-bold text-sigma-ice">
                {isHe ? 'בנק ווידג\'טים' : 'Widget Bank'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.4)' }}>
                {isHe ? 'גרור להוספה לגריד' : 'Drag to add to grid'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'rgba(237,240,254,0.4)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#EDF0FE'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(237,240,254,0.4)'}
              title="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">

          {/* ── Built-in widgets grouped by category ── */}
          {categories.map(cat => {
            const catWidgets = widgets.filter(w => w.category === cat);
            const catLabel   = isHe
              ? (catWidgets[0]?.category_he || cat)
              : cat;
            return (
              <div key={cat}>
                <SectionTitle>{catLabel}</SectionTitle>
                <div className="space-y-1.5">
                  {catWidgets.map(w => {
                    const displayW = isHe
                      ? { ...w, label: w.label_he || w.label }
                      : w;
                    return (
                      <BankItem
                        key={w.id}
                        widget={displayW}
                        isOnGrid={activeWidgetIds.includes(w.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Custom widgets ── */}
          {hasCustom && (
            <div style={{ borderTop: '1px solid rgba(20,65,245,0.15)', paddingTop: 12 }}>

              {/* Approved widgets section */}
              {approvedDisplay.length > 0 && (
                <div className="mb-4">
                  <SectionTitle>{isHe ? 'ווידג\'טים מאושרים' : 'Approved widgets'}</SectionTitle>
                  <div className="space-y-1.5">
                    {approvedDisplay.map(w => (
                      <BankItem
                        key={w.id}
                        widget={w}
                        isOnGrid={activeWidgetIds.includes(w.id)}
                        onDelete={isAdmin ? handleAdminDelete : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* User's own widgets section */}
              {userDisplay.length > 0 && (
                <div>
                  <SectionTitle>{isHe ? 'ווידג\'טים שלי' : 'Users widgets'}</SectionTitle>
                  <div className="space-y-1.5">
                    {userDisplay.map(w => (
                      <BankItem
                        key={w.id}
                        widget={w}
                        isOnGrid={activeWidgetIds.includes(w.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Empty state */}
          {!hasCustom && customWidgets.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: 'rgba(237,240,254,0.25)' }}>
              {isHe ? 'אין ווידג\'טים מותאמים' : 'No custom widgets yet'}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
