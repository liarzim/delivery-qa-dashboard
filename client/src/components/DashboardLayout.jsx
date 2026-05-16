import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, EyeOff, Eye, LayoutGrid, Check, RotateCcw, Star } from 'lucide-react';

// ── Single draggable widget wrapper ──────────────────────────────────────────
function SortableWidget({ id, label, children, editMode, onHide }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {editMode && (
        <div
          className="flex items-center justify-between px-3 py-1.5 mb-1 rounded-lg"
          style={{ backgroundColor: 'rgba(63,100,247,0.15)', border: '1px dashed rgba(63,100,247,0.4)' }}
        >
          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical size={14} style={{ color: 'rgba(237,240,254,0.4)' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(237,240,254,0.6)' }}>{label}</span>
          </div>
          <button
            onClick={() => onHide(id)}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
            style={{ color: '#F9BD33', backgroundColor: 'rgba(249,189,51,0.1)' }}
          >
            <EyeOff size={11} /> Hide
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Main layout container ─────────────────────────────────────────────────────
export default function DashboardLayout({
  dashboardId, useLayoutHook, widgetMap, children,
}) {
  const {
    visibleWidgets, hiddenWidgets,
    editMode, setEditMode,
    move, hide, show,
    isAdmin, hasCustom,
    setAsMaster, resetToMaster,
  } = useLayoutHook;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = visibleWidgets.map(w => w.id);
    const from = ids.indexOf(active.id);
    const to   = ids.indexOf(over.id);
    if (from !== -1 && to !== -1) move(from, to);
  }

  return (
    <div className="space-y-6">
      {/* Layout toolbar */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {editMode && hiddenWidgets.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>Hidden:</span>
            {hiddenWidgets.map(w => (
              <button
                key={w.id}
                onClick={() => show(w.id)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(84,224,117,0.1)', color: '#54E075', border: '1px solid rgba(84,224,117,0.3)' }}
              >
                <Eye size={10} /> {w.label}
              </button>
            ))}
          </div>
        )}

        {editMode && isAdmin && (
          <button
            onClick={async () => { await setAsMaster(); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(249,189,51,0.12)', color: '#F9BD33', border: '1px solid rgba(249,189,51,0.3)' }}
          >
            <Star size={12} /> Set as Default
          </button>
        )}

        {hasCustom && !editMode && (
          <button
            onClick={resetToMaster}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.25)' }}
          >
            <RotateCcw size={12} /> Reset to Default
          </button>
        )}

        <button
          onClick={() => setEditMode(e => !e)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={editMode
            ? { backgroundColor: 'rgba(84,224,117,0.15)', color: '#54E075', border: '1px solid rgba(84,224,117,0.35)' }
            : { backgroundColor: 'rgba(63,100,247,0.12)', color: 'rgba(237,240,254,0.7)', border: '1px solid rgba(63,100,247,0.3)' }}
        >
          {editMode ? <><Check size={12} /> Done</> : <><LayoutGrid size={12} /> Edit Layout</>}
        </button>
      </div>

      {/* Widgets */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={visibleWidgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {visibleWidgets.map(w => (
              <SortableWidget
                key={w.id}
                id={w.id}
                label={w.label}
                editMode={editMode}
                onHide={hide}
              >
                {widgetMap[w.id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {children}
    </div>
  );
}
