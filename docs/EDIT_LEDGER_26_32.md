# Nova_A 26.32 edit ledger

Public release **26.32**, engine **26.32.0**. Changes are measured against the final26.31 source snapshot (`dc84838e15ac1aa0121321c5594cb7c9d2dc13defe339dc38e3dbf4079e027b0`), not against the older Git HEAD. Earlier26.31 work and release files are preserved.

Before changing presentation, the owning components, handlers, layout cascade and source/player boundary were inspected. No engine algorithm, project schema or serialized value-binding is intentionally replaced. The GUI reference study and form design record the reasons and consequences.

## Files changed/added

This deterministic path-level manifest lists every authored file changed from26.31. The final source snapshot and release evidence provide exact bytes and hashes. Generated WASM, web/native binaries, screenshots, audit reports and release archives are separately inventoried; they are rebuilt and never relabeled from an older release.

- `Cargo.lock` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `Cargo.toml` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `LICENSE.md` — Modified. Include Godot icon copyright/permission notice and qualify inherited historical SBOM wording.
- `README.md` — Modified. Add current26.32 entry and mark26.31 historical; preserve previous documentation.
- `crates/nova_format/src/lib.rs` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `docs/COMPETITIVE_REVIEW_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/EDIT_LEDGER_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/EDIT_ROUTE_INVENTORY_26_32.json` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/FEATURE_INVENTORY_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/FIELD_BINDING_INVENTORY_26_32.json` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/FORM_DESIGN_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/GODOT_UI_REFERENCE_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/ISSUE_CLOSURE_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/NATIVE_HEADLESS_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/PANEL_INVENTORY_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/RELEASE_NOTES_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/SOURCE_INVENTORY_26_32.json` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/SOURCE_MAP_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/UI_AUDIT_PLAN_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `docs/WEB_HOSTING_26_32.md` — Added. Add current research, design, scope, release, feature/panel/source inventory or this exhaustive ledger; distinguish source declarations from executed evidence.
- `manual/MANUAL.de.md` — Modified. Update current public/machine release headings; preserve existing localized lessons and anchors.
- `manual/MANUAL.en.md` — Modified. Update current public/machine release headings; preserve existing localized lessons and anchors.
- `manual/MANUAL.zh-CN.md` — Modified. Update current public/machine release headings; preserve existing localized lessons and anchors.
- `manual/index.html` — Modified. Update current public/machine release headings; preserve existing localized lessons and anchors.
- `package.json` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `public/third-party/godot-editor-icons-LICENSE.txt` — Added. Add exact Godot MIT notice or source/hash/adaptation manifest; redistributed with web/native assets.
- `public/third-party/godot-editor-icons.json` — Added. Add exact Godot MIT notice or source/hash/adaptation manifest; redistributed with web/native assets.
- `reference-projects/projects/creator-v2632-mixed-game/README.md` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/creator-v2632-mixed-game/expected-output.json` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/creator-v2632-mixed-game/project.nova` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/creator-v2632-mixed-game/test-controls.json` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/server-v2632-headless-authority/README.md` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/server-v2632-headless-authority/expected-output.json` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/server-v2632-headless-authority/project.nova` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `reference-projects/projects/server-v2632-headless-authority/test-controls.json` — Added. Add current26.32 copy of existing mixed-game/authority fixtures; synchronize all authored export identities without changing gameplay.
- `scripts/generate-panel-inventory-26.32.mjs` — Added. Add current26.32 inventory/qualification or retained runtime/static-host regression wrapper; preserve historical scripts and actual artifact/source checks.
- `scripts/inventory-v26.32.mjs` — Added. Add current26.32 inventory/qualification or retained runtime/static-host regression wrapper; preserve historical scripts and actual artifact/source checks.
- `scripts/lib/browserUserAudit.mjs` — Modified. Permit26.32 qualification target while retaining actual source/build identity checks and historical ranges.
- `scripts/prepare-release-26.32.mjs` — Added. Add current26.32 inventory/qualification or retained runtime/static-host regression wrapper; preserve historical scripts and actual artifact/source checks.
- `scripts/qualify-v26.32-scoped.mjs` — Added. Add current26.32 inventory/qualification or retained runtime/static-host regression wrapper; preserve historical scripts and actual artifact/source checks.
- `scripts/verify-v26.32-layout-user.mjs` — Added. Add per-route screenshots, actual nested navigation, field containment/length checks, dialogs and resize/undo/redo/save regression; retain failures.
- `scripts/verify-v26.32-native-headless.mjs` — Added. Add current26.32 inventory/qualification or retained runtime/static-host regression wrapper; preserve historical scripts and actual artifact/source checks.
- `scripts/verify-v26.32-static-host-user.mjs` — Added. Add current26.32 inventory/qualification or retained runtime/static-host regression wrapper; preserve historical scripts and actual artifact/source checks.
- `src-tauri/Cargo.lock` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `src-tauri/Cargo.toml` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `src-tauri/tauri.conf.json` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `src/assets/editorForms.css` — Added. Add bounded typed fields/sliders, start/end alignment, wrapping numeric groups and responsive label/value grids; preserve bindings and source-editor exceptions.
- `src/assets/editorStudio.css` — Added. Add flatter editor surfaces, compact radii/heights, readable section rules, horizontal Manage categories and compact context rail; editor-only styling.
- `src/components/ActionBar.vue` — Modified. Use consistent playback SVG and accessible pressed states; preserve playback handlers and responsive status.
- `src/components/EditorBottomPanel.vue` — Modified. Keep directly visible scrollable icon/label tabs until narrow hosts, use SVG asset/dock controls and bound searches; preserve tools and actions.
- `src/components/EditorIcon.vue` — Modified. Add typed shared icons with ten attributed Godot geometries and original Nova icons; decorative SVG inherits accessible button naming.
- `src/components/EventSheetEditor.vue` — Modified. Wrap full event-provenance identifiers inside shrinkable grid cells, preventing cross-column text collisions without changing handlers or inheritance.
- `src/components/ManageWorkspace.vue` — Modified. Replace category glyphs with typed SVG; shared style reorganizes navigation without changing lazy-loaded tool ownership.
- `src/components/ProfilerPanel.vue` — Modified. Name the annotation input/action row so its scoped two-column layout prevents vertical stretching; preserve text entry and submission bindings.
- `src/components/WorkspaceBar.vue` — Modified. Replace navigation glyphs with SVG and compact grouped workspace/menu controls; preserve history, visibility and workspace actions.
- `src/layout/SideBar.vue` — Modified. Replace context/action glyphs with typed SVG, retaining translated labels, selected states and original callbacks.
- `src/main.ts` — Modified. Import the editor visual and form systems after legacy readability rules; player entry remains separate.
- `src/projects/projectFormat.ts` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.
- `tests/fixtures/migrations/public-schema-expected.json` — Modified. Synchronize release authority to26.32/26.32.0 across frontend, Rust, Tauri, lockfile or expected migration metadata; preserve schema29.


## Qualification policy

Run visual/editor and release-integrity checks linked to the refresh. Current Windows/Web/WASM builds and Rust tests validate version/package boundaries; browser checks validate control reachability, containment, pending edits, history and save/export. Native tools required by the reference archive are freshly exercised. Unchanged exhaustive performance, long-duration soak and unrelated platform/security matrices remain explicitly unrun. Final status is determined by the packaged executed-gates report, not this intended plan.
