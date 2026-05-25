# Changelog

All notable changes to this project are documented here.

---

## [Unreleased] — branch `claude/kind-haibt-e9100a`

### Fixed (post-release)
- **Widget drag-to-position** — WidgetBank panel now sets `pointer-events: none` while a drag is in progress, letting `dragover`/`drop` events reach the grid underneath. Widgets can now be dragged from the bank and dropped at any position on the grid.

- **Tile minimum height** — `minH` lowered from 2 → 1 across all default layouts, `addWidget`, and saved-layout remap. KPI tiles can now be resized to 1 grid row (80 px) instead of being floored at 2 rows (172 px). Existing saved layouts are remapped on load so no manual reset is required.
- **Launcher deps** — `Launch App.vbs` and `Rebuild App.bat` now auto-install `server/node_modules` when missing, preventing the `Cannot find module 'dotenv'` startup error in fresh worktrees.

### Added
- **WidgetBank fixed overlay** — WidgetBank now renders as `position: fixed` panel (top: 4rem, right: 0, z-index 40) instead of a flex sibling. Eliminates the `-m-6 h-[calc(100vh-4rem)]` layout hack across all dashboard pages.
- **Overview edit controls in SectionHeader** — "Edit Layout / Done", "Set as Default", "Reset to Default", and toast feedback are now hosted in the SectionHeader action row on the Overview page. `DashboardRGL` on Overview receives `suppressToolbar={true}` so the built-in toolbar is hidden.
- **Admin-configurable widget label font size** — New `widget_title_size` setting (DB default: 12, range 8–32 px). Exposed in Settings → Display as a number input. Applied as CSS custom property `--p-widget-title-size` to KPI card labels, section header titles, drag handle labels, and CardLabel components in Delivery and QA pages.

### Changed
- **Export/Import button labels** — "Export System Config" → "Export System Update"; "Import System Config" → "Import System Update" in the Settings System Sync card.
- **AppShell main content scroll** — Changed `overflow-auto` → `overflow-y-auto` on the main content div, preventing horizontal scroll bleed from page content.
- **Dashboard page layout** — `DeliveryDashboard`, `QADashboard`, and `SubDashboardPage` now use a flat layout with no nested scroll container; AppShell's content div is the single scroll pane.

### Backend
- `server/src/db/init.js` — Added `['widget_title_size', '12']` to the settings defaults array.
- `server/src/routes/config.js` — Added `'widget_title_size'` to `KNOWN_SETTINGS_KEYS` so it is included in export/import.

---

## [2.4.9] — 2026-05-23

- Bump APP_VERSION to 2.4.9.
- Fix: allow widget removal from grid and prevent re-adding removed widgets.
- Fix: add-widget click button, overview edit layout toolbar, smaller min tile size.
- Fix: surface edit-layout controls in Overview SectionHeader, add toast feedback.
- Refactor: remove redundant isAdmin guard on Set as Default button.
