# Widget & Layout Management Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add widget bank edit buttons (Feature 1), migrate sub-dashboards to react-grid-layout for free-form placement (Feature 2), and fix per-dashboard default template reset so saving/resetting one dashboard's layout doesn't corrupt others (Feature 3).

**Architecture:** Feature 1 adds navigation from `WidgetBank.jsx` to the existing `/widget-builder/:id` route. Feature 2 replaces the @dnd-kit CSS grid in `SubDashboardPage.jsx` with `DashboardRGL` + `useRGLLayout`, which requires extracting the switch-case widget renderer from `GridWidget.jsx` into a shared `WidgetSlotContent.jsx`. Feature 3 fixes a data-loss bug in `LayoutContext.resetToMaster` where the current DELETE call wipes all dashboards instead of just the one being reset. No server-side schema changes are required.

**Tech Stack:** React 18, react-grid-layout, react-router-dom, lucide-react, Express + SQLite (existing), Vite

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Create | `client/src/components/WidgetSlotContent.jsx` | Extracted widget content renderer (switch-case over widget IDs), no dnd-kit dependency |
| Modify | `client/src/components/GridWidget.jsx` | Import `WidgetSlotContent`, remove duplicated `WidgetContent` inner function |
| Modify | `client/src/components/WidgetBank.jsx` | Add `Pencil` import, `useNavigate`, `onEdit` prop to `BankItem`, edit button in item row |
| Modify | `client/src/constants/widgets.js` | Add `DEFAULT_SUB_RGL_LAYOUT` (RGL-format default for sub-dashboards) |
| Modify | `client/src/pages/SubDashboardPage.jsx` | Remove @dnd-kit, use `useRGLLayout` + `DashboardRGL` + `WidgetSlotContent` |
| Modify | `client/src/context/LayoutContext.jsx` | Fix `resetToMaster` to PUT without the reset dashboard instead of DELETE all |

---

## Task 1: Extract WidgetSlotContent.jsx

**Why this first:** `GridWidget.jsx` contains a `WidgetContent` inner function with 100+ lines of switch-case rendering. Both the updated `GridWidget` and the new `SubDashboardPage` need this logic. Extracting it first keeps Tasks 2–4 clean.

**Files:**
- Create: `client/src/components/WidgetSlotContent.jsx`
- Modify: `client/src/components/GridWidget.jsx`

- [ ] **Step 1: Create WidgetSlotContent.jsx**

Create `client/src/components/WidgetSlotContent.jsx` with this exact content (copied from `GridWidget.jsx`'s inner `WidgetContent` function and updated to a named default export):

```jsx
import React from 'react';
import KpiCard from './KpiCard';
import TrafficLightWidget from './TrafficLightWidget';
import GaugeChart from './GaugeChart';
import CustomWidgetRenderer from './CustomWidgetRenderer';
import { getTrafficLight, getLightHex } from '../utils/thresholds';

export default function WidgetSlotContent({ widget, delivery, qa, settings }) {
  const s = settings || {};
  const latestDelivery = delivery?.piMetrics?.[delivery.piMetrics.length - 1] || {};
  const latestQA = qa?.piMetrics?.[qa.piMetrics.length - 1] || {};

  const th = {
    reopenY:    parseFloat(s.reopen_yellow    || 5),
    reopenR:    parseFloat(s.reopen_red       || 10),
    rejectedY:  parseFloat(s.rejected_yellow  || 5),
    rejectedR:  parseFloat(s.rejected_red     || 10),
    escapingY:  parseFloat(s.escaping_yellow  || 3),
    escapingR:  parseFloat(s.escaping_red     || 7),
    commitY:    parseFloat(s.commitment_yellow || 80),
    commitR:    parseFloat(s.commitment_red   || 60),
  };

  switch (widget.id) {
    case 'committed-rate':
      return (
        <KpiCard
          label="Committed Completion Rate"
          value={latestDelivery.committedRate ?? '—'}
          unit="%"
          light={getTrafficLight(latestDelivery.committedRate, th.commitY, th.commitR, true)}
          sub={`${latestDelivery.committedDone ?? 0} / ${latestDelivery.totalCommitted ?? 0} committed`}
        />
      );
    case 'uncommitted-rate':
      return (
        <KpiCard
          label="Uncommitted Rate"
          value={latestDelivery.uncommittedRate ?? '—'}
          unit="%"
          light="neutral"
          sub={`${latestDelivery.uncommittedDone ?? 0} / ${latestDelivery.totalUncommitted ?? 0} not committed`}
        />
      );
    case 'overall-rate':
      return (
        <KpiCard
          label="Overall Completion Rate"
          value={latestDelivery.overallRate ?? '—'}
          unit="%"
          light={getTrafficLight(latestDelivery.overallRate, th.commitY, th.commitR, true)}
          sub={`${latestDelivery.totalDone ?? 0} / ${latestDelivery.totalFeatures ?? 0} features`}
        />
      );
    case 'avg-velocity':
      return (
        <KpiCard
          label="Average Velocity"
          value={delivery?.summary?.avgVelocity ?? '—'}
          unit=" items/PI"
          light="neutral"
        />
      );
    case 'throughput':
      return (
        <KpiCard
          label="Total Throughput"
          value={delivery?.summary?.totalThroughput ?? '—'}
          unit=" items"
          light="neutral"
        />
      );
    case 'committed-gauge':
      return (
        <div className="card flex flex-col items-center gap-2 py-4">
          <GaugeChart
            value={latestDelivery.committedRate || 0}
            color={getLightHex(getTrafficLight(latestDelivery.committedRate, th.commitY, th.commitR, true))}
            label="Committed Rate"
            size={130}
          />
        </div>
      );
    case 'reopen-pct':
      return (
        <TrafficLightWidget
          label="Reopen %"
          value={latestQA.reopenPct ?? 0}
          light={getTrafficLight(latestQA.reopenPct, th.reopenY, th.reopenR)}
          yellowThreshold={th.reopenY}
          redThreshold={th.reopenR}
        />
      );
    case 'rejected-pct':
      return (
        <TrafficLightWidget
          label="Rejected %"
          value={latestQA.rejectedPct ?? 0}
          light={getTrafficLight(latestQA.rejectedPct, th.rejectedY, th.rejectedR)}
          yellowThreshold={th.rejectedY}
          redThreshold={th.rejectedR}
        />
      );
    case 'escaping-pct':
      return (
        <TrafficLightWidget
          label="Escaping %"
          value={latestQA.escapingPct ?? 0}
          light={getTrafficLight(latestQA.escapingPct, th.escapingY, th.escapingR)}
          yellowThreshold={th.escapingY}
          redThreshold={th.escapingR}
        />
      );
    case 'reopen-density':
      return (
        <KpiCard
          label="Reopen Density"
          value={latestQA.reopenDensity ?? '—'}
          unit="%"
          light={getTrafficLight(
            latestQA.reopenDensity,
            parseFloat(s.reopen_density_yellow || 2),
            parseFloat(s.reopen_density_red   || 5),
          )}
          sub={`Capacity: ${latestQA.capacity ?? '—'}`}
        />
      );
    case 'escaping-density':
      return (
        <KpiCard
          label="Escaping Density"
          value={latestQA.escapingDensity ?? '—'}
          unit="%"
          light={getTrafficLight(
            latestQA.escapingDensity,
            parseFloat(s.escaping_density_yellow || 2),
            parseFloat(s.escaping_density_red   || 5),
          )}
          sub={`Capacity: ${latestQA.capacity ?? '—'}`}
        />
      );
    default: {
      if (widget.id?.toString().startsWith('custom_')) {
        const customId = widget.id.toString().replace('custom_', '');
        return (
          <div className="group h-full" style={{ minHeight: 160 }}>
            <CustomWidgetRenderer
              widgetId={customId}
              config={widget.config}
              name={widget.label}
            />
          </div>
        );
      }
      return (
        <div className="card flex items-center justify-center text-xs"
          style={{ color: 'rgba(237,240,254,0.4)' }}>
          {widget.label}
        </div>
      );
    }
  }
}
```

- [ ] **Step 2: Update GridWidget.jsx to use WidgetSlotContent**

In `client/src/components/GridWidget.jsx`:

Replace the import block at the top (add `WidgetSlotContent`, remove `KpiCard`, `TrafficLightWidget`, `GaugeChart` imports since they're now only used inside `WidgetSlotContent`):

```jsx
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Settings2 } from 'lucide-react';
import WidgetSlotContent from './WidgetSlotContent';
import EditableText from './EditableText';
import { useAuth } from '../context/AuthContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import WidgetDeepEditPanel from './WidgetDeepEditPanel';
```

Delete the entire `function WidgetContent(...)` block (lines 15–148 in the original file).

In the `GridWidget` component body, replace `<WidgetContent ... />` with `<WidgetSlotContent ... />`:

```jsx
      <WidgetSlotContent widget={widget} delivery={delivery} qa={qa} settings={settings} />
```

The updated `GridWidget` default export should look like this (full replacement after the imports):

```jsx
export default function GridWidget({ widget, delivery, qa, settings, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const { user }                = useAuth();
  const { refresh }             = useWidgetBank();
  const [deepEdit, setDeepEdit] = useState(false);
  const isAdmin                 = user?.role === 'Admin';
  const isCustom                = String(widget.id).startsWith('custom_');
  const customId                = isCustom ? String(widget.id).replace('custom_', '') : null;

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
```

- [ ] **Step 3: Verify the app still compiles**

```bash
cd client && npm run build 2>&1 | tail -20
```

Expected: build completes without errors. If you see `KpiCard is not defined` or similar, double-check that all KpiCard/TrafficLightWidget/GaugeChart imports were removed from GridWidget.jsx (they're now only in WidgetSlotContent.jsx).

- [ ] **Step 4: Commit**

```bash
git add client/src/components/WidgetSlotContent.jsx client/src/components/GridWidget.jsx
git commit -m "refactor: extract WidgetSlotContent from GridWidget for reuse in RGL sub-dashboards"
```

---

## Task 2: Add Edit Button to Widget Bank (Feature 1)

**What this does:** Adds a pencil icon to every custom widget item in the Widget Bank sidebar. Clicking it navigates to `/widget-builder/:id` (the existing full-page builder in edit mode). Admin sees the edit button on approved widgets; owners see it on their personal widgets.

**Files:**
- Modify: `client/src/components/WidgetBank.jsx`

- [ ] **Step 1: Update imports in WidgetBank.jsx**

Replace the existing import block at the top of `client/src/components/WidgetBank.jsx`:

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, CheckCircle2, X, Layers, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useLanguage } from '../context/LanguageContext';
import { widgetApi } from '../services/widgetApi';
```

- [ ] **Step 2: Add onEdit prop to BankItem**

Replace the `BankItem` function signature and its JSX (the non-confirming return block) with this updated version that adds the pencil button:

```jsx
function BankItem({ widget, isOnGrid, onDelete, onEdit }) {
  const [confirming, setConfirming] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('widgetId', String(widget.id));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const baseBg = isOnGrid
    ? 'rgba(20,65,245,0.04)'
    : 'rgba(20,65,245,0.08)';

  if (confirming) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg select-none"
        style={{ backgroundColor: 'rgba(243,96,89,0.12)', border: '1px solid rgba(243,96,89,0.4)' }}
      >
        <p className="text-xs flex-1 truncate" style={{ color: 'rgba(237,240,254,0.7)' }}>
          Delete &ldquo;{widget.label}&rdquo;?
        </p>
        <button
          onClick={() => { onDelete(widget.id); setConfirming(false); }}
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ backgroundColor: '#F36059', color: '#fff' }}
          title="Confirm delete"
        >✓</button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-1.5 py-0.5 rounded font-semibold"
          style={{ backgroundColor: 'rgba(237,240,254,0.1)', color: 'rgba(237,240,254,0.7)' }}
          title="Cancel"
        >✗</button>
      </div>
    );
  }

  return (
    <div
      draggable={!isOnGrid && !confirming}
      onDragStart={!isOnGrid ? handleDragStart : undefined}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all select-none"
      style={{
        backgroundColor: baseBg,
        border: isOnGrid
          ? '1px solid rgba(20,65,245,0.15)'
          : '1px solid rgba(20,65,245,0.2)',
        opacity: isOnGrid ? 0.45 : 1,
        cursor: isOnGrid ? 'not-allowed' : 'grab',
      }}
    >
      <span className="shrink-0" style={{ color: 'rgba(237,240,254,0.35)' }}>
        <GripVertical size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate text-sigma-ice">{widget.label}</p>
        <p className="text-xs truncate" style={{ color: 'rgba(237,240,254,0.4)' }}>{widget.category}</p>
      </div>
      {isOnGrid && <CheckCircle2 size={12} className="text-sigma-accent shrink-0" />}
      {onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(widget.id); }}
          className="shrink-0 p-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: 'rgba(63,100,247,0.9)' }}
          title="Edit widget"
        >
          <Pencil size={11} />
        </button>
      )}
      {onDelete && !isOnGrid && (
        <button
          onClick={e => { e.stopPropagation(); setConfirming(true); }}
          className="shrink-0 p-0.5 rounded opacity-40 hover:opacity-100 transition-opacity"
          style={{ color: '#F36059' }}
          title="Remove from bank"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add navigate and handleEdit to WidgetBank main component**

Inside the `WidgetBank` component, after the existing `const isAdmin = ...` line, add:

```jsx
  const navigate = useNavigate();

  function handleEdit(compositeId) {
    const numId = String(compositeId).replace('custom_', '');
    navigate(`/widget-builder/${numId}`);
  }
```

- [ ] **Step 4: Pass onEdit to the BankItem renders for custom widgets**

In the `approvedDisplay.map(...)` section, update to pass `onEdit` for admin only:

```jsx
{approvedDisplay.map(w => (
  <BankItem
    key={w.id}
    widget={w}
    isOnGrid={activeWidgetIds.includes(w.id)}
    onDelete={isAdmin ? handleAdminDelete : undefined}
    onEdit={isAdmin ? handleEdit : undefined}
  />
))}
```

In the `userDisplay.map(...)` section, always pass `onEdit` (these are always the current user's widgets):

```jsx
{userDisplay.map(w => (
  <BankItem
    key={w.id}
    widget={w}
    isOnGrid={activeWidgetIds.includes(w.id)}
    onEdit={handleEdit}
  />
))}
```

- [ ] **Step 5: Verify build**

```bash
cd client && npm run build 2>&1 | tail -20
```

Expected: no errors. If `useNavigate is not a function`, verify `react-router-dom` is imported at the top.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/WidgetBank.jsx
git commit -m "feat: add edit button to Widget Bank items (Feature 1)"
```

---

## Task 3: Add RGL Default Layout for Sub-Dashboards

**What this does:** Adds `DEFAULT_SUB_RGL_LAYOUT` to `widgets.js`, a react-grid-layout format default that matches the existing 6-widget `DEFAULT_LAYOUT` array. The `useRGLLayout` hook requires this format (`{ i, x, y, w, h }` per item).

**Files:**
- Modify: `client/src/constants/widgets.js`

- [ ] **Step 1: Add DEFAULT_SUB_RGL_LAYOUT**

Append to the end of `client/src/constants/widgets.js`:

```javascript
export const DEFAULT_SUB_RGL_LAYOUT = [
  { i: 'committed-rate',  x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'overall-rate',    x: 4, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'avg-velocity',    x: 8, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'reopen-pct',      x: 0, y: 5, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'rejected-pct',    x: 4, y: 5, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'escaping-pct',    x: 8, y: 5, w: 4, h: 5, minW: 2, minH: 3 },
];
```

These 6 widgets match the existing `DEFAULT_LAYOUT` array (`committed-rate`, `overall-rate`, `avg-velocity`, `reopen-pct`, `rejected-pct`, `escaping-pct`) and fill 3 columns × 2 rows (12 cols total).

- [ ] **Step 2: Commit**

```bash
git add client/src/constants/widgets.js
git commit -m "feat: add DEFAULT_SUB_RGL_LAYOUT for sub-dashboard RGL migration"
```

---

## Task 4: Migrate SubDashboardPage to react-grid-layout (Feature 2)

**What this does:** Replaces the @dnd-kit + CSS grid in `SubDashboardPage.jsx` with `DashboardRGL` + `useRGLLayout`. After this change, sub-dashboards support free-form drag/resize/drop from the Widget Bank (same UX as Delivery and QA), layout is persisted server-side via `LayoutContext` (key = `sub_${id}`), and the Admin sees the "Set as Default" toolbar button.

**Files:**
- Modify: `client/src/pages/SubDashboardPage.jsx`

- [ ] **Step 1: Replace SubDashboardPage.jsx with the new implementation**

Write the complete new file to `client/src/pages/SubDashboardPage.jsx`:

```jsx
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
```

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build 2>&1 | tail -30
```

Expected: clean build. Common failure modes:
- `DEFAULT_SUB_RGL_LAYOUT is not exported` → make sure Task 3 was completed
- `WidgetSlotContent is not a module` → make sure Task 1 was completed
- `useRGLLayout is not a function` → check import is `import { useRGLLayout } from '../hooks/useRGLLayout'`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/SubDashboardPage.jsx
git commit -m "feat: migrate sub-dashboards to react-grid-layout free-form grid (Feature 2)"
```

---

## Task 5: Fix Per-Dashboard Layout Reset (Feature 3)

**What this does:** The current `resetToMaster` in `LayoutContext.jsx` calls `DELETE /api/layout`, which removes the **entire** `user_layouts` record from SQLite. If a user has customized Delivery AND QA, resetting Delivery also destroys QA's customization. Fix: instead of deleting, PUT the layout without the reset dashboard's key, so other dashboards' customizations survive.

**Files:**
- Modify: `client/src/context/LayoutContext.jsx`

- [ ] **Step 1: Replace resetToMaster in LayoutContext.jsx**

Find the `resetToMaster` callback (lines ~85–95) and replace it entirely:

```javascript
  const resetToMaster = useCallback(async (dashboardId) => {
    const next = { ...allLayouts };
    delete next[dashboardId];
    store.set(CACHE_KEY, next);
    setAllLayouts(next);
    setHasCustom(Object.keys(next).length > 0);
    await apiFetch('/api/layout', {
      method: 'PUT',
      body: JSON.stringify({ layout: next }),
    });
  }, [allLayouts]);
```

The old version called `DELETE /api/layout` which wiped all dashboards and then set `hasCustom` to false. This version saves back the remaining layouts (without the reset dashboard) and computes `hasCustom` from the remaining keys.

- [ ] **Step 2: Verify build**

```bash
cd client && npm run build 2>&1 | tail -20
```

Expected: clean build with no TypeScript/lint errors in the context file.

- [ ] **Step 3: Commit**

```bash
git add client/src/context/LayoutContext.jsx
git commit -m "fix: resetToMaster now removes only the specified dashboard layout instead of deleting all user layouts (Feature 3)"
```

---

## Task 6: End-to-End Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
cd client && npm run dev
```

Then in a separate terminal:

```bash
cd server && node src/index.js
```

Navigate to `http://localhost:5173` (or whatever Vite's port is).

- [ ] **Step 2: Verify Feature 1 — Widget Bank Edit Button**

1. Log in as a user who has custom widgets (personal or approved)
2. Open the Widget Bank sidebar
3. Confirm the pencil icon appears next to custom widgets (approved section for admin, user's widgets section for any user)
4. Click the pencil on a custom widget → should navigate to `/widget-builder/<id>` with the widget config pre-loaded
5. Confirm built-in widgets (Delivery/QA sections) do NOT have the pencil icon

- [ ] **Step 3: Verify Feature 2 — Sub-Dashboard RGL Grid**

1. Navigate to a sub-dashboard (e.g., `/sub/1`)
2. Confirm the grid renders the 6 default widgets in a 3×2 layout (not the old CSS grid)
3. Click "Add Widgets" to open the bank
4. Drag a widget from the bank onto the grid → should drop at the drag location, not at the bottom
5. Enter "Edit Layout" mode (admin toolbar button)
6. Resize a widget by dragging its corner handle
7. Drag a widget to a new position
8. Click the X button on a widget → widget disappears from grid and becomes available in the bank again
9. Refresh the page → layout should persist (loaded from server via LayoutContext, not localStorage)

- [ ] **Step 4: Verify Feature 3 — Per-Dashboard Default Templates**

1. Log in as Admin
2. Go to Delivery dashboard, enter Edit Layout mode, drag widgets around
3. Click "Set as Default" → this is now the master for `delivery`
4. Go to QA dashboard, enter Edit Layout mode, drag widgets around
5. Click "Set as Default" → this is now the master for `qa` (the Delivery master is unaffected)
6. Log in as a different user (manager), navigate to Delivery → should see the admin's Delivery default
7. Navigate to QA → should see the admin's QA default
8. As manager, drag a widget on Delivery and reload → manager's custom layout is saved for Delivery only
9. Click "Reset to Default" on Delivery → Delivery reverts to admin's master; navigate to QA → QA custom layout is still intact (the bug fix)
10. Sub-dashboard: as admin, go to `/sub/1`, enter Edit Layout mode, arrange widgets, click "Set as Default" → next time a new user visits this sub-dashboard, they see the admin's arrangement

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Edit button on every bank widget | Task 2 |
| Edit opens Widget Builder in edit mode with config_json | Task 2 (navigate to `/widget-builder/:id`) |
| Save updates widget entity in SQLite | Already implemented — existing PUT `/api/widgets/:id` |
| All dashboards use free-form grid | Task 4 (sub-dashboards); Delivery & QA already use RGL |
| Drag from bank to exact location | Task 4 — DashboardRGL's `isDroppable` + `onDrop` |
| Remove widget → back to bank | Task 4 — DashboardRGL's remove button + `rglItems.map(i => i.i)` for activeWidgetIds |
| Admin "Save as Default" per dashboard | Task 3+4 — sub-dashboards now use `sub_${id}` as dashboardId, DashboardRGL toolbar provides the button |
| Per-dashboard default stored in DB | Existing `settings.master_layout` key stores `{ [dashboardId]: { rglItems } }` — already per-dashboard |
| New user loads dashboard default | Existing logic: GET `/api/layout` returns master when user has no custom layout |
| Reset only affects one dashboard | Task 5 (fix the DELETE-all bug) |

### Type/Name Consistency Check

- `DEFAULT_SUB_RGL_LAYOUT` defined in Task 3, imported in Task 4 ✓
- `WidgetSlotContent` created in Task 1, imported in Task 4 ✓
- `useRGLLayout` imported from `'../hooks/useRGLLayout'` — matches existing export `export function useRGLLayout(...)` ✓
- `renderCustom` prop on `DashboardRGL` — matches `DashboardRGL` prop declaration `renderCustom` ✓
- `rglLayout.rglItems` — matches `useRGLLayout` return shape `{ rglItems, ... }` ✓
- `CustomWidgetRenderer` receives `widgetId` as numeric string (without `custom_` prefix) — matches existing usage in GridWidget.jsx ✓
- `resetToMaster` receives `dashboardId` — matches all call sites in `useRGLLayout.js` ✓
