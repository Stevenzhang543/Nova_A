# Nova_A 3.3.0 edit ledger

Source state: reviewed working-tree snapshot based on the repository HEAD recorded in build evidence; no signed tag was created.  
Schema: Project Format 2 remains at schema 23.  
Public contracts: Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged.  
Dependencies: no third-party dependency was added or removed.  
Removed user-visible features or animations: none.

## Added authoring architecture

- `src/editor/authoring2d.ts` — central object descriptors and one transactional factory; palette recents/favorites; layer colors; selection filters; snapping state; camera overlays; performance mode; align, distribute, mirror, rotate-90, group, frame, and isolate operations.
- `src/editor/componentPalette.ts` — grouped component compatibility, requirements, stable/experimental status, favorites, and recents.
- `src/editor/propertyMetadata.ts` — stable defaults, units, ranges, enum help, and inline descriptions for transform, authoring, sprite, canvas, parallax, and camera properties.
- `src/components/CreateObjectPalette.vue` — searchable keyboard-accessible grouped object palette with favorites, recents, compatibility, requirements, and experimental/package labels.

## World model, serialization, and renderer edits

- `src/world/Entity.ts` — adds typed 2D authoring metadata; separates local non-sprite origin `(0, 0)` from normalized sprite pivot `(0.5, 0.5)`.
- `src/world/components.ts` — adds open Line rendering and complete camera follow/smoothing/limits/margins/preview fields.
- `src/world/geometry.ts` — preserves open Line and Path vertex order instead of convex-hulling it.
- `src/world/hierarchy.ts` — supports explicit world-transform or local-transform reparenting.
- `src/world/World.ts` — synchronizes current engine metadata to 3.3.0.
- `src/store/physics.ts` — serializes, validates, defaults, and reloads complete authoring/camera metadata; preserves open line data; exposes new authoring tools and history transactions.
- `src/store/editor.ts` — adds palette, Inspector, hierarchy-filter, and authoring workspace state.
- `src/renderer/sceneRenderer.ts` — applies visibility, render-layer/Z/Y sorting, canvas-space, follow-camera, parallax, camera follow/smoothing/margins/limits/pixel alignment, and large-scene culling.
- `src/editor/gizmo.ts` — keeps transformed authoring bounds finite and consistent with the new tool set.

## Viewport and hierarchy edits

- `src/components/WorldCanvas.vue` — adds rectangle/path/polygon/collider/pivot/measure interaction, vertex handles, multi/box selection, selection filtering, seven snap modes, camera-frame overlays, ruler measurements, performance mode, one-step asset drop, and outside-only pixel-art selection outlines.
- `src/components/ToolBar.vue` — exposes all v3.3 tools, snapping, arrange commands, camera overlays, grouping, isolation, and performance controls.
- `src/components/SceneSideBar.vue` — adds Create Object, breadcrumbs, name/component/tag filtering with matching ancestors, status indicators, transactional rename/duplicate/reparent/reorder/group/delete, world/local reparent mode, and context actions.
- `src/components/ContextMenu.vue` — adds group, frame, isolate, hide, lock, and expanded authoring actions without removing existing commands.
- `src/layout/EditorLayout.vue` — mounts the universal Create Object palette in the editor shell.
- `src/components/CommandPalette.vue` — adds the global Create Object command.

## Inspector and component workflow edits

- `src/components/ConfigPanel.vue` — adds Inspector search/categories, mixed-value multi-edit, pinned/modified filters, property context actions, metadata help, generic origin, canvas and parallax controls, full camera controls, sprite modulation/flip/pivot/nine-slice controls, hierarchy/prefab status, and complete component lifecycle operations.
- `src/components/EditorBottomPanel.vue` — adds image import preview settings, transparent trim, atlas/sheet slicing, pivot presets, borders, and sprite-region creation while retaining every Assets/Console/Animation/Profiler/Tilemap/Settings/Build tab.
- `src/assets/types.ts` — extends image import metadata with sprite-sheet, trim, pivot, region, and border data.
- `src/assets/AssetDatabase.ts` — implements deterministic sprite slicing and transparent-trim metadata updates.

## UI, localization, and typography edits

- `src/i18n.ts` — adds all v3.3 object, palette, tool, snapping, Inspector, hierarchy, camera, sprite, canvas, parallax, and status strings in English, German, and Simplified Chinese; current release label becomes 3.3.0.
- `src/components/ProjectManager.vue`, `ScriptStudio.vue`, `StudioStatusDialog.vue`, `src/layout/TopBar.vue`, and `src/panels/SettingsPanel.vue` — synchronize release labels and retain the resizable maximized-window behavior.
- `src/components/ConfigPanel.vue`, `EditorBottomPanel.vue`, `SceneSideBar.vue`, `ToolBar.vue`, and related editor styles — raise remaining compact text to the enforced 11 px minimum and keep the multilingual rounded system font stack.

## Final display-correction edits

- `src/components/ToolBar.vue` — replaces the width-dependent side padding that compressed all controls into 760 px with a centered intrinsic-width `.toolbar-content`; toolbar children, segmented controls, menus, and camera fields cannot flex-shrink or wrap over adjacent controls, while narrow windows retain deliberate horizontal scrolling and existing responsive hiding rules.
- `src/layout/SideBar.vue` — widens the navigation rail from 68 px to 88 px so the full German `Einstellungen` label remains inside its button at every audited resolution.
- `src/components/ProjectHealthPanel.vue` — gives the scene-dependency disclosure an explicit 22 px minimum height, flex centering, and multilingual line height so Chinese glyphs are not vertically clipped.
- `scripts/qualify-layout-v3.3.mjs` — adds production-browser collision, uncontrolled text-overflow, viewport containment, console/fatal-surface, and screenshot qualification across English, German, Chinese, four resolutions, five workspaces, ten bottom panels, and four main pages.
- `package.json` — adds `qualify:v3.3:layout` as the repeatable browser-format qualification command.
- `scripts/audit-v3.3.mjs` — adds a permanent regression assertion for intrinsic toolbar width, non-shrinking controls, and removal of the faulty calculated padding.
- `release-audits/v3.3.0-layout-browser.json` and `release-audits/screenshots/v3.3.0/*` — record 69 passing states and the English/German/Chinese 1600×900 visual captures.

## Runtime and version edits

- `package.json` — version 3.3.0 plus v3.3 audit, live verification, benchmark, reference, evidence, and retained full-audit commands.
- `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, and `crates/nova_format/src/lib.rs` — synchronize package/native/format engine version 3.3.0; the window remains maximized, decorated, resizable, and not true fullscreen.
- `src/projects/projectFormat.ts`, `src/runtime/gameExporter.ts`, `novaPak.ts`, `packages.ts`, `replay.ts`, `shipping.ts`, and `testRunner.ts` — synchronize engine/release identifiers without changing schema or public API levels.
- `scripts/nova-export.mjs` — identifies current exports as engine 3.3.0 while keeping schema-23 guards.

## Documentation edits

- `README.md` and `README.zh-CN.md` — document the 3.3 authoring release, verification commands, references, and release packaging.
- `manual/MANUAL.en.md`, `MANUAL.de.md`, and `MANUAL.zh-CN.md` — add complete localized object creation, viewport, Inspector, sprite, camera, hierarchy, and performance workflows.
- `manual/index.html` — adds bookmarkable English/German/Chinese v3.3 manual sections and updates current-release metadata/navigation.
- `docs/BENCHMARKS.md`, `COMPATIBILITY.md`, `PROJECT_FORMAT_2_SCHEMA_23.md`, `STABILITY.md`, and `STABLE_CONTRACTS.md` — document current authoring/storage behavior, evidence boundaries, performance results, and unchanged stable contracts.

## Reference-project edits

- `scripts/export-reference-projects.mjs` — generates 3.3/schema-23 bundles and the six mandatory v3.3 references.
- Added `reference-projects/projects/authoring-pixel-art/*` — pixel-art import, filtering, pivot, and camera fixture.
- Added `reference-projects/projects/authoring-resolution-independent/*` — world-text and scalable-art fixture.
- Added `reference-projects/projects/authoring-parallax/*` — foreground/background parallax hierarchy fixture.
- Added `reference-projects/projects/authoring-multiple-cameras/*` — multiple active/preview camera fixture.
- Added `reference-projects/projects/authoring-nested-prefabs/*` — nested prefab identity/override fixture with valid asset hashes.
- Added `reference-projects/projects/authoring-5000-stress/*` — deterministic 5,001-entity navigation/render fixture.
- `reference-projects/README.md` — catalogs v3.3 references and validation commands.
- Existing generated project bundles under `reference-projects/projects/*` — regenerate current engine metadata as 3.3.0; their gameplay content is unchanged.

## Audit, benchmark, and evidence edits

- Added `scripts/audit-v3.3.mjs` — 15 static acceptance checks covering palettes, object types, viewport/snapping, non-overlapping responsive toolbar behavior, camera, canvas/parallax/origin, Inspector, components, sprite pipeline, hierarchy, renderer, persistence, and localization.
- Added `scripts/verify-v3.3.mjs` — production-module creation, component composition, scene round trip, reparent modes, undo/redo, safe multi-edit, metadata, pixel alignment, and all six reference validations.
- Added `scripts/benchmark-v3.3.mjs` — deterministic 5,000-object selection/search/visibility/serialization timings and documented platformer workflow result.
- Added `scripts/generate-v3.3-release-evidence.mjs` — build environment/provenance, SPDX 2.3 dependency inventory, localization/accessibility, platform scope, notices, and known-issue evidence.
- `scripts/stability-v3.mjs` — moves current bounded stability output and engine identity to 3.3.0.
- `scripts/audit-manual.mjs`, `audit-editor-shell.mjs`, `audit-v2.7.mjs`, `audit-v2.8.mjs`, `audit-v2.9.mjs`, `audit-v3.mjs`, `audit-v3.1.mjs`, and `audit-v3.2.mjs` — retain historical assertions while recognizing the current 3.3 release and manual metadata.
- `tests/fixtures/migrations/public-schema-expected.json` — updates expected current engine metadata to 3.3.0; schema behavior remains unchanged.
- `release-audits/v3.1.0-*` and `v3.2.0-*` generated reports — refreshed by the retained regression suite against the current build.
- Added `release-audits/v3.3.0-*` — authoring, transactions, pixel comparison, references, benchmark, timed workflow, stability, build/provenance, SPDX, platform, accessibility, known issues, notices, release notes, and this ledger.

## Deprecations, removals, and risk controls

- Deprecated internal object creation paths that bypass the central transaction/undo factory and Inspector properties without metadata. Existing user workflows route through the new authoritative paths.
- Removed duplicate UI-only creation shortcuts from the empty Inspector; the empty Inspector now opens the same complete Create Object palette used by Shift+A, Hierarchy, toolbar, and Command Palette.
- Removed user-visible features: none. Removed animations: none. Changed project schema: none. Changed stable APIs: none.
- Asset drop and object creation each record one undo transaction. Mixed-value editing writes only the chosen shared property. Reparent mode is explicit and undoable. Component removal checks required dependencies.
- Finite normalization, minimum sizes, stable UUIDs, unknown-field preservation, and schema-23 validation remain active at load/save boundaries.
- Production build advisories, incomplete cross-platform/signing qualification, and the bounded-versus-24-hour stability distinction are disclosed rather than suppressed.
