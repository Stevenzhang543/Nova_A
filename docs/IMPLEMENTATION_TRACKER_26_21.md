# Nova_A 26.21 acceptance tracker

Follow ROADMAP_26_21_TO_26_30.md, section 26.21. Each item below is an evidence requirement; final results live in the source-bound release qualification directory, not in a fabricated zero-defect total.

| Requirement | Implementation / evidence owner |
|---|---|
| Every source/control/conditional route indexed | inventory-v26.21 and audit-v26.21-surfaces; feature/source/panel inventories |
| Comparison and durable gaps | COMPETITIVE_REVIEW_26_21 and GAP_REGISTER_26_21 |
| Persisted/reset localized label preferences | preferences.ts, formLayoutCopy.ts, SettingsPanel; foundations regression and browser suites |
| Readable controls, full selected values, scalable hierarchy | editorReadability.css, selectValueDetails.ts, SceneSideBar; five-palette layout and actual input suites |
| Focused resize/save/maximize, visible float/redock, readable navigation | layout-user actual input suite; SideBar, EditorLayout, WorkspaceManager and scoped editor styles |
| Origin-scoped delayed mutations, disposal, independent inspector Undo | projectSession, projectMutationRouter, ConfigPanel; foundations regressions and browser checks |
| Migration and reference compatibility | nova_format, all-reference WASM importer; historical migration and retained suites |
| Six references, localized teaching, forty starters | deterministic generators, verify-only checks, all-starter creation/play/output gates |
| Retained scripting/media/world/network/renderer behavior | 26.21 focus bundle with original regression provenance |
| Save/reopen/export, merge/packages/menus, palette/quality | 26.21 authoring bundle and retained user-interaction gate |
| Exact source/build/release files | immutable snapshot, 21 qualification gates, package verifier and SHA-256 manifest |

External observations remain explicit: independent humans/assistive technology, unavailable platform/device environments, signing/disposable installs, hostile public networks and real-duration soak. Catalog coverage and accelerated tests do not substitute for these.
