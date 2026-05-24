# Dashboard UI Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove any Netlify cloud artifacts, add offline config export/import for system migration, migrate the Overview dashboard to react-grid-layout with full resize support, and fix the app shell so sidebar and main content scroll independently.

**Architecture:** Four independent change groups — (1) cloud artifact cleanup (likely a no-op); (2) new server route `server/src/routes/config.js` plus a System Sync card in SettingsPage; (3) add `DEFAULT_OVERVIEW_RGL_LAYOUT` to constants and rewrite `MainDashboard.jsx` using the same `DashboardRGL + useRGLLayout` pattern as `SubDashboardPage`, with `OverviewTrafficLights` preserved above the grid; (4) a single-line root container fix in `AppShell.jsx`.

**Tech Stack:** React 18 + Vite, react-grid-layout, Express.js, SQLite (node:sqlite DatabaseSync), Tailwind CSS, lucide-react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/public/` | verify | Confirm no `_redirects` or Netlify artifacts exist |
| `netlify.toml` | verify | Confirm absent at project root |
| `server/src/routes/config.js` | create | Export / import endpoints |
| `server/src/index.js` | modify | Register `/api/config` router |
| `client/src/pages/SettingsPage.jsx` | modify | Add System Sync card section |
| `client/src/constants/widgets.js` | modify | Add `DEFAULT_OVERVIEW_RGL_LAYOUT` |
| `client/src/pages/MainDashboard.jsx` | rewrite | Migrate from @dnd-kit to DashboardRGL |
| `client/src/components/DashboardRGL.jsx` | modify | Change `isResizable={canEdit}` → `isResizable={true}` |
| `client/src/components/AppShell.jsx` | modify | Root `min-h-screen` → `h-screen overflow-hidden` |

---

### Task 1: Verify and Remove Cloud Artifacts

**Files:**
- Check: project root for `netlify.toml`
- Check: `client/public/` for `_redirects` or any Netlify-specific files

- [ ] **Step 1: Check for Netlify artifacts**

Run:
```powershell
Test-Path netlify.toml
Get-ChildItem client/public -Recurse -ErrorAction SilentlyContinue
```

Expected: `netlify.toml` → False, `client/public/` → empty or only vite placeholder files.

- [ ] **Step 2: If any Netlify files found, delete them**

If `netlify.toml` exists:
```bash
git rm netlify.toml
```

If `client/public/_redirects` exists:
```bash
git rm client/public/_redirects
```

If neither exists, this step is a no-op — proceed to commit.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Netlify cloud artifacts — app is strictly local/internal"
```

If nothing changed:
```bash
git commit --allow-empty -m "chore: verify no Netlify artifacts present"
```

---

### Task 2: Server — Config Export/Import API

**Files:**
- Create: `server/src/routes/config.js`
- Modify: `server/src/index.js:6-28`

Export payload shape (written to JSON file on client download):
```json
{
  "version": 1,
  "exportedAt": "2026-05-23T12:00:00.000Z",
  "settings": { "excel_path": "...", "delivery_weight": "60", ... },
  "customWidgets": [
    { "id": 3, "username": "admin", "name": "My Chart", "config": {}, "status": "approved" }
  ],
  "userLayouts": [
    { "user_id": 1, "layout_json": "{...}" }
  ]
}
```

Import rules:
- `settings`: upsert all key-value pairs (including master_layout which is stored as a settings key)
- `customWidgets`: upsert approved + pending rows by id; **do NOT touch rows where `status = 'personal'`**
- `userLayouts`: delete all existing user_layouts rows, then insert imported ones

- [ ] **Step 1: Create `server/src/routes/config.js`**

```js
const express = require('express');
const { getDb } = require('../db/init');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/config/export — admin only
router.get('/export', requireAdmin, (req, res) => {
  const db = getDb();
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of settingsRows) settings[row.key] = row.value;

    const customWidgets = db
      .prepare("SELECT id, username, name, config_json, status FROM custom_widgets WHERE status IN ('approved', 'pending')")
      .all()
      .map(w => ({ id: w.id, username: w.username, name: w.name, config: JSON.parse(w.config_json || '{}'), status: w.status }));

    const userLayouts = db
      .prepare('SELECT user_id, layout_json FROM user_layouts')
      .all();

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      customWidgets,
      userLayouts,
    };

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="system-config-${date}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(payload, null, 2));
  } finally {
    db.close();
  }
});

// POST /api/config/import — admin only
router.post('/import', requireAdmin, (req, res) => {
  const { version, settings, customWidgets, userLayouts } = req.body;

  if (version !== 1) {
    return res.status(400).json({ error: 'Unsupported config version' });
  }
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    return res.status(400).json({ error: 'settings must be an object' });
  }

  const db = getDb();
  try {
    // 1. Upsert all settings
    const upsertSetting = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `);
    let settingsCount = 0;
    for (const [key, value] of Object.entries(settings)) {
      upsertSetting.run(key, String(value));
      settingsCount++;
    }

    // 2. Upsert approved/pending custom widgets — preserve personal ones
    let widgetsCount = 0;
    if (Array.isArray(customWidgets)) {
      const upsertWidget = db.prepare(`
        INSERT INTO custom_widgets (id, username, name, config_json, status, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE
          SET username   = excluded.username,
              name       = excluded.name,
              config_json = excluded.config_json,
              status     = excluded.status,
              updated_at = CURRENT_TIMESTAMP
        WHERE custom_widgets.status != 'personal'
      `);
      for (const w of customWidgets) {
        if (!w.id || !w.name) continue;
        if (w.status === 'personal') continue; // safety: skip any personal rows from import
        upsertWidget.run(w.id, w.username || '', w.name, JSON.stringify(w.config || {}), w.status || 'approved');
        widgetsCount++;
      }
    }

    // 3. Replace all user layouts
    let layoutsCount = 0;
    if (Array.isArray(userLayouts) && userLayouts.length > 0) {
      db.prepare('DELETE FROM user_layouts').run();
      const insertLayout = db.prepare(`
        INSERT INTO user_layouts (user_id, layout_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      for (const ul of userLayouts) {
        if (!ul.user_id || !ul.layout_json) continue;
        insertLayout.run(ul.user_id, ul.layout_json);
        layoutsCount++;
      }
    }

    res.json({ success: true, imported: { settings: settingsCount, widgets: widgetsCount, layouts: layoutsCount } });
  } finally {
    db.close();
  }
});

module.exports = router;
```

- [ ] **Step 2: Register the config router in `server/src/index.js`**

After line 8 (`const widgetRoutes = require('./routes/widgets');`), add:

```js
const configRoutes      = require('./routes/config');
```

After line 28 (`app.use('/api/data/raw', rawDataRoutes);`), add:

```js
app.use('/api/config',        configRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/config.js server/src/index.js
git commit -m "feat: add /api/config export+import endpoints for offline system sync"
```

---

### Task 3: Export/Import UI in SettingsPage

**Files:**
- Modify: `client/src/pages/SettingsPage.jsx`

Add a "System Sync" card section. The section appears inside the admin panel JSX, just before the "User Management" card (which starts at the `{/* User Management */}` comment near line 846). Import and Export buttons use `apiFetch` (already imported at line 24).

- [ ] **Step 1: Add `systemSync` state near other state declarations**

Find the `const [widgetActioning, setWidgetActioning]` state declaration (around line 130–140 of SettingsPage) and add after it:

```js
const [syncStatus, setSyncStatus] = useState(null); // null | 'exporting' | 'importing' | 'done' | 'error'
const [syncMsg, setSyncMsg]        = useState('');
const importInputRef               = React.useRef(null);
```

- [ ] **Step 2: Add export handler**

Add this function inside the component, near the other handler functions:

```js
async function handleExport() {
  setSyncStatus('exporting');
  setSyncMsg('');
  try {
    const res = await fetch('/api/config/export', {
      headers: { Authorization: `Bearer ${user?.token}` },
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = `system-config-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncStatus('done');
    setSyncMsg('Export complete.');
  } catch (err) {
    setSyncStatus('error');
    setSyncMsg(`Export failed: ${err.message}`);
  }
}
```

- [ ] **Step 3: Add import handler**

```js
async function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  setSyncStatus('importing');
  setSyncMsg('');
  try {
    const text    = await file.text();
    const payload = JSON.parse(text);
    const result  = await apiFetch('/api/config/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSyncStatus('done');
    setSyncMsg(`Import complete — settings: ${result.imported.settings}, widgets: ${result.imported.widgets}, layouts: ${result.imported.layouts}`);
  } catch (err) {
    setSyncStatus('error');
    setSyncMsg(`Import failed: ${err.message}`);
  }
  // Reset file input so the same file can be re-imported
  if (importInputRef.current) importInputRef.current.value = '';
}
```

- [ ] **Step 4: Add the System Sync card JSX**

Find `{/* User Management */}` comment (around line 846) and insert the following card directly before it:

```jsx
{/* System Sync */}
<div style={cardStyle}>
  <div className="flex items-center gap-2 mb-4">
    <RefreshCw size={15} style={{ color: 'var(--p-accent)' }} />
    <h3 style={sectionTitleStyle}>{t('settings_system_sync') || 'System Sync'}</h3>
  </div>
  <p className="text-xs mb-4" style={{ color: 'rgba(237,240,254,0.4)' }}>
    {t('settings_system_sync_desc') || 'Export all settings, approved widgets, and user layouts to a portable JSON file. Import on another machine to restore the same configuration.'}
  </p>
  <div className="flex flex-wrap items-center gap-3">
    <button
      onClick={handleExport}
      disabled={syncStatus === 'exporting' || syncStatus === 'importing'}
      className="flex items-center gap-1.5 btn-secondary text-xs py-2 px-4 disabled:opacity-50"
    >
      <Download size={13} /> {syncStatus === 'exporting' ? 'Exporting…' : 'Export System Config'}
    </button>

    <label
      className={`flex items-center gap-1.5 btn-secondary text-xs py-2 px-4 cursor-pointer ${syncStatus === 'exporting' || syncStatus === 'importing' ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <Upload size={13} /> {syncStatus === 'importing' ? 'Importing…' : 'Import System Config'}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
        disabled={syncStatus === 'exporting' || syncStatus === 'importing'}
      />
    </label>
  </div>
  {syncMsg && (
    <p className={`text-xs mt-3 ${syncStatus === 'error' ? 'text-sigma-red' : 'text-sigma-green'}`}>
      {syncMsg}
    </p>
  )}
</div>
```

- [ ] **Step 5: Verify `Download`, `Upload`, `RefreshCw` are already in the lucide-react import**

Line 20–23 of SettingsPage already imports `Upload, Download, RefreshCw` — confirm these are present and add any missing ones.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/SettingsPage.jsx
git commit -m "feat: add Export/Import System Config UI to admin settings"
```

---

### Task 4: Add DEFAULT_OVERVIEW_RGL_LAYOUT to widgets.js

**Files:**
- Modify: `client/src/constants/widgets.js`

The Overview uses the same 6 widgets as sub-dashboards: `committed-rate`, `overall-rate`, `avg-velocity`, `reopen-pct`, `rejected-pct`, `escaping-pct`. Same 12-col grid, 3 widgets × 2 rows.

- [ ] **Step 1: Add the constant at the end of the file**

```js
export const DEFAULT_OVERVIEW_RGL_LAYOUT = [
  { i: 'committed-rate',  x: 0, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'overall-rate',    x: 4, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'avg-velocity',    x: 8, y: 0, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'reopen-pct',      x: 0, y: 5, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'rejected-pct',    x: 4, y: 5, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'escaping-pct',    x: 8, y: 5, w: 4, h: 5, minW: 2, minH: 3 },
];
```

- [ ] **Step 2: Commit**

```bash
git add client/src/constants/widgets.js
git commit -m "feat: add DEFAULT_OVERVIEW_RGL_LAYOUT for Overview dashboard migration"
```

---

### Task 5: Migrate MainDashboard.jsx to DashboardRGL

**Files:**
- Modify: `client/src/pages/MainDashboard.jsx` (full rewrite of the component body, keeping `OverviewLight` and `OverviewTrafficLights` helper functions untouched)

The new structure:
- Remove: `DndContext`, `DragOverlay`, `PointerSensor`, `useSensor`, `useSensors`, `closestCorners`, `SortableContext`, `arrayMove`, `rectSortingStrategy`, `GridWidget`, `GridDropZone`, `store`, `useState` (for gridWidgetIds/activeId), `useCallback` (for saveLayout/resolveWidget/etc.)
- Add: `DashboardRGL`, `useRGLLayout`, `WidgetSlotContent`, `CustomWidgetRenderer`, `useMemo`
- Keep: `useApi`, `useLanguage`, `useWidgetBank`, `SubDashboardTabs`, `SectionHeader`, `LoadingSpinner`, `WidgetBank`, `Layers`, `ALL_WIDGETS`, `DEFAULT_OVERVIEW_RGL_LAYOUT`

Layout structure in JSX:
```
<div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
  <WidgetBank ... style={{ order: 2 }} />
  <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
    <SubDashboardTabs ... />
    <SectionHeader ... />
    <OverviewTrafficLights ... />
    <DashboardRGL rglLayout={rglLayout} widgetMap={widgetMap} renderCustom={renderCustom} />
  </div>
</div>
```

- [ ] **Step 1: Write the new MainDashboard.jsx**

```jsx
import React, { useCallback, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import WidgetBank from '../components/WidgetBank';
import DashboardRGL from '../components/DashboardRGL';
import SectionHeader from '../components/SectionHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import SubDashboardTabs from '../components/SubDashboardTabs';
import WidgetSlotContent from '../components/WidgetSlotContent';
import CustomWidgetRenderer from '../components/CustomWidgetRenderer';
import { Layers } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWidgetBank } from '../context/WidgetBankContext';
import { useRGLLayout } from '../hooks/useRGLLayout';
import { getTrafficLight, LIGHT_COLORS } from '../utils/thresholds';
import { ALL_WIDGETS, DEFAULT_OVERVIEW_RGL_LAYOUT } from '../constants/widgets';

// ── Traffic Light card ────────────────────────────────────────────────────────
// [Keep the existing OverviewLight and OverviewTrafficLights functions exactly as-is]
// [Copy lines 22–190 of the original file verbatim]

// ── Main dashboard page ───────────────────────────────────────────────────────

export default function MainDashboard() {
  const { t, lang } = useLanguage();
  const { isOpen: bankOpen, toggle: toggleBank, setIsOpen: setBankOpen, customWidgets } = useWidgetBank();
  const { data: delivery, loading: dLoading } = useApi('/api/data/delivery');
  const { data: qa,       loading: qLoading } = useApi('/api/data/qa');
  const { data: settings }                     = useApi('/api/settings');

  const rglLayout = useRGLLayout('overview', DEFAULT_OVERVIEW_RGL_LAYOUT);

  const widgetMap = useMemo(() => {
    const map = {};
    for (const w of ALL_WIDGETS) {
      const displayW = lang === 'he' ? { ...w, label: w.label_he || w.label } : w;
      map[w.id] = (
        <WidgetSlotContent
          widget={displayW}
          delivery={delivery}
          qa={qa}
          settings={settings}
        />
      );
    }
    return map;
  }, [lang, delivery, qa, settings]);

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

  const activeWidgetIds = rglLayout.rglItems.map(item => item.i);

  if (dLoading || qLoading) return <LoadingSpinner message="Loading dashboard data…" />;

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
}
```

**Implementation note:** The file will contain the `OverviewLight` and `OverviewTrafficLights` helper components (lines 22–190 of the original) exactly as-is, followed by the new `MainDashboard` component above.

- [ ] **Step 2: Confirm the build compiles without errors**

```powershell
cd client; npm run build 2>&1 | Select-String -Pattern "error|Error" | Select-Object -First 20
```

Expected: no TypeScript/Vite errors referencing MainDashboard or missing imports.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/MainDashboard.jsx
git commit -m "feat: migrate Overview (MainDashboard) from @dnd-kit to react-grid-layout with server-persisted layout"
```

---

### Task 6: Enable Full Widget Resizability in DashboardRGL

**Files:**
- Modify: `client/src/components/DashboardRGL.jsx:120`

Currently `isResizable={canEdit}` means resizing is only available when an admin is in edit mode. Change to always `true` so users can resize widgets at any time.

- [ ] **Step 1: Change `isResizable` prop**

In `client/src/components/DashboardRGL.jsx`, change line 120:

```jsx
// Before
isResizable={canEdit}
// After
isResizable={true}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/DashboardRGL.jsx
git commit -m "feat: enable always-on widget resizing (height and width) in DashboardRGL"
```

---

### Task 7: Independent Scrolling App Shell

**Files:**
- Modify: `client/src/components/AppShell.jsx:213,217`

The root container `min-h-screen flex` grows taller than the viewport, causing the browser window to scroll instead of the sidebar and main panes scrolling independently. Fixing the root to `h-screen overflow-hidden` constrains both children to the viewport height.

- [ ] **Step 1: Fix root container**

In `client/src/components/AppShell.jsx`, change line 213:

```jsx
// Before
<div className="min-h-screen flex">
// After
<div className="h-screen overflow-hidden flex">
```

- [ ] **Step 2: Add `overflow-y-auto` to the sidebar `<aside>`**

Line 217, change the className:

```jsx
// Before
className={`${collapsed ? 'w-16' : 'w-56'} flex flex-col transition-all duration-200 shrink-0`}
// After
className={`${collapsed ? 'w-16' : 'w-56'} flex flex-col transition-all duration-200 shrink-0 overflow-y-auto`}
```

Note: The `<nav>` inside the aside already has `overflow-y-auto`. Adding it to the aside itself ensures the entire sidebar column (including the logo/hamburger header) is properly height-constrained within the viewport.

- [ ] **Step 3: Verify main content already scrolls**

The main content area has `flex-1 flex flex-col min-w-0 overflow-hidden` and its inner content div has `flex-1 overflow-auto p-6` — these already enable independent scrolling once the root is `h-screen`.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/AppShell.jsx
git commit -m "fix: root layout h-screen overflow-hidden for independent sidebar/content scrolling"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Remove Netlify artifacts | Task 1 |
| Export System Config button (admin) | Tasks 2 + 3 |
| Import System Config — overwrite settings + layouts | Tasks 2 + 3 |
| Import MUST preserve personal custom widgets | Task 2 (WHERE clause + skip personal on import) |
| Edit Layout toggle functional on Overview | Task 5 (DashboardRGL provides the toggle) |
| Width AND height resize enabled | Task 6 |
| Root container `h-screen overflow-hidden` | Task 7 |
| Sidebar and main content independent scrolling | Task 7 |

### Placeholder Scan

No TBD/TODO/placeholder items — all steps include complete code.

### Type/Name Consistency

- `DEFAULT_OVERVIEW_RGL_LAYOUT` — defined in Task 4, imported in Task 5 ✓
- `useRGLLayout('overview', ...)` — same hook signature as in SubDashboardPage ✓
- `apiFetch` — already imported in SettingsPage ✓
- `requireAdmin` — used in config.js, already defined in `server/src/middleware/auth.js` ✓
- `widgetMap` / `renderCustom` — same names and shapes as SubDashboardPage ✓
