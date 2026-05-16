import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { store } from '../lib/store';
import GridWidget from '../components/GridWidget';
import WidgetBank from '../components/WidgetBank';
import SectionHeader from '../components/SectionHeader';
import SubDashboardTabs from '../components/SubDashboardTabs';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { LayoutGrid, AlertCircle } from 'lucide-react';

const ALL_WIDGETS = [
  { id: 'committed-rate',    label: 'Committed Rate',      category: 'Delivery' },
  { id: 'uncommitted-rate',  label: 'Uncommitted Rate',    category: 'Delivery' },
  { id: 'overall-rate',      label: 'Overall Rate',        category: 'Delivery' },
  { id: 'avg-velocity',      label: 'Avg Velocity',        category: 'Delivery' },
  { id: 'throughput',        label: 'Throughput',          category: 'Delivery' },
  { id: 'committed-gauge',   label: 'Committed Gauge',     category: 'Delivery' },
  { id: 'reopen-pct',        label: 'Reopen %',            category: 'QA' },
  { id: 'rejected-pct',      label: 'Rejected %',          category: 'QA' },
  { id: 'escaping-pct',      label: 'Escaping %',          category: 'QA' },
  { id: 'reopen-density',    label: 'Reopen Density',      category: 'QA' },
  { id: 'escaping-density',  label: 'Escaping Density',    category: 'QA' },
];

const DEFAULT_LAYOUT = ['committed-rate', 'overall-rate', 'avg-velocity', 'reopen-pct', 'rejected-pct', 'escaping-pct'];

export default function SubDashboardPage() {
  const { id } = useParams();
  const { lang, t } = useLanguage();

  const { delivery, qa } = useData();
  const { settings } = useSettings();
  const { isOpen: bankOpen } = useWidgetBank();
  // Synchronous init from localStorage — no effect flash
  const [subDash, setSubDash] = useState(() => {
    const all = store.get('sub_dashboards', []);
    return all.find(d => String(d.id) === String(id)) || null;
  });
  const [gridWidgetIds, setGridWidgetIds] = useState(() => {
    const saved = localStorage.getItem(`sub_layout_${id}`);
    try { return JSON.parse(saved) || DEFAULT_LAYOUT; } catch { return DEFAULT_LAYOUT; }
  });
  const [activeId, setActiveId] = useState(null);

  // Reload when navigating between sub-dashboards
  useEffect(() => {
    const all = store.get('sub_dashboards', []);
    setSubDash(all.find(d => String(d.id) === String(id)) || null);
    const saved = localStorage.getItem(`sub_layout_${id}`);
    try { setGridWidgetIds(JSON.parse(saved) || DEFAULT_LAYOUT); } catch { setGridWidgetIds(DEFAULT_LAYOUT); }
  }, [id]);

  const saveLayout = useCallback((ids) => {
    const layoutKey = `sub_layout_${id}`;
    localStorage.setItem(layoutKey, JSON.stringify(ids));
  }, [id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const gridWidgets = gridWidgetIds.map(wid => ALL_WIDGETS.find(w => w.id === wid)).filter(Boolean);
  const activeWidget = activeId ? ALL_WIDGETS.find(w => w.id === activeId || `bank-${w.id}` === activeId) : null;

  const handleDragStart = ({ active }) => setActiveId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    if (String(active.id).startsWith('bank-')) {
      const widgetId = String(active.id).replace('bank-', '');
      if (!gridWidgetIds.includes(widgetId)) {
        const newIds = [...gridWidgetIds, widgetId];
        setGridWidgetIds(newIds);
        saveLayout(newIds);
      }
      return;
    }
    if (active.id !== over.id) {
      const oldIndex = gridWidgetIds.indexOf(active.id);
      const newIndex = gridWidgetIds.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newIds = arrayMove(gridWidgetIds, oldIndex, newIndex);
        setGridWidgetIds(newIds);
        saveLayout(newIds);
      }
    }
  };

  const removeWidget = (wid) => {
    const newIds = gridWidgetIds.filter(w => w !== wid);
    setGridWidgetIds(newIds);
    saveLayout(newIds);
  };

  const resetLayout = () => { setGridWidgetIds(DEFAULT_LAYOUT); saveLayout(DEFAULT_LAYOUT); };

  if (!subDash) return (
    <div className="flex items-center gap-2 text-sm rounded-lg p-4"
      style={{ color: '#F36059', backgroundColor: 'rgba(243,96,89,0.1)', border: '1px solid rgba(243,96,89,0.25)' }}>
      <AlertCircle size={16} /> Dashboard not found.
    </div>
  );

  const title = lang === 'he' && subDash.name_he ? subDash.name_he : subDash.name_en;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
        <WidgetBank widgets={ALL_WIDGETS} activeWidgetIds={gridWidgetIds} isOpen={bankOpen} />

        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {/* Show sibling tabs if this sub-dash has a parent */}
          {subDash?.parentId && (() => {
            const parentRoutes = { overview: '/', delivery: '/delivery', qa: '/qa' };
            const parentLabels = { overview: t('nav_overview'), delivery: t('nav_delivery'), qa: t('nav_qa') };
            const pp = parentRoutes[subDash.parentId];
            const pl = parentLabels[subDash.parentId] || subDash.parentId;
            return pp ? <SubDashboardTabs parentId={subDash.parentId} parentPath={pp} parentLabel={pl} /> : null;
          })()}
          <SectionHeader
            title={title}
            subtitle={t('overview_subtitle')}
            action={
              <button onClick={resetLayout} className="btn-secondary text-xs py-1.5">{t('overview_reset_layout')}</button>
            }
          />

          {gridWidgets.length === 0 ? (
            <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 gap-3"
              style={{ borderColor: 'rgba(120,150,255,0.2)', color: 'rgba(237,240,254,0.3)' }}>
              <LayoutGrid size={32} />
              <p className="text-sm">{t('overview_drop_hint')}</p>
            </div>
          ) : (
            <SortableContext items={gridWidgetIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-4">
                {gridWidgets.map(widget => (
                  <GridWidget key={widget.id} widget={widget} delivery={delivery} qa={qa} settings={settings} onRemove={removeWidget} />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeWidget && (
          <div className="px-3 py-2 rounded-lg border text-xs font-medium shadow-xl"
            style={{ borderColor: 'var(--p-accent)', backgroundColor: 'rgba(20,65,245,0.2)', color: '#93C5FD' }}>
            {activeWidget.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
