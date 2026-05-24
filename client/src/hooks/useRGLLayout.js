/**
 * useRGLLayout — react-grid-layout state, persisted via LayoutContext.
 *
 * defaultItems  [{i, x, y, w, h}]  — factory layout for built-in widgets
 * Returns:
 *   rglItems         [{i, x, y, w, h}]  current layout
 *   onLayoutChange   (newLayout) => void   called by RGL on drag/resize
 *   addWidget        (widgetId, {x,y,w,h}?) => void  add a custom widget
 *   removeWidget     (widgetId) => void
 *   setAsMaster      () => Promise<void>  admin: snapshot to master
 *   resetToMaster    () => Promise<void>  user: revert to master/default
 *   hasCustom        bool
 */
import { useCallback, useMemo } from 'react';
import { useLayoutContext } from '../context/LayoutContext';

export function useRGLLayout(dashboardId, defaultItems) {
  const {
    getLayout, setLayout,
    getMaster, setAsMaster: ctxSetMaster,
    resetToMaster: ctxResetMaster,
    hasCustom,
  } = useLayoutContext();

  // Merge saved positions with defaults.
  // If the user has a saved layout, respect it exactly — including deliberate
  // widget removals.  Only append "new default" items when falling back to the
  // master or the hard-coded default (i.e. the user has never saved a layout).
  const rglItems = useMemo(() => {
    const saved  = getLayout(dashboardId)?.rglItems;
    const master = getMaster(dashboardId)?.rglItems;

    if (saved) {
      // User has a persisted layout — use it verbatim so removed widgets stay gone.
      return saved;
    }

    // No user layout yet: use master or default, then append any brand-new defaults.
    const base = master || defaultItems;
    const knownIds = new Set(base.map(it => it.i));
    const extra = defaultItems.filter(it => !knownIds.has(it.i));
    return [...base, ...extra];
  }, [dashboardId, getLayout, getMaster, defaultItems]);

  const save = useCallback((items) => {
    setLayout(dashboardId, { rglItems: items });
  }, [dashboardId, setLayout]);

  const onLayoutChange = useCallback((newLayout) => {
    // newLayout from RGL includes the __dropping__ placeholder — filter it
    save(newLayout.filter(it => it.i !== '__dropping__'));
  }, [save]);

  const addWidget = useCallback((widgetId, placement = {}) => {
    if (rglItems.some(it => it.i === String(widgetId))) return; // already present
    // Find a y position below all existing items
    const maxY = rglItems.reduce((m, it) => Math.max(m, it.y + it.h), 0);
    const newItem = {
      i: String(widgetId),
      x: placement.x ?? 0,
      y: placement.y ?? maxY,
      w: placement.w ?? 6,
      h: placement.h ?? 6,
      minW: 2,
      minH: 3,
    };
    save([...rglItems, newItem]);
  }, [rglItems, save]);

  const removeWidget = useCallback((widgetId) => {
    save(rglItems.filter(it => it.i !== String(widgetId)));
  }, [rglItems, save]);

  const setAsMaster = useCallback(() => {
    return ctxSetMaster(dashboardId, { rglItems });
  }, [ctxSetMaster, dashboardId, rglItems]);

  const resetToMaster = useCallback(() => {
    return ctxResetMaster(dashboardId);
  }, [ctxResetMaster, dashboardId]);

  return {
    rglItems, onLayoutChange,
    addWidget, removeWidget,
    setAsMaster, resetToMaster,
    hasCustom,
  };
}
