# Unified Dashboard Architecture & UI Updates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename export/import buttons, convert the WidgetBank to a fixed overlay, clean up the flex-wrapper layout hack from all dashboard pages, add an Edit Layout toolbar to Overview, and add an admin-configurable global widget title font size.

**Architecture:** AppShell's main content div is the single scroll container for all pages (`overflow-y-auto`). Dashboard pages render WidgetBank as a `position: fixed` overlay instead of a flex sibling, eliminating the `-m-6 h-[calc(100vh-4rem)]` hack. A CSS custom property `--p-widget-title-size` flows from a DB-backed setting to all widget labels.

**Tech Stack:** React 18, react-grid-layout v2, Tailwind CSS, Express + better-sqlite3

---

## File Map

| File | What changes |
|------|-------------|
| `client/src/pages/SettingsPage.jsx` | Rename 2 button labels; add widget title size number input |
| `client/src/components/AppShell.jsx` | `overflow-auto` → `overflow-y-auto` on inner content div |
| `client/src/components/WidgetBank.jsx` | Remove flex-sibling styles; become a `position:fixed` overlay |
| `client/src/pages/MainDashboard.jsx` | Remove flex wrapper; add edit controls in SectionHeader; `suppressToolbar={true}` |
| `client/src/pages/DeliveryDashboard.jsx` | Remove flex wrapper; CardLabel uses CSS variable |
| `client/src/pages/QADashboard.jsx` | Remove flex wrapper; CardLabel uses CSS variable |
| `client/src/pages/SubDashboardPage.jsx` | Remove flex wrapper |
| `client/src/context/SettingsContext.jsx` | Add `widget_title_size` default; apply CSS variable on change |
| `client/src/components/KpiCard.jsx` | Label span uses `--p-widget-title-size` |
| `client/src/components/SectionHeader.jsx` | `<h2>` uses CSS variable via inline style |
| `client/src/components/DashboardRGL.jsx` | Drag handle label uses CSS variable |
| `server/src/db/init.js` | Add `widget_title_size` default |
| `server/src/routes/config.js` | Add `widget_title_size` to `KNOWN_SETTINGS_KEYS` |

---

## Task 1: Rename Export/Import button labels

**Files:**
- Modify: `client/src/pages/SettingsPage.jsx`

- [ ] **Step 1: Find the two button labels**

Open `client/src/pages/SettingsPage.jsx`. Search for the string `"Export System Config"` (around line 910) and `"Import System Config"` (a few lines below it). They are inside the "System Sync" card.

- [ ] **Step 2: Update the Export button label**

In the `<button>` that calls `handleExport`, change:
```jsx
// BEFORE (around line 910):
{syncStatus === 'exporting' ? 'Exporting…' : 'Export System Config'}

// AFTER:
{syncStatus === 'exporting' ? 'Exporting…' : 'Export System Update'}
```

- [ ] **Step 3: Update the Import label**

In the `<label>` wrapping the import file input, change:
```jsx
// BEFORE:
{syncStatus === 'importing' ? 'Importing…' : 'Import System Config'}

// AFTER:
{syncStatus === 'importing' ? 'Importing…' : 'Import System Update'}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SettingsPage.jsx
git commit -m "feat: rename export/import buttons to System Update"
```

---

## Task 2: AppShell — independent scroll fix

**Files:**
- Modify: `client/src/components/AppShell.jsx`

- [ ] **Step 1: Find the inner content div**

In `client/src/components/AppShell.jsx`, find the div just before `<Outlet />` (around line 399). It currently reads:
```jsx
<div className="flex-1 overflow-auto p-6">
```

- [ ] **Step 2: Change overflow-auto to overflow-y-auto**

```jsx
// BEFORE:
<div className="flex-1 overflow-auto p-6">

// AFTER:
<div className="flex-1 overflow-y-auto p-6">
```

This prevents horizontal scroll bleed from page content. The sidebar already has its own `overflow-y-auto`; now the main content pane explicitly scrolls only vertically.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/AppShell.jsx
git commit -m "fix: main content pane uses overflow-y-auto for independent scrolling"
```

---

## Task 3: WidgetBank — convert to fixed overlay

**Files:**
- Modify: `client/src/components/WidgetBank.jsx`

- [ ] **Step 1: Remove the `style` prop from the component signature**

The `style` prop was used to pass `order: 2` from dashboard pages (flex-sibling trick). It's no longer needed.

In `client/src/components/WidgetBank.jsx`, find the export line (line 114):
```jsx
// BEFORE:
export default function WidgetBank({ widgets, activeWidgetIds, isOpen, onClose, onAdd, style }) {

// AFTER:
export default function WidgetBank({ widgets, activeWidgetIds, isOpen, onClose, onAdd }) {
```

- [ ] **Step 2: Add early return when closed**

The current component collapses to `w-0` when `!isOpen`. For the fixed overlay, we simply don't render it when closed. Add this line right after the last hook call inside the component body (before the `return`):

```jsx
// Add this immediately before the return statement (after all hooks):
if (!isOpen) return null;
```

- [ ] **Step 3: Change the `<aside>` to fixed positioning**

Find the `return (` block (around line 168). Replace the `<aside>` opening tag:

```jsx
// BEFORE:
<aside
  className={`shrink-0 transition-all duration-200 overflow-hidden ${isOpen ? 'w-60' : 'w-0'}`}
  style={{ borderInlineStart: '1px solid var(--p-card-border)', backgroundColor: 'var(--p-sidebar-bg)', ...style }}
>

// AFTER:
<aside
  className="w-60 overflow-hidden"
  style={{
    position: 'fixed',
    top: '4rem',
    right: 0,
    bottom: 0,
    zIndex: 40,
    borderInlineStart: '1px solid var(--p-card-border)',
    backgroundColor: 'var(--p-sidebar-bg)',
    backdropFilter: 'blur(16px)',
  }}
>
```

`top: '4rem'` aligns the panel beneath the 64px AppShell header. `zIndex: 40` floats it above the grid content.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/WidgetBank.jsx
git commit -m "feat: convert WidgetBank to position:fixed overlay panel"
```

---

## Task 4: MainDashboard — remove flex wrapper + add edit controls

**Files:**
- Modify: `client/src/pages/MainDashboard.jsx`

- [ ] **Step 1: Update React import to include hooks needed for toast**

Find the top import (line 1):
```jsx
// BEFORE:
import React, { useCallback, useMemo } from 'react';

// AFTER:
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
```

- [ ] **Step 2: Add missing context and icon imports**

After the existing `import { Layers } from 'lucide-react';` line, add:
```jsx
import { Layers, LayoutGrid, Check, Star, RotateCcw } from 'lucide-react';
import { useEditMode } from '../context/EditModeContext';
import { useAuth } from '../context/AuthContext';
```

(Replace the single `{ Layers }` import with the expanded version.)

- [ ] **Step 3: Add edit-mode state inside MainDashboard**

Inside the `MainDashboard` function body, after the existing hook calls, add:
```jsx
const { editMode, toggleEditMode } = useEditMode();
const { user }                     = useAuth();
const isAdmin  = user?.role === 'Admin';
const canEdit  = editMode && isAdmin;

const [toast, setToast]   = useState(null);
const toastTimer           = useRef(null);
useEffect(() => () => clearTimeout(toastTimer.current), []);
const showToast = (text, type = 'success') => {
  clearTimeout(toastTimer.current);
  setToast({ text, type });
  toastTimer.current = setTimeout(() => setToast(null), 3000);
};
```

- [ ] **Step 4: Build the toolbar action element**

Replace the `return` statement's JSX. The current structure wraps everything in `<div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">`. Remove that wrapper and move WidgetBank out of the flex container. Also build the new `action` element for SectionHeader.

```jsx
// BEFORE (the outer wrapper + WidgetBank flex sibling):
return (
  <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
    <WidgetBank
      widgets={ALL_WIDGETS}
      activeWidgetIds={activeWidgetIds}
      isOpen={bankOpen}
      onClose={() => setBankOpen(false)}
      onAdd={rglLayout.addWidget}
      style={{ order: 2 }}
    />
    <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
      <SubDashboardTabs parentId="overview" parentPath="/" parentLabel={t('overview_title')} />
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
      <OverviewTrafficLights delivery={delivery} qa={qa} settings={settings} t={t} />
      <DashboardRGL
        rglLayout={rglLayout}
        widgetMap={widgetMap}
        renderCustom={renderCustom}
      />
    </div>
  </div>
);

// AFTER:
return (
  <div>
    <WidgetBank
      widgets={ALL_WIDGETS}
      activeWidgetIds={activeWidgetIds}
      isOpen={bankOpen}
      onClose={() => setBankOpen(false)}
      onAdd={rglLayout.addWidget}
    />

    <SubDashboardTabs parentId="overview" parentPath="/" parentLabel={t('overview_title')} />

    <SectionHeader
      title={t('overview_title')}
      titleKey="overview.title"
      subtitle={t('overview_subtitle')}
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleBank}
            className="flex items-center gap-1.5 btn-secondary text-xs py-1.5"
            style={bankOpen ? { backgroundColor: 'var(--p-accent)', color: '#fff', borderColor: 'var(--p-accent)' } : {}}
          >
            <Layers size={13} />
            {bankOpen ? 'Hide Widgets' : 'Add Widgets'}
          </button>

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
                try   { await rglLayout.setAsMaster(); showToast('Default layout saved'); }
                catch { showToast('Save failed', 'error'); }
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: 'rgba(249,189,51,0.12)', color: '#F9BD33', border: '1px solid rgba(249,189,51,0.3)' }}
            >
              <Star size={12} /> Set as Default
            </button>
          )}

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
      }
    />

    <OverviewTrafficLights delivery={delivery} qa={qa} settings={settings} t={t} />

    <DashboardRGL
      rglLayout={rglLayout}
      widgetMap={widgetMap}
      renderCustom={renderCustom}
      suppressToolbar={true}
    />
  </div>
);
```

- [ ] **Step 5: Verify visually**

Start the app. Log in as Admin. Navigate to Overview. Confirm:
- The page scrolls inside AppShell's content pane (not the whole page)
- "Add Widgets" / "Edit Layout" / "Set as Default" / "Reset to Default" buttons appear in the section header
- Clicking "Edit Layout" toggles drag mode on the grid; "Done" exits it
- "Add Widgets" opens the WidgetBank as a fixed right panel overlaying the grid

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/MainDashboard.jsx
git commit -m "feat: elevate Overview edit controls to SectionHeader, remove flex wrapper"
```

---

## Task 5: DeliveryDashboard — remove flex wrapper

**Files:**
- Modify: `client/src/pages/DeliveryDashboard.jsx`

- [ ] **Step 1: Find the flex wrapper in the return statement**

Search for `flex gap-0 -m-6` in `DeliveryDashboard.jsx`. The return is structured:
```jsx
return (
  <div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
    <WidgetBank
      ...
      style={{ order: 2 }}
    />
    <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
      ...content...
    </div>
  </div>
);
```

- [ ] **Step 2: Remove the flex wrapper**

Replace the outer structure with a flat div. Remove `style={{ order: 2 }}` from WidgetBank, and remove the inner `<div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>` wrapper (but keep its children — they move up one level):

```jsx
// AFTER:
return (
  <div>
    <WidgetBank
      widgets={ALL_WIDGETS}
      activeWidgetIds={rglLayout.rglItems.map(item => item.i)}
      isOpen={bankOpen}
      onClose={() => setBankOpen(false)}
      onAdd={rglLayout.addWidget}
    />
    {/* all the existing inner content — SubDashboardTabs, SectionHeader, DashboardRGL, etc. */}
    ...
  </div>
);
```

Keep all existing content inside the flat `<div>` exactly as-is; just remove the outer flex wrapper and the inner wrapper div.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/DeliveryDashboard.jsx
git commit -m "fix: remove flex wrapper hack from DeliveryDashboard"
```

---

## Task 6: QADashboard — remove flex wrapper

**Files:**
- Modify: `client/src/pages/QADashboard.jsx`

- [ ] **Step 1: Find the flex wrapper**

Search for `flex gap-0 -m-6` in `QADashboard.jsx` (around line 293).

- [ ] **Step 2: Apply the same removal as Task 5**

Identical pattern to DeliveryDashboard: remove the outer `<div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">`, remove `style={{ order: 2 }}` from WidgetBank, and remove the inner `<div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>` wrapper while keeping its children.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/QADashboard.jsx
git commit -m "fix: remove flex wrapper hack from QADashboard"
```

---

## Task 7: SubDashboardPage — remove flex wrapper

**Files:**
- Modify: `client/src/pages/SubDashboardPage.jsx`

- [ ] **Step 1: Find the flex wrapper**

The wrapper is at line 90 in `SubDashboardPage.jsx`:
```jsx
<div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
  <WidgetBank
    widgets={ALL_WIDGETS}
    activeWidgetIds={activeWidgetIds}
    isOpen={bankOpen}
    onClose={() => setBankOpen(false)}
    onAdd={rglLayout.addWidget}
    style={{ order: 2 }}
  />
  <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
    {/* SubDashboardTabs, SectionHeader, DashboardRGL */}
  </div>
</div>
```

- [ ] **Step 2: Remove the wrapper**

```jsx
// AFTER:
<div>
  <WidgetBank
    widgets={ALL_WIDGETS}
    activeWidgetIds={activeWidgetIds}
    isOpen={bankOpen}
    onClose={() => setBankOpen(false)}
    onAdd={rglLayout.addWidget}
  />
  {subDash?.parentId && (() => { ... })()}
  <SectionHeader ... />
  <DashboardRGL ... />
</div>
```

Remove `style={{ order: 2 }}` from WidgetBank. Remove the inner `<div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>` but keep all its children in place.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/SubDashboardPage.jsx
git commit -m "fix: remove flex wrapper hack from SubDashboardPage"
```

---

## Task 8: Backend — add widget_title_size setting

**Files:**
- Modify: `server/src/db/init.js`
- Modify: `server/src/routes/config.js`

- [ ] **Step 1: Add the default in init.js**

In `server/src/db/init.js`, find the `defaults` array (around line 63). Add this entry:
```js
// After ['title_overrides', '{}'],  add:
['widget_title_size', '12'],
```

- [ ] **Step 2: Add to KNOWN_SETTINGS_KEYS in config.js**

In `server/src/routes/config.js`, find `KNOWN_SETTINGS_KEYS` (around line 7). Add `'widget_title_size'` to the Set:
```js
const KNOWN_SETTINGS_KEYS = new Set([
  // ... existing keys ...
  'squad_visibility', 'pi_name_map', 'title_overrides', 'master_layout',
  'widget_title_size',   // ← add this
]);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/db/init.js server/src/routes/config.js
git commit -m "feat: add widget_title_size setting to DB defaults and config allowlist"
```

---

## Task 9: SettingsContext — apply CSS variable on change

**Files:**
- Modify: `client/src/context/SettingsContext.jsx`

- [ ] **Step 1: Add widget_title_size to DEFAULT_SETTINGS**

In `client/src/context/SettingsContext.jsx`, find `DEFAULT_SETTINGS` (around line 11). Add:
```js
export const DEFAULT_SETTINGS = {
  // ... existing keys ...
  title_overrides:           '{}',
  widget_title_size:         '12',   // ← add this
};
```

- [ ] **Step 2: Apply CSS variable whenever the setting changes**

Inside the `SettingsProvider` function, add a `useEffect` after the existing one (around line 43):
```jsx
useEffect(() => {
  document.documentElement.style.setProperty(
    '--p-widget-title-size',
    (settings.widget_title_size || 12) + 'px'
  );
}, [settings.widget_title_size]);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/context/SettingsContext.jsx
git commit -m "feat: apply --p-widget-title-size CSS variable from settings"
```

---

## Task 10: SettingsPage — add widget title size input

**Files:**
- Modify: `client/src/pages/SettingsPage.jsx`

- [ ] **Step 1: Add a Display card before the Save All button**

In `client/src/pages/SettingsPage.jsx`, find the "Save all" section (the `<div className="flex justify-end">` with the Save button, around line 760). Insert a new card immediately above it:

```jsx
{/* Display Settings */}
<div style={cardStyle}>
  <div className="flex items-center gap-2 mb-4">
    <SlidersHorizontal size={15} style={{ color: 'var(--p-accent)' }} />
    <h3 style={sectionTitleStyle}>Display</h3>
  </div>
  <SettingRow label="Widget Label Size" description="Font size for widget labels and titles (px). Range: 8–32.">
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={8}
        max={32}
        step={1}
        value={form.widget_title_size ?? 12}
        onChange={e => setForm(f => ({ ...f, widget_title_size: e.target.value }))}
        className="sigma-input"
        style={{ width: '6rem' }}
      />
      <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>px</span>
      <span className="text-xs" style={{ color: 'rgba(237,240,254,0.4)' }}>default: 12</span>
    </div>
  </SettingRow>
</div>
```

`SlidersHorizontal` is already imported in SettingsPage. `cardStyle` and `sectionTitleStyle` are already defined in the component.

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/SettingsPage.jsx
git commit -m "feat: add widget label size input to Settings Display card"
```

---

## Task 11: Apply CSS variable to all widget labels

**Files:**
- Modify: `client/src/components/KpiCard.jsx`
- Modify: `client/src/components/SectionHeader.jsx`
- Modify: `client/src/components/DashboardRGL.jsx`
- Modify: `client/src/pages/DeliveryDashboard.jsx`
- Modify: `client/src/pages/QADashboard.jsx`

- [ ] **Step 1: KpiCard — label span**

In `client/src/components/KpiCard.jsx` (line 9), the label `<span>` currently has `className="text-xs font-medium leading-tight"`. Add an inline `fontSize` style:

```jsx
// BEFORE:
<span className="text-xs font-medium leading-tight" style={{ color: 'rgba(237,240,254,0.55)' }}>{label}</span>

// AFTER:
<span className="font-medium leading-tight" style={{ color: 'rgba(237,240,254,0.55)', fontSize: 'var(--p-widget-title-size)' }}>{label}</span>
```

Remove `text-xs` (it sets `font-size: 0.75rem` which would override the inline style — since inline styles win over classes, actually keeping `text-xs` is harmless, but removing it is cleaner).

- [ ] **Step 2: SectionHeader — h2 title**

In `client/src/components/SectionHeader.jsx` (line 8), the `<h2>` currently has `className="font-bold text-sigma-ice"`. Apply the CSS variable via inline style:

```jsx
// BEFORE:
<h2 className="font-bold text-sigma-ice">
  {titleKey
    ? <EditableTitle titleKey={titleKey} defaultTitle={title} className="text-base" />
    : <span className="text-base">{title}</span>}
</h2>

// AFTER:
<h2 className="font-bold text-sigma-ice">
  {titleKey
    ? <EditableTitle titleKey={titleKey} defaultTitle={title} className="text-base" />
    : <span style={{ fontSize: 'calc(var(--p-widget-title-size, 12px) * 1.33)' }}>{title}</span>}
</h2>
```

Note: `EditableTitle` manages its own font size via its floating toolbar; the global CSS variable is applied to the fallback `<span>` (pages without `titleKey`). EditableTitle sections are controlled per-title by the Admin toolbar.

- [ ] **Step 3: DashboardRGL — drag handle label**

In `client/src/components/DashboardRGL.jsx`, find the drag handle label `<span>` (around line 183) that shows `item.i`. Add a `fontSize` style:

```jsx
// BEFORE:
<span className="text-xs font-semibold" style={{ color: 'rgba(237,240,254,0.5)' }}>
  {item.i}
</span>

// AFTER:
<span className="font-semibold" style={{ color: 'rgba(237,240,254,0.5)', fontSize: 'var(--p-widget-title-size)' }}>
  {item.i}
</span>
```

- [ ] **Step 4: DeliveryDashboard — CardLabel component**

In `client/src/pages/DeliveryDashboard.jsx`, the local `CardLabel` function (around line 34) renders a `<p>` with `className="text-xs font-semibold mb-4"`. Add the CSS variable:

```jsx
// BEFORE:
function CardLabel({ children, textKey }) {
  if (textKey) {
    return (
      <EditableText
        textKey={textKey}
        fallback={typeof children === 'string' ? children : ''}
        tag="p"
        className="text-xs font-semibold mb-4"
        style={{ color: 'rgba(237,240,254,0.5)' }}
      />
    );
  }
  return <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(237,240,254,0.5)' }}>{children}</p>;
}

// AFTER:
function CardLabel({ children, textKey }) {
  if (textKey) {
    return (
      <EditableText
        textKey={textKey}
        fallback={typeof children === 'string' ? children : ''}
        tag="p"
        className="font-semibold mb-4"
        style={{ color: 'rgba(237,240,254,0.5)', fontSize: 'var(--p-widget-title-size)' }}
      />
    );
  }
  return (
    <p className="font-semibold mb-4" style={{ color: 'rgba(237,240,254,0.5)', fontSize: 'var(--p-widget-title-size)' }}>
      {children}
    </p>
  );
}
```

- [ ] **Step 5: QADashboard — CardLabel component**

`QADashboard.jsx` has an identical local `CardLabel` function (around line 34). Apply the exact same change as Step 4.

- [ ] **Step 6: Verify visually**

Start the app. Log in as Admin. Go to Settings → Display → set "Widget Label Size" to `18` and save. Confirm:
- KPI card labels are larger on Overview, Delivery, QA
- Chart card labels (CardLabel) in Delivery and QA pages are larger
- The drag handle labels in edit mode are larger
- Section headers (fallback `<span>`) are larger
- Resetting to `12` restores original size

- [ ] **Step 7: Commit**

```bash
git add client/src/components/KpiCard.jsx \
        client/src/components/SectionHeader.jsx \
        client/src/components/DashboardRGL.jsx \
        client/src/pages/DeliveryDashboard.jsx \
        client/src/pages/QADashboard.jsx
git commit -m "feat: apply --p-widget-title-size CSS variable to all widget labels"
```

---

## Self-Review Checklist

| Spec requirement | Covered by |
|-----------------|-----------|
| Netlify.toml removal | No-op (file doesn't exist) |
| "Export System Update" label | Task 1 |
| "Import System Update" label | Task 1 |
| Import preserves personal widgets | Already implemented in backend — no code change |
| AppShell `h-screen overflow-hidden` root | Already in place — verified in Task 2 |
| AppShell sidebar `overflow-y-auto` | Already in place |
| AppShell main content `overflow-y-auto` | Task 2 |
| WidgetBank as fixed overlay | Task 3 |
| MainDashboard flex wrapper removed | Task 4 |
| Overview Edit Layout controls in SectionHeader | Task 4 |
| `suppressToolbar={true}` on Overview DashboardRGL | Task 4 |
| `isResizable={true}` + resize CSS | Already implemented — no change needed |
| DeliveryDashboard flex wrapper removed | Task 5 |
| QADashboard flex wrapper removed | Task 6 |
| SubDashboardPage flex wrapper removed | Task 7 |
| `widget_title_size` DB default + config allowlist | Task 8 |
| CSS variable applied on settings change | Task 9 |
| Admin input in Settings page | Task 10 |
| KpiCard label size | Task 11 |
| SectionHeader title size | Task 11 |
| DashboardRGL drag label size | Task 11 |
| DeliveryDashboard CardLabel size | Task 11 |
| QADashboard CardLabel size | Task 11 |
