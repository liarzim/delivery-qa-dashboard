import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLayoutContext } from '../context/LayoutContext';

export function useLayout(dashboardId, allWidgets) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const defaultOrder = allWidgets.map(w => w.id);

  const {
    getLayout, setLayout,
    getMaster, setAsMaster: ctxSetAsMaster,
    resetToMaster: ctxResetToMaster,
    hasCustom,
  } = useLayoutContext();

  // Derive order/hidden from context (falls back to master, then default)
  const saved  = getLayout(dashboardId);
  const masterLayout = getMaster(dashboardId);

  const order  = saved?.order  ?? masterLayout?.order  ?? defaultOrder;
  const hidden = saved?.hidden ?? masterLayout?.hidden ?? [];

  const [editMode, setEditMode] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const move = useCallback((fromIndex, toIndex) => {
    const ids = [
      ...order.filter(id => !hidden.includes(id)),
      ...defaultOrder.filter(id => !order.includes(id) && !hidden.includes(id)),
    ];
    const next = [...ids];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setLayout(dashboardId, { order: next, hidden });
  }, [dashboardId, order, hidden, defaultOrder, setLayout]);

  const hide = useCallback((id) => {
    const next = hidden.includes(id) ? hidden : [...hidden, id];
    setLayout(dashboardId, { order, hidden: next });
  }, [dashboardId, order, hidden, setLayout]);

  const show = useCallback((id) => {
    const next = hidden.filter(h => h !== id);
    setLayout(dashboardId, { order, hidden: next });
  }, [dashboardId, order, hidden, setLayout]);

  const setAsMaster = useCallback(() => {
    return ctxSetAsMaster(dashboardId, { order, hidden });
  }, [ctxSetAsMaster, dashboardId, order, hidden]);

  const resetToMaster = useCallback(() => {
    setEditMode(false);
    return ctxResetToMaster(dashboardId);
  }, [ctxResetToMaster, dashboardId]);

  // ── Derived widget lists ───────────────────────────────────────────────────
  const visibleWidgets = [
    ...order.filter(id => !hidden.includes(id)),
    ...defaultOrder.filter(id => !order.includes(id) && !hidden.includes(id)),
  ]
    .map(id => allWidgets.find(w => w.id === id))
    .filter(Boolean);

  const hiddenWidgets = allWidgets.filter(w => hidden.includes(w.id));

  return {
    visibleWidgets, hiddenWidgets,
    editMode, setEditMode,
    move, hide, show,
    isAdmin, hasCustom,
    setAsMaster, resetToMaster,
  };
}
