import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Settings2 } from 'lucide-react';
import WidgetSlotContent from './WidgetSlotContent';
import EditableText from './EditableText';
import { useAuth } from '../context/AuthContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import WidgetDeepEditPanel from './WidgetDeepEditPanel';


export default function GridWidget({ widget, delivery, qa, settings, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const { user }               = useAuth();
  const { refresh }            = useWidgetBank();
  const [deepEdit, setDeepEdit] = useState(false);
  const isAdmin                = user?.role === 'Admin';
  const isCustom               = String(widget.id).startsWith('custom_');
  const customId               = isCustom ? String(widget.id).replace('custom_', '') : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'rgba(237,240,254,0.3)' }}
      >
        <GripVertical size={14} />
      </div>

      <button
        onClick={() => onRemove(widget.id)}
        className="absolute top-2 right-2 z-10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-sigma-red"
        style={{ color: 'rgba(237,240,254,0.3)' }}
      >
        <X size={14} />
      </button>

      {/* Deep-edit gear icon — admin + custom widgets only */}
      {isAdmin && isCustom && (
        <button
          onClick={() => setDeepEdit(true)}
          className="absolute top-2 right-8 z-10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-sigma-accent"
          style={{ color: 'rgba(237,240,254,0.3)' }}
          title="Deep Edit (Admin)"
        >
          <Settings2 size={14} />
        </button>
      )}

      <div className="absolute bottom-1 left-2 right-2 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <EditableText
          textKey={`widget.${widget.id}.label`}
          fallback={widget.label || widget.id}
          className="text-xs pointer-events-auto"
          style={{ color: 'rgba(237,240,254,0.35)' }}
        />
      </div>

      <WidgetSlotContent widget={widget} delivery={delivery} qa={qa} settings={settings} />

      {/* Deep edit panel */}
      {deepEdit && isCustom && (
        <WidgetDeepEditPanel
          widgetId={customId}
          onClose={() => setDeepEdit(false)}
          onSaved={() => { refresh(); setDeepEdit(false); }}
        />
      )}
    </div>
  );
}
