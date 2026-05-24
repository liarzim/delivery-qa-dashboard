# Dashboard Edit & Resize Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three issues in the react-grid-layout dashboard: (1) "Edit Layout" button invisible on Overview for admins, (2) resize handles invisible on all dashboards, (3) no feedback when saving/resetting the default layout.

**Architecture:** Three targeted edits across three files. The CSS change (`index.css`) is fully independent. `DashboardRGL` gains a `suppressToolbar` boolean prop, a toast state, and a restructured tile wrapper that moves `overflow: hidden` inward. `MainDashboard` (Overview only) externalizes the edit controls into the `SectionHeader` action area using hooks it already has access to, passing `suppressToolbar={true}` to `DashboardRGL`.

**Tech Stack:** React 18, Vite, Tailwind CSS, react-grid-layout v2, react-resizable, Lucide React

---

## File Map

| File | What changes |
|------|-------------|
| `client/src/index.css` | Add `.react-resizable-handle` CSS override after the two `@import` lines |
| `client/src/components/DashboardRGL.jsx` | Add `suppressToolbar` prop; add toast state + handlers; wrap toolbar in `!suppressToolbar`; restructure tile wrapper |
| `client/src/pages/MainDashboard.jsx` | Add imports; add edit-mode hooks + toast state; replace `SectionHeader` `action` with full edit toolbar; pass `suppressToolbar={true}` |

---

## Task 1: index.css — Make resize handles visible

**Files:**
- Modify: `client/src/index.css` (after line 3, the `@import 'react-resizable/css/styles.css'` line)

### Context
`react-resizable`'s default handle background is a **near-black SVG** — invisible on the dark
dashboard theme. The handle element exists in the DOM (`<span class="react-resizable-handle-se">`)
but cannot be seen or clicked. We replace the background with an accent-coloured L-shaped
corner indicator rendered via `::after`.

- [ ] **Step 1: Add the CSS override in `client/src/index.css`**

Insert the following block immediately after line 3 (`@import 'react-resizable/css/styles.css';`),
before `@tailwind base`:

```css
/* ── react-resizable: accent corner grip (dark-theme override) ─────────────── */
.react-resizable-handle {
  background-image: none !important;
  background-color: transparent;
}
.react-resizable-handle::after {
  content: '';
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 9px;
  height: 9px;
  border-right: 2px solid rgba(99, 130, 255, 0.65);
  border-bottom: 2px solid rgba(99, 130, 255, 0.65);
  border-radius: 0 0 2px 0;
  pointer-events: none;
}
.react-resizable-handle:hover::after {
  border-color: rgba(99, 130, 255, 1);
}
```

The file head should now read:

```css
/* react-grid-layout */
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

/* ── react-resizable: accent corner grip (dark-theme override) ─────────────── */
.react-resizable-handle {
  background-image: none !important;
  background-color: transparent;
}
.react-resizable-handle::after {
  content: '';
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 9px;
  height: 9px;
  border-right: 2px solid rgba(99, 130, 255, 0.65);
  border-bottom: 2px solid rgba(99, 130, 255, 0.65);
  border-radius: 0 0 2px 0;
  pointer-events: none;
}
.react-resizable-handle:hover::after {
  border-color: rgba(99, 130, 255, 1);
}

@tailwind base;
```

- [ ] **Step 2: Verify in browser**

Start the dev server if not already running:
```
cd client && npm run dev
```

Navigate to the Delivery or QA dashboard (`/delivery` or `/qa`).
Hover over the **bottom-right corner** of any tile. You should see a small blue L-shaped
corner grip appear and brighten on hover. No edit mode required — `isResizable={true}`
means handles are always present.

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "fix: make react-resizable handles visible on dark theme"
```

---

## Task 2: DashboardRGL — suppressToolbar prop, tile wrapper fix, toast

**Files:**
- Modify: `client/src/components/DashboardRGL.jsx` (full file replacement shown below)

### Context
Three changes in one file:

1. **`suppressToolbar` prop** (default `false`): when `true`, the built-in toolbar div is
   not rendered. Used by Overview so it can host the controls in its own `SectionHeader`.

2. **Toast state**: `useState(null)` + `showToast(text, type)` + a timer ref to cancel
   stale timeouts. The toast spans across Set-as-Default and Reset-to-Default handlers.

3. **Tile wrapper restructure**: removes `overflow: hidden` from the outermost tile div
   (which was clipping the `react-resizable` handle at the rounded corner). Adds
   `position: relative` instead so the injected handle resolves against this div.
   `overflow: hidden` moves to the inner *content* div. The drag handle gets top border-radius;
   the content div gets bottom border-radius.

- [ ] **Step 1: Replace `client/src/components/DashboardRGL.jsx` with the following**

```jsx
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
          {canEdit && isAdmin && (
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
                  className="p-0.5 rounded hover:bg-red-500/20"
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
```

- [ ] **Step 2: Verify tile wrapper change in browser**

Navigate to `/delivery`. Without entering edit mode, hover the **bottom-right corner** of
any tile. Confirm the blue corner grip is now clearly visible (Task 1 already added the CSS;
this step confirms nothing is clipping it).

Enter edit mode (click "Edit Layout"). Confirm:
- Drag handles appear at the top of each tile with **rounded top corners**.
- The tile still looks fully rounded overall.
- Resize grips are visible at bottom-right corners.
- Dragging a tile works.
- Resizing a tile works (grab the bottom-right corner grip and drag).

- [ ] **Step 3: Verify toast feedback in browser**

Still on `/delivery` in edit mode:
- Click **"Set as Default"**. A green "Default layout saved" pill should appear in the
  toolbar for 3 seconds, then disappear.
- Click **"Done"**, then click **"Reset to Default"**. A green "Layout reset" pill should
  appear for 3 seconds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/DashboardRGL.jsx
git commit -m "fix: suppress toolbar prop, tile overflow fix, and save/reset toast feedback"
```

---

## Task 3: MainDashboard — externalize edit controls to SectionHeader

**Files:**
- Modify: `client/src/pages/MainDashboard.jsx` (targeted changes shown below — do NOT
  change the `OverviewLight` or `OverviewTrafficLights` functions; they are untouched)

### Context
The Overview page renders `DashboardRGL` inside a custom nested flex container that
prevents the built-in toolbar from being visible to the admin. We surface those same
controls directly in the `SectionHeader` `action` prop — which is rendered at the top of
the page content, above the traffic lights section, and is always visible.

`MainDashboard` already has `rglLayout` from `useRGLLayout`. It needs two more hooks
(`useEditMode`, `useAuth`), a toast state/timer, and new Lucide imports.

- [ ] **Step 1: Update the import block at the top of `client/src/pages/MainDashboard.jsx`**

Replace lines 1–15 (the existing imports) with:

```jsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi';
import WidgetBank from '../components/WidgetBank';
import DashboardRGL from '../components/DashboardRGL';
import SectionHeader from '../components/SectionHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import SubDashboardTabs from '../components/SubDashboardTabs';
import WidgetSlotContent from '../components/WidgetSlotContent';
import CustomWidgetRenderer from '../components/CustomWidgetRenderer';
import { Check, LayoutGrid, Layers, RotateCcw, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useEditMode } from '../context/EditModeContext';
import { useAuth } from '../context/AuthContext';
import { useRGLLayout } from '../hooks/useRGLLayout';
import { getTrafficLight, LIGHT_COLORS } from '../utils/thresholds';
import { ALL_WIDGETS, DEFAULT_OVERVIEW_RGL_LAYOUT } from '../constants/widgets';
```

Key changes vs. the original:
- Added `useRef, useState` to the React import.
- Added `Check, LayoutGrid, RotateCcw, Star` to the lucide import (kept `Layers`).
- Added `useEditMode` import from `'../context/EditModeContext'`.
- Added `useAuth` import from `'../context/AuthContext'`.

- [ ] **Step 2: Add new hooks and toast state inside the `MainDashboard` component**

The existing hook block starts at approximately line 191 (after `export default function MainDashboard() {`).
Add the four new lines immediately after the existing hook calls:

```jsx
export default function MainDashboard() {
  const { t, lang } = useLanguage();
  const { isOpen: bankOpen, toggle: toggleBank, setIsOpen: setBankOpen, customWidgets } = useWidgetBank();
  const { data: delivery, loading: dLoading } = useApi('/api/data/delivery');
  const { data: qa,       loading: qLoading } = useApi('/api/data/qa');
  const { data: settings }                     = useApi('/api/settings');

  const rglLayout = useRGLLayout('overview', DEFAULT_OVERVIEW_RGL_LAYOUT);

  // ── Edit-mode controls (externalized — DashboardRGL toolbar is suppressed) ──
  const { editMode, toggleEditMode } = useEditMode();
  const { user } = useAuth();
  const isAdmin  = user?.role === 'Admin';
  const canEdit  = editMode && isAdmin;

  // ── Toast notification for Set as Default / Reset to Default ─────────────
  const toastTimer = useRef(null);
  const [toast, setToast] = useState(null); // { text: string, type: 'success'|'error' }
  const showToast = useCallback((text, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ... rest of component unchanged below this point
```

- [ ] **Step 3: Replace the `SectionHeader` JSX in `MainDashboard`**

Find the existing `<SectionHeader ... action={...} />` block (approximately lines 253–268):

```jsx
        <SectionHeader
          title={t('overview_title')}
          titleKey="overview.title"
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
```

Replace it with:

```jsx
        <SectionHeader
          title={t('overview_title')}
          titleKey="overview.title"
          subtitle={t('overview_subtitle')}
          action={
            <div className="flex items-center gap-2 flex-wrap">
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
              {/* Set as Default — edit mode only */}
              {canEdit && (
                <button
                  onClick={async () => {
                    try   { await rglLayout.setAsMaster();   showToast('Default layout saved'); }
                    catch { showToast('Save failed', 'error'); }
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(249,189,51,0.12)', color: '#F9BD33', border: '1px solid rgba(249,189,51,0.3)' }}
                >
                  <Star size={12} /> Set as Default
                </button>
              )}
              {/* Reset to Default — outside edit mode when layout is customised */}
              {rglLayout.hasCustom && !editMode && (
                <button
                  onClick={async () => {
                    try   { await rglLayout.resetToMaster(); showToast('Layout reset'); }
                    catch { showToast('Reset failed', 'error'); }
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(243,96,89,0.1)', color: '#F36059', border: '1px solid rgba(243,96,89,0.25)' }}
                >
                  <RotateCcw size={12} /> Reset to Default
                </button>
              )}
              {/* Edit Layout / Done */}
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
              {/* Add Widgets */}
              <button
                onClick={toggleBank}
                className="flex items-center gap-1.5 btn-secondary text-xs py-1.5"
                style={bankOpen ? { backgroundColor: 'var(--p-accent)', color: '#fff', borderColor: 'var(--p-accent)' } : {}}
              >
                <Layers size={13} />
                {bankOpen ? 'Hide Widgets' : 'Add Widgets'}
              </button>
            </div>
          }
        />
```

- [ ] **Step 4: Pass `suppressToolbar={true}` to `DashboardRGL` in `MainDashboard`**

Find the `<DashboardRGL ... />` JSX (approximately lines 271–275):

```jsx
        <DashboardRGL
          rglLayout={rglLayout}
          widgetMap={widgetMap}
          renderCustom={renderCustom}
        />
```

Replace with:

```jsx
        <DashboardRGL
          rglLayout={rglLayout}
          widgetMap={widgetMap}
          renderCustom={renderCustom}
          suppressToolbar
        />
```

- [ ] **Step 5: Verify in browser**

Navigate to `/` (Overview). Confirm:

1. The **"Edit Layout"** button appears in the top-right of the page header (in the
   `SectionHeader` action area, to the left of "Add Widgets"). It should be visible
   immediately without scrolling.
2. Click **"Edit Layout"** → button changes to **"Done"**, drag handles appear on tiles.
3. Drag a tile to a new position → it moves.
4. Resize a tile by grabbing the bottom-right corner grip → size changes.
5. Click **"Set as Default"** → green "Default layout saved" toast appears for 3 seconds.
6. Click **"Done"** to exit edit mode.
7. Navigate to `/delivery` → admin still sees "Edit Layout" in the DashboardRGL toolbar
   (not the SectionHeader) — confirm Delivery dashboard is unaffected.
8. On `/delivery`, click "Set as Default" → green toast appears.
9. On `/delivery`, click "Done" then "Reset to Default" → green "Layout reset" toast appears.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/MainDashboard.jsx
git commit -m "fix: surface edit-layout controls in Overview SectionHeader, add toast feedback"
```
