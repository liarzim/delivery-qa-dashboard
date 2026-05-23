import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { store } from '../lib/store';
import WidgetBank from '../components/WidgetBank';
import DashboardRGL from '../components/DashboardRGL';
import SectionHeader from '../components/SectionHeader';
import SubDashboardTabs from '../components/SubDashboardTabs';
import WidgetSlotContent from '../components/WidgetSlotContent';
import CustomWidgetRenderer from '../components/CustomWidgetRenderer';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useRGLLayout } from '../hooks/useRGLLayout';
import { AlertCircle, Layers } from 'lucide-react';
import { ALL_WIDGETS, DEFAULT_SUB_RGL_LAYOUT } from '../constants/widgets';

export default function SubDashboardPage() {
  const { id }   = useParams();
  const { lang, t } = useLanguage();

  const { delivery, qa }    = useData();
  const { settings }        = useSettings();
  const { isOpen: bankOpen, toggle: toggleBank, setIsOpen: setBankOpen, customWidgets } = useWidgetBank();

  const [subDash, setSubDash] = useState(() => {
    const all = store.get('sub_dashboards', []);
    return all.find(d => String(d.id) === String(id)) || null;
  });

  // Reload metadata when navigating between sub-dashboards
  useEffect(() => {
    const all = store.get('sub_dashboards', []);
    setSubDash(all.find(d => String(d.id) === String(id)) || null);
  }, [id]);

  // Each sub-dashboard gets its own layout key in LayoutContext: "sub_1", "sub_2", etc.
  const rglLayout = useRGLLayout(`sub_${id}`, DEFAULT_SUB_RGL_LAYOUT);

  // Build widgetMap for DashboardRGL: maps each ALL_WIDGETS id → rendered content
  const widgetMap = {};
  for (const w of ALL_WIDGETS) {
    const displayW = lang === 'he' ? { ...w, label: w.label_he || w.label } : w;
    widgetMap[w.id] = (
      <WidgetSlotContent
        widget={displayW}
        delivery={delivery}
        qa={qa}
        settings={settings}
      />
    );
  }

  // renderCustom: called by DashboardRGL for items whose id starts with "custom_"
  const renderCustom = useCallback((widgetId) => {
    const numId = String(widgetId).replace('custom_', '');
    const cw    = (customWidgets || []).find(w => String(w.id) === numId);
    if (!cw) {
      return (
        <div className="card flex items-center justify-center text-xs"
          style={{ color: 'rgba(237,240,254,0.4)' }}>
          Widget not found
        </div>
      );
    }
    return (
      <CustomWidgetRenderer
        widgetId={numId}
        config={cw.config || {}}
        name={cw.name}
      />
    );
  }, [customWidgets]);

  if (!subDash) {
    return (
      <div className="flex items-center gap-2 text-sm rounded-lg p-4"
        style={{ color: '#F36059', backgroundColor: 'rgba(243,96,89,0.1)', border: '1px solid rgba(243,96,89,0.25)' }}>
        <AlertCircle size={16} /> Dashboard not found.
      </div>
    );
  }

  const title          = lang === 'he' && subDash.name_he ? subDash.name_he : subDash.name_en;
  const activeWidgetIds = rglLayout.rglItems.map(item => item.i);

  return (
    <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">

      <WidgetBank
        widgets={ALL_WIDGETS}
        activeWidgetIds={activeWidgetIds}
        isOpen={bankOpen}
        onClose={() => setBankOpen(false)}
        style={{ order: 2 }}
      />

      <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
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
            <button
              onClick={toggleBank}
              className="flex items-center gap-1.5 btn-secondary text-xs py-1.5"
              style={bankOpen ? { backgroundColor: 'var(--p-accent)', color: '#fff', borderColor: 'var(--p-accent)' } : {}}
            >
              <Layers size={13} />
              {bankOpen ? 'Hide Widgets' : 'Add Widgets'}
            </button>
          }
        />

        <DashboardRGL
          rglLayout={rglLayout}
          widgetMap={widgetMap}
          renderCustom={renderCustom}
        />
      </div>
    </div>
  );
}
