import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, CheckCircle2, X, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useLanguage } from '../context/LanguageContext';

// ── Single draggable item ──────────────────────────────────────────────────────
function BankItem({ widget, isOnGrid }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bank-${widget.id}`,
    data: { widget, fromBank: true },
    disabled: isOnGrid,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isOnGrid
          ? 'rgba(20,65,245,0.04)'
          : isDragging
            ? 'rgba(20,65,245,0.2)'
            : 'rgba(20,65,245,0.08)',
        border: isOnGrid
          ? '1px solid rgba(20,65,245,0.15)'
          : isDragging
            ? '1px solid #1441F5'
            : '1px solid rgba(20,65,245,0.2)',
        opacity: isOnGrid ? 0.45 : 1,
        cursor: isOnGrid ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
      }}
      {...attributes}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all select-none"
    >
      <span {...listeners} className="shrink-0" style={{ color: 'rgba(237,240,254,0.35)' }}>
        <GripVertical size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate text-sigma-ice">{widget.label}</p>
        <p className="text-xs truncate" style={{ color: 'rgba(237,240,254,0.4)' }}>{widget.category}</p>
      </div>
      {isOnGrid && <CheckCircle2 size={12} className="text-sigma-accent shrink-0" />}
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
  const { user }          = useAuth();
  const { customWidgets } = useWidgetBank();
  const { lang }          = useLanguage();
  const isHe              = lang === 'he';

  // ── Built-in widgets: grouped by category ─────────────────────────────────
  const categories = [...new Set(widgets.map(w => w.category))];

  // ── Custom widgets: "approved" + "yours" ──────────────────────────────────
  const approvedWidgets = customWidgets.filter(w => w.status === 'approved');
  const userWidgets     = customWidgets.filter(
    w => w.created_by === user?.username,
  );

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
