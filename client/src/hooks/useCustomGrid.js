/**
 * useCustomGrid — manages a per-page custom-widget drag-drop grid.
 *
 * storageKey: string — unique localStorage key for this page's custom layout
 *   e.g. 'custom_grid_delivery', 'custom_grid_qa'
 */
import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { ALL_WIDGETS } from '../constants/widgets';

export function useCustomGrid(storageKey, lang = 'en', customWidgets = []) {
  const [gridWidgetIds, setGridWidgetIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; }
    catch { return []; }
  });
  const [activeId, setActiveId] = useState(null);

  const save = useCallback((ids) => {
    localStorage.setItem(storageKey, JSON.stringify(ids));
  }, [storageKey]);

  const resolveWidget = useCallback((wid) => {
    const builtin = ALL_WIDGETS.find(w => w.id === wid);
    if (builtin) {
      return lang === 'he'
        ? { ...builtin, label: builtin.label_he || builtin.label }
        : builtin;
    }
    if (String(wid).startsWith('custom_')) {
      const numId = String(wid).replace('custom_', '');
      const cw    = (customWidgets || []).find(w => String(w.id) === numId);
      if (cw) {
        const cfg  = cw.config || {};
        const isHe = lang === 'he';
        return {
          id:     wid,
          label:  isHe && cfg.name_he ? cfg.name_he : (cw.name || 'Custom'),
          config: cfg,
          status: cw.status,
        };
      }
      return { id: wid, label: 'Custom Widget', config: {} };
    }
    return null;
  }, [lang, customWidgets]);

  const gridWidgets  = gridWidgetIds.map(resolveWidget).filter(Boolean);
  const activeWidget = activeId
    ? (() => {
        const raw = String(activeId).startsWith('bank-')
          ? String(activeId).replace('bank-', '')
          : activeId;
        return resolveWidget(raw);
      })()
    : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    if (String(active.id).startsWith('bank-')) {
      const widgetId = String(active.id).replace('bank-', '');
      if (!gridWidgetIds.includes(widgetId)) {
        const newIds = [...gridWidgetIds, widgetId];
        setGridWidgetIds(newIds);
        save(newIds);
      }
      return;
    }
    // Ignore drops onto the drop-zone sentinel (not a real widget)
    if (over.id === 'grid-drop-zone') return;
    if (active.id !== over.id) {
      const oldIndex = gridWidgetIds.indexOf(active.id);
      const newIndex = gridWidgetIds.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newIds = arrayMove(gridWidgetIds, oldIndex, newIndex);
        setGridWidgetIds(newIds);
        save(newIds);
      }
    }
  };

  const removeWidget = (wid) => {
    const newIds = gridWidgetIds.filter(w => w !== wid);
    setGridWidgetIds(newIds);
    save(newIds);
  };

  return {
    gridWidgetIds,
    gridWidgets,
    activeWidget,
    handleDragStart,
    handleDragEnd,
    removeWidget,
  };
}
