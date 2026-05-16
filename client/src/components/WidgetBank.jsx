import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, CheckCircle2 } from 'lucide-react';

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

export default function WidgetBank({ widgets, activeWidgetIds, isOpen, onToggle }) {
  const categories = [...new Set(widgets.map((w) => w.category))];

  return (
    <aside
      className={`shrink-0 transition-all duration-200 overflow-hidden ${isOpen ? 'w-56' : 'w-0'}`}
      style={{ borderInlineEnd: '1px solid var(--p-card-border)', backgroundColor: 'var(--p-sidebar-bg)' }}
    >
      <div className="w-56 h-full flex flex-col">
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(20,65,245,0.2)' }}>
          <p className="text-xs font-bold text-sigma-ice">Widget Bank</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(237,240,254,0.4)' }}>Drag to add to grid</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'rgba(237,240,254,0.35)' }}>{cat}</p>
              <div className="space-y-1.5">
                {widgets.filter((w) => w.category === cat).map((w) => (
                  <BankItem key={w.id} widget={w} isOnGrid={activeWidgetIds.includes(w.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
