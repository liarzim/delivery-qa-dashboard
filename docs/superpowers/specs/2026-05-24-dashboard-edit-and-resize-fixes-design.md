# Dashboard Edit & Resize Bug Fixes — Design Spec

**Date**: 2026-05-24  
**Scope**: Two bugs in the react-grid-layout dashboard system

---

## Bug 1 — Admin cannot see "Edit Layout" button on Overview

### Symptom
The admin user cannot see the "Edit Layout" button on the Overview (MainDashboard) page,
even though the same button renders correctly on Delivery, QA, and sub-dashboard pages.
All pages share the same `DashboardRGL` component.

### Root Cause
`DashboardRGL` renders its toolbar (Edit Layout / Set as Default / Reset to Default) as
the first child of its own `<div>`. On the Overview page, this component is mounted inside
a custom flex container that uses `-m-6 h-[calc(100vh-4rem)]` and a nested `overflow-y-auto`
scroll region — a different layout context than the other pages, which render inside
AppShell's plain `overflow-auto p-6` div. Something in this context prevents the toolbar
from being visible or `isAdmin` from evaluating correctly.

On Delivery/QA/sub-dashboard pages the AppShell's single scrollable content area is the
scroll container. On Overview, a nested scroll container is introduced and the
OverviewTrafficLights section sits between the page header and DashboardRGL.

### Fix
**Elevate the edit controls to the Overview's SectionHeader.**

1. Add an optional `suppressToolbar: boolean` prop to `DashboardRGL` (default `false`).
   When `true`, the entire built-in toolbar div is not rendered.

2. In `MainDashboard.jsx`:
   - Call `useEditMode()` to get `editMode` and `toggleEditMode`.
   - Call `useAuth()` to get `user`, derive `isAdmin = user?.role === 'Admin'`.
   - Derive `canEdit = editMode && isAdmin`.
   - Render Edit Layout / Done / Set as Default / Reset to Default controls inside the
     `SectionHeader` `action` prop, alongside the existing "Add Widgets" button.
   - Pass `suppressToolbar={true}` to `<DashboardRGL>`.

3. No changes to Delivery, QA, or sub-dashboard pages. They continue to use
   `DashboardRGL`'s built-in toolbar with `suppressToolbar` defaulting to `false`.

### SectionHeader action layout (Overview only)
```
[ Add Widgets ]  [ Set as Default ]  [ Reset to Default ]  [ Edit Layout / Done ]
```
All buttons follow the same styling already used in DashboardRGL's built-in toolbar
(same Lucide icons, same rgba color scheme).

---

## Bug 2 — Resize handles invisible and potentially clipped

### Symptom
Admin (and all users) cannot resize tiles on Delivery/QA dashboards in edit mode.
The `isResizable={true}` prop is set, so handles exist in the DOM — but they cannot
be seen or clicked.

### Root Cause — Two Stacked Problems

**Problem A — Handle invisible**: The default `react-resizable` stylesheet
(`@import 'react-resizable/css/styles.css'`) provides a handle background image that
is a **dark SVG** (near-black fill). Against the dark-navy dashboard background, this
is completely invisible.

**Problem B — Handle clipped**: In `DashboardRGL`, the outer tile `div` has both
`overflow: hidden` and `borderRadius: 12`. `react-resizable` injects the resize handle
(`<span class="react-resizable-handle-se">`) as a child of this div via `React.cloneElement`.
When the browser resolves the handle's `position: absolute; bottom: 0; right: 0` against
a `borderRadius: 12` parent with `overflow: hidden`, the rounded corner clips the 20×20px
hit area, making it impossible to interact with even if it were visible.

### Fix A — CSS visibility override (index.css)
Override the default dark handle with an accent-colored L-shaped corner indicator:

```css
/* Remove the dark default SVG */
.react-resizable-handle {
  background-image: none !important;
  background-color: transparent;
}
/* Accent-colored L-corner grip via ::after */
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

Uses the same `rgba(99,130,255,…)` accent already used by DashboardRGL outlines and drag
handles, so it reads as part of the edit-mode visual language.

### Fix B — Overflow restructuring (DashboardRGL.jsx)
Move `overflow: hidden` from the outer tile wrapper to an inner content div. Add
`position: relative` to the outer wrapper so the injected resize handle is a correctly
positioned child.

**Before:**
```jsx
<div key={item.i} style={{ overflow: 'hidden', borderRadius: 12, outline: … }}>
  {canEdit && <div className="rgl-drag-handle" style={{ backgroundColor: … }}>…</div>}
  <div style={{ height: canEdit ? 'calc(100% - 32px)' : '100%' }}>
    {renderSlot(item.i)}
  </div>
</div>
```

**After:**
```jsx
<div key={item.i} style={{ position: 'relative', borderRadius: 12, outline: … }}>
  {canEdit && (
    <div
      className="rgl-drag-handle"
      style={{
        backgroundColor: 'rgba(63,100,247,0.18)',
        borderBottom: '1px dashed rgba(63,100,247,0.3)',
        borderRadius: '12px 12px 0 0',   // ← top corners rounded
      }}
    >…</div>
  )}
  <div style={{
    height: canEdit ? 'calc(100% - 32px)' : '100%',
    overflow: 'hidden',
    borderRadius: canEdit ? '0 0 12px 12px' : 12,  // ← bottom-only in edit mode
  }}>
    {renderSlot(item.i)}
  </div>
</div>
```

**Result**: The outer div is `position: relative` so `react-resizable`'s
`position: absolute; bottom: 0; right: 0` handle resolves correctly. `overflow: hidden`
is on the *content* div only, so the handle at the bottom-right corner is never clipped.
The tile still appears fully rounded in both modes.

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/components/DashboardRGL.jsx` | Add `suppressToolbar` prop; restructure outer tile div |
| `client/src/pages/MainDashboard.jsx` | Add edit controls to SectionHeader action; pass `suppressToolbar` |
| `client/src/index.css` | Override `.react-resizable-handle` CSS for visibility |

---

## Out of Scope
- Delivery/QA/sub-dashboard pages — no changes
- Default layout `minH`/`minW` values — not changed (users can now actually resize, so
  the existing minimums can be assessed later if still too restrictive)
- `Set as Default` / `Reset to Default` success feedback — separate improvement, not part
  of this fix
