# Unified Dashboard — Architecture & UI Updates Design Spec

**Date**: 2026-05-25  
**Approach**: Approach A — Overlay WidgetBank + elevated Overview edit controls  
**Scope**: 4 items; one no-op, one label rename, two code changes

---

## Item 1 — Remove Cloud Artifacts

`netlify.toml` does not exist in the repository. No action required.

---

## Item 2 — Export/Import Button Rename

### Change

Two label-only changes in `client/src/pages/SettingsPage.jsx`, in the "System Sync" card:

| Before | After |
|--------|-------|
| `Export System Config` | `Export System Update` |
| `Import System Config` | `Import System Update` |

### Backend verification (no changes needed)

`server/src/routes/config.js` already implements the correct import behaviour:

- **Settings** (`GlobalSettings`, `title_overrides`, `master_layout`, etc.): upserted — overwrites.
- **User personal layouts** (`user_layouts` table): all rows deleted, then re-inserted from the export — fully overwrites to match the exported structure.
- **Custom widgets** (`status = 'approved'` or `'pending'`): upserted — overwrites approved/pending rows.
- **Personal custom widgets** (`status = 'personal'`): **never touched**. The import:
  1. Skips any export row with `status === 'personal'` (safety check).
  2. Only upserts non-personal rows via `WHERE custom_widgets.status != 'personal'` SQL guard.

No backend changes required.

---

## Item 3 — Overview Edit Layout & Resizability

### Context

The spec written 2026-05-24 designed this fix but was only partially implemented.  
`DashboardRGL` already has:
- `suppressToolbar` prop (default `false`)
- `isResizable={true}`
- `position: relative` on outer tile div; `overflow: hidden` on inner content div
- Resize handle CSS overrides in `index.css`

The gap: `MainDashboard.jsx` doesn't use `suppressToolbar` or host the edit controls in its own header.

### Fix — `client/src/pages/MainDashboard.jsx`

1. **Imports**: add `useEditMode` from `EditModeContext`, `useAuth` from `AuthContext`, and Lucide icons `{ LayoutGrid, Check, Star, RotateCcw }`.

2. **Derive state**:
   ```js
   const { editMode, toggleEditMode } = useEditMode();
   const { user } = useAuth();
   const isAdmin = user?.role === 'Admin';
   const canEdit = editMode && isAdmin;
   ```

3. **Local toast** (same pattern as DashboardRGL's built-in toolbar):
   ```js
   const [toast, setToast] = useState(null);
   const toastTimer = useRef(null);
   useEffect(() => () => clearTimeout(toastTimer.current), []);
   const showToast = (text, type = 'success') => {
     clearTimeout(toastTimer.current);
     setToast({ text, type });
     toastTimer.current = setTimeout(() => setToast(null), 3000);
   };
   ```

4. **SectionHeader `action` prop** — replace the existing single "Add Widgets" button with a row:
   ```
   [ Add Widgets ]  [ toast pill? ]  [ Set as Default ]  [ Reset to Default ]  [ Edit Layout / Done ]
   ```
   - Toast pill: same green/red styling as DashboardRGL.
   - "Set as Default": only visible when `canEdit`; calls `rglLayout.setAsMaster()`.
   - "Reset to Default": only visible when `rglLayout.hasCustom && !editMode`; calls `rglLayout.resetToMaster()`.
   - "Edit Layout / Done": only visible when `isAdmin`; calls `toggleEditMode`.

5. **DashboardRGL**: pass `suppressToolbar={true}` — its built-in toolbar is not rendered on Overview.

### No changes to other pages

Delivery, QA, and sub-dashboard pages continue rendering DashboardRGL without `suppressToolbar` (defaults to `false`). Their built-in toolbar is unaffected.

### Resizability — already complete

`isResizable={true}` is always active in DashboardRGL. Users can resize any widget in any mode (drag requires edit mode; resize is always on, matching the user requirement).

---

## Item 4 — Independent Scrolling App Shell

### Goal

Root container `h-screen overflow-hidden`. Sidebar and main content act as completely separate, independent scrolling panes.

### AppShell changes — `client/src/components/AppShell.jsx`

| Element | Current | After |
|---------|---------|-------|
| Root `<div>` | `h-screen overflow-hidden flex` | no change |
| `<aside>` sidebar | `overflow-y-auto` | no change |
| `<main>` | `flex-1 flex flex-col min-w-0 overflow-hidden` | no change |
| Inner content `<div>` | `flex-1 overflow-auto p-6` | `flex-1 overflow-y-auto p-6` |

One-word change: `overflow-auto` → `overflow-y-auto`. This prevents horizontal scroll bleed from page content and makes the main pane's scroll axis explicit.

### WidgetBank overlay — `client/src/components/WidgetBank.jsx`

Convert from flex sibling to fixed overlay:

- When `isOpen`: apply `position: fixed; top: 4rem; right: 0; bottom: 0; z-index: 40` to the panel root (4rem = 64px AppShell header height).
- When `!isOpen`: panel is not rendered (current behaviour — no change to open/close logic).
- Width stays at the current `w-72` (288px). The panel floats over the grid content.
- No changes to `WidgetBankContext` or how pages consume it.

### MainDashboard cleanup — `client/src/pages/MainDashboard.jsx`

Remove the layout hack:

```jsx
// REMOVE this wrapper:
<div className="flex gap-0 -m-6 h-[calc(100vh-4rem)]">
  <WidgetBank ... style={{ order: 2 }} />
  <div className="flex-1 overflow-y-auto p-6 min-w-0" style={{ order: 1 }}>
    ...
  </div>
</div>

// REPLACE with flat structure:
<div>
  <WidgetBank ... />   {/* renders as fixed overlay when open */}
  <SubDashboardTabs ... />
  <SectionHeader ... />
  <OverviewTrafficLights ... />
  <DashboardRGL ... suppressToolbar={true} />
</div>
```

AppShell's `overflow-y-auto p-6` div is now the only scroll container for the main content — no nested scroll containers.

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/pages/SettingsPage.jsx` | Rename 2 button labels (Export/Import System Update) |
| `client/src/components/AppShell.jsx` | `overflow-auto` → `overflow-y-auto` on inner content div |
| `client/src/components/WidgetBank.jsx` | Convert panel to `position: fixed` overlay |
| `client/src/pages/MainDashboard.jsx` | Remove flex wrapper hack; add edit controls + toast to SectionHeader; pass `suppressToolbar={true}` to DashboardRGL |

---

## Out of Scope

- Delivery, QA, sub-dashboard pages — no layout changes
- WidgetBankContext — no changes
- Backend routes — no changes
- Any Netlify configuration — file does not exist
