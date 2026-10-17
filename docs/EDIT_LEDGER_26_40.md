# Nova_A 26.40 — Edit ledger

Every source file changed from commit `74f8d2a` (the 26.39 code state handed over) to the 26.40 release, with the reason.

## Runtime, physics and Player

- `crates/nova_physics/src/world/persistent.rs` — Non-structural body changes (`upsert_body` with unchanged order and layer, `set_velocity`, material and other `update_body` commands) refresh that body inside the retained solver instead of rebuilding all bodies and dropping contact warm-start. Order, layer and body-set changes still rebuild. Tests: in-place refresh equals a full rebuild; layer/order still rebuild; velocity commands apply without a rebuild.
- `crates/nova_script/src/lib.rs` — `rustfmt` only (test code from the previous round).
- `src/runtime/runtimeWorldBootstrap.ts` — Keep the camera's class across `structuredClone` so pointer input in exported games can convert coordinates.
- `src/PlayerApp.vue` — Pass a real `Camera` instance as the runtime's initial camera.
- `src/runtime/buildSettings.ts` — The browser-hosted editor defaults new documents to the Web target.
- `src/runtime/gameExporter.ts` — A dismissed folder picker is a cancellation (`cancelBuild`), not a failure.
- `src/store/physics.ts` — Browser saving reuses the file handle chosen earlier in the same project session.
- `src/projects/projectManager.ts` — Current-schema projects without migration, lock or warnings open directly; the confirmation dialog is only mounted when there is something to confirm. A plain open is not logged as a migration.

## Editor interface

- `src/ui/tokens.css`, `src/ui/editor.css`, `src/ui/forms.css`, `src/ui/motion.css` — One design source: palette-derived surfaces, text and separators; desktop type scale and control geometry; compact density and increased contrast; primitives for buttons, fields, selects, checkboxes, switches, sliders, menus, dialogs; one motion vocabulary with reduced-motion behaviour. Checkboxes and radios are no longer limited to the width of a narrow property column.
- `src/layout/TopBar.vue`, `src/components/WorkspaceBar.vue`, `src/components/ActionBar.vue` — Single title bar with menus, segmented workspace switcher, project state, run capsule and command field; immediate switcher feedback before the workspace swap; menu transitions.
- `src/layout/EditorLayout.vue` — Removed the separate workspace row; tools and scene tabs share the viewport header; run state colours the viewport frame.
- `src/components/ToolBar.vue`, `src/components/SceneTabs.vue`, `src/components/LayerBar.vue`, `src/layout/SideBar.vue`, `src/layout/StatusBar.vue`, `src/components/PanelResizeHandle.vue` — Restyled to the new system; resize handles appear on hover.
- `src/components/SceneSideBar.vue`, `src/components/editorIconPaths.ts` — Type icons for hierarchy rows, removed the reserved empty breadcrumb row and inset, path bar footer, row heights follow the tokens.
- `src/components/ConfigPanel.vue`, `src/ui/components/UiPropertyRow.vue` — Inspector heading, wrapping categories, property reference information in tooltips, no duplicated units, default width 320 px.
- `src/components/WorldCanvas.vue` — Select tool drags selected objects after a 4 px threshold.
- `src/components/ProjectManager.vue` — Launcher layout; New Project with a pinned footer and a template detail pane; the suggested project folder follows the name until the location is edited.
- `src/components/PresentationPanel.vue` — UI workspace: counts as compact metric tiles, UI hierarchy as list rows, preview options (scale, safe area, RTL) laid out inline; checkboxes there were squeezed to a 2 px line.
- `src/components/CommandPalette.vue`, `src/components/EditorFeedback.vue`, `src/components/EditorBottomPanel.vue`, `src/components/BuildSettingsPanel.vue`, `src/components/NetworkStudioPanel.vue`, `src/components/PhysicsSettingsPanel.vue`, `src/panels/SettingsPanel.vue` — Restyled; bottom dock keeps every tool one click away at medium widths; filled primary actions use the accent fill.
- `src/store/editor.ts` — Default hierarchy and inspector widths for the new density.
- `src/App.vue`, `src-tauri/capabilities/default.json` — Closing the editor with unsaved project changes asks first: an in-app confirmation for the desktop window (the window is then destroyed, which needs `core:window:allow-destroy`), the browser's leave prompt on the Web.
- `src/i18n.ts` — Strings for Saved/Edited, Export cancelled and the quit confirmation (en/de/zh).

## Build, release and tests

- `vite.config.ts` — The development watcher ignores release, audit, cache and build trees.
- `docs/WEB_HOSTING_26_40.md` — Regenerated from the 26.38 notes as UTF-8 (the previous file was garbled).
- `docs/RELEASE_NOTES_26_40.md`, `docs/EDIT_LEDGER_26_40.md` — This release's notes and ledger.
- `scripts/build-release-26.40.cmd` — One Windows build: `pnpm build`, `pnpm tauri build`, packaging, with a log.
- `scripts/package-release-26.40.cmd` — Repackage from the existing build outputs when only release documents changed.
- `scripts/package-release-26.40.ps1` — Assembles the eleven-file set from one build, checks exact Windows product versions and freshness, stages before publishing. Archives use forward-slash entries and fixed timestamps like the 26.38 packager; the Web archive carries README, release metadata and its own checksum list; checksum files use LF line endings so `sha256sum -c` works. Replaces the two previous 26.40 packaging scripts (`package-release-26.40-stage2.ps1` removed).
- `scripts/lib/browserUserAudit.mjs` — `NOVA_AUDIT_BROWSER` selects a Chromium executable where Edge is not installed.
- `scripts/verify-2640-editor-workflow.mjs` — Regression test for the 26.40 editor fixes with real input, including the leave prompt.
