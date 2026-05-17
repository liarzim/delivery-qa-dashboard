/**
 * GridDropZone — a droppable container that must be rendered INSIDE a DndContext.
 *
 * useDroppable (and all @dnd-kit hooks) require the DndContext React context,
 * so they must be called in a component that is a descendant of <DndContext>,
 * not in the same component that renders <DndContext>.
 *
 * Usage: wrap the custom-widget grid (empty state + filled state) with this
 * component so bank→grid drops land even when the grid has no items yet.
 */
import { useDroppable } from '@dnd-kit/core';

export default function GridDropZone({ children, className, style }) {
  const { setNodeRef } = useDroppable({ id: 'grid-drop-zone' });
  return (
    <div ref={setNodeRef} className={className} style={style}>
      {children}
    </div>
  );
}
