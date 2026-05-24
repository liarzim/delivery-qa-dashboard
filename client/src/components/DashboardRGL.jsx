/**
 * DashboardRGL — free-form 12-column grid for Delivery and QA dashboards.
 *
 * Props:
 *   rglLayout        — from useRGLLayout (the hook result object)
 *   widgetMap        — { [widgetId]: <JSX> }  built-in widgets rendered by caller
 *   renderCustom     — (widgetId: string) => <JSX>  called for 'custom_*' items
 *   suppressToolbar  — boolean (default false): when true the built-in toolbar
 *                      (Edit Layout / Set as Default / Reset to Default) is not
 *                      rendered. Used by Overview which hosts those controls in
 *                      its own SectionHeader.
 */
import React, { useRef, useState, useEffect } from 'react';
import ReactGridLayout from 'react-grid-layout';
import { useEditMode } from '../context/EditModeContext';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, Check, RotateCcw, Star, X } from 'lucide-react';

const COL_COUNT  = 12;
const ROW_HEIGHT = 80;   // px per grid row unit
const MARGIN     = [12, 12]; // [horizontal, vertical] gap in px

/**
 * Hook: measures the pixel width of a container element via ResizeObserver.
 * react-grid-layout v2 requires an explicit `width` prop on the default export
 * (it no longer includes a built-in ResizeObserver).
 */
function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(1200); // sensible fallback until measured

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setWidth(w);
    });
    obs.observe(ref.current);
    // Seed immediately from current size
    setWidth(ref.current.getBoundingClientRect().width || 1200);
    return () => obs.disconnect();
  }, []);

  return { ref, width };
}

export default function DashboardRGL({ rglLayout, widgetMap, renderCustom, suppressToolbar = false }) {
  const { editMode, toggleEditMode } = useEditMode();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const { ref: gridRef, width: gridWidth } = useContainerWidth();

  const {
    rglItems, onLayoutChange,
    removeWidget, setAsMaster, resetToMaster,
    hasCustom, addWidget,
  } = rglLayout;

  // ── Toast notification (Set as Default / Reset to Default feedback) ──────
  const [toast, setToast] = useState(null); // { text: string, type: 'success' | 'error' }
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const showToast = (text, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleDrop = (_layout, item, e) => {
    const widgetId = e.dataTransfer?.getData('widgetId');
    if (widgetId) {
      addWidget(widgetId, { x: item.x, y: item.y, w: item.w, h: item.h });
    }
  };

  const canEdit = editMode && isAdmin;

  // ── Render each grid item's content ───────────────────────────────────────
  const renderSlot = (itemId) => {
    if (String(itemId).startsWith('custom_') && renderCustom) {
      return renderCustom(itemId);
    }
    return widgetMap[itemId] ?? (
      <div className="flex items-center justify-center h-full"
        style={{ color: 'rgba(237,240,254,0.3)', fontSize: 12 }}>
        Unknown widget: {itemId}
      </div>
    );
  };

  return (
    <div>
      {/* Toolbar — hidden when suppressToolbar=true (caller hosts controls externally) */}
      {!suppressToolbar && (
        <div className="flex items-center justify-end gap-2 flex-wrap mb-4">
          {/* Toast feedback pill */}
          {toast && (
            <span className="text-xs px-2 py-1 rounded-md"
              style={{
                backgroundColor: toast.type === 'success' ? 'rgba(84,224,117,0.15)' : 'rgba(243,96,89,0.1)',
                color:           toast.type === 'success' ? '#54E075' : '#F36059',
                border: `1px solid ${toast.type === 'success' ? 'rgba(84,224,117,0.35)' : 'rgba(243,96,89,0.25)'}`,
              }}>
              {toast.text}
            </span>
          )}
          {canEdit && (
            <button
              onClick={async () => {
                try   { await setAsMaster();   showToast('Default layout saved'); }
                catch { showToast('Save failed', 'error'); }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(249,189,51,0.12)', color: '#F9BD33', border: '1px solid rgba(249,189,51,0.3)' }}
            >
              <Star size={12} /> Set as Default
            </button>
          )}
          {hasCustom && !editMode && (
            <button
              onClick={async () => {
                try   { await resetToMaster(); showToast('Layout reset'); }
                catch { showToast('Reset failed', 'error'); }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.25)' }}
            >
              <RotateCcw size={12} /> Reset to Default
            </button>
          )}
          {isAdmin && (
            <button
              onClick={toggleEditMode}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={editMode
                ? { backgroundColor: 'rgba(84,224,117,0.15)', color: '#54E075', border: '1px solid rgba(84,224,117,0.35)' }
                : { backgroundColor: 'rgba(63,100,247,0.12)', color: 'rgba(237,240,254,0.7)', border: '1px solid rgba(63,100,247,0.3)' }}
            >
              {editMode ? <><Check size={12} /> Done</> : <><LayoutGrid size={12} /> Edit Layout</>}
            </button>
          )}
        </div>
      )}

      {/* Grid — ref div measures container width for RGL v2 */}
      <div ref={gridRef}>
      <ReactGridLayout
        className="layout"
        layout={rglItems}
        width={gridWidth}
        cols={COL_COUNT}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        isDraggable={canEdit}
        isResizable={true}
        isDroppable={canEdit}
        droppingItem={{ i: '__dropping__', w: 6, h: 6 }}
        onDrop={handleDrop}
        onLayoutChange={onLayoutChange}
        draggableHandle=".rgl-drag-handle"
        draggableCancel=".rgl-drag-cancel"
        style={{ minHeight: 200 }}
      >
        {rglItems.map((item) => (
          <div
            key={item.i}
            style={{
              position: 'relative',          // ← containing block for resize handle
              outline: canEdit ? '1px dashed rgba(63,100,247,0.3)' : 'none',
              borderRadius: 12,
            }}
          >
            {/* Drag handle — visible only in edit mode */}
            {canEdit && (
              <div
                className="rgl-drag-handle flex items-center justify-between px-3 py-1.5 select-none cursor-grab active:cursor-grabbing"
                style={{
                  backgroundColor: 'rgba(63,100,247,0.18)',
                  borderBottom: '1px dashed rgba(63,100,247,0.3)',
                  borderRadius: '12px 12px 0 0',   // ← top corners rounded
                }}
              >
                <span className="text-xs font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>
                  {item.i}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeWidget(item.i); }}
                  className="rgl-drag-cancel p-0.5 rounded hover:bg-red-500/20"
                  style={{ color: 'rgba(243,96,89,0.7)' }}
                  title="Remove from grid"
                >
                  <X size={11} />
                </button>
              </div>
            )}
            {/* Widget content — overflow:hidden lives here, not on outer div */}
            <div style={{
              height: canEdit ? 'calc(100% - 32px)' : '100%',
              overflow: 'hidden',
              borderRadius: canEdit ? '0 0 12px 12px' : 12,  // ← bottom-only in edit mode
            }}>
              {renderSlot(item.i)}
            </div>
          </div>
        ))}
      </ReactGridLayout>
      </div>
    </div>
  );
}
