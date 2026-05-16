/**
 * TableColumnPicker — drag-to-reorder + eye-toggle column selector for table view.
 * columns: { key: string, visible: boolean }[]
 * onChange: (columns) => void
 */
import React from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

function SortableColumn({ col, onToggle }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        borderRadius: 6,
        marginBottom: 3,
        backgroundColor: isDragging ? 'rgba(63,100,247,0.18)' : 'rgba(20,65,245,0.07)',
        border: `1px solid ${isDragging ? 'rgba(63,100,247,0.5)' : 'rgba(20,65,245,0.2)'}`,
        userSelect: 'none',
      }}
    >
      {/* drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: 'rgba(237,240,254,0.25)', lineHeight: 0, flexShrink: 0 }}
      >
        <GripVertical size={12} />
      </span>

      {/* column name */}
      <span
        className="flex-1 text-xs truncate"
        style={{ color: col.visible ? 'rgba(237,240,254,0.85)' : 'rgba(237,240,254,0.3)' }}
        title={col.key}
      >
        {col.key}
      </span>

      {/* visibility toggle */}
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={() => onToggle(col.key)}
        style={{
          lineHeight: 0,
          padding: 2,
          borderRadius: 4,
          color: col.visible ? 'var(--p-accent)' : 'rgba(237,240,254,0.2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        title={col.visible ? 'Hide column' : 'Show column'}
      >
        {col.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
    </div>
  );
}

export default function TableColumnPicker({ columns, onChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const from = columns.findIndex(c => c.key === active.id);
    const to   = columns.findIndex(c => c.key === over.id);
    onChange(arrayMove(columns, from, to));
  }

  function handleToggle(key) {
    onChange(columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  }

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: 'rgba(237,240,254,0.35)' }}>
          {visibleCount}/{columns.length} visible · drag to reorder
        </span>
        <div className="flex gap-2">
          <button
            className="text-xs"
            style={{ color: 'var(--p-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => onChange(columns.map(c => ({ ...c, visible: true })))}
          >All</button>
          <button
            className="text-xs"
            style={{ color: 'rgba(237,240,254,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => onChange(columns.map(c => ({ ...c, visible: false })))}
          >None</button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map(c => c.key)} strategy={verticalListSortingStrategy}>
          <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 2 }}>
            {columns.map(col => (
              <SortableColumn key={col.key} col={col} onToggle={handleToggle} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
