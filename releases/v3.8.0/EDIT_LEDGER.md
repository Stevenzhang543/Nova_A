# Nova_A 3.8.0 exhaustive edit ledger

## World data and runtime

- **src/world/components.ts:** added tile layer blend/parallax/z/bake/transform data; navigation mode/masks/source/radius/links; obstacle/agent avoidance data; world-cell ownership/dependencies/prefetch/cache/save metadata; and pool reset/lifetime/counters.
- **src/runtime/tilemap.ts:** upgraded TileSet normalization to v2; added multi-atlas/region/animation/variant/transform rendering, terrain rules, complete paint/selection/clipboard tools, layer-aware baking, chunk read/write, metadata lookup, bounded scene/prefab placement descriptors and diagnostics. Million-tile chunk access uses a structural fast path instead of renormalizing the full map.
- **src/runtime/navigation2d.ts:** added clearance-aware grid baking, polygon visibility A*, links/costs/masks, TileMap costs and transformed navigation polygons, dynamic obstacles, avoidance metrics, rebake/clear and profiling.
- **src/runtime/worldStreaming.ts:** added the bounded asynchronous cell lifecycle, non-recursive retarget cancellation, dependency prefetch, atomic dependency-closure budget reservation, budget-safe cache retention, member activation, save handoff and event/memory statistics.
- **src/runtime/worldGameplay.ts:** made navigation and world-cell execution core; retained optional lazy AI; connected streaming stats and reset.
- **src/runtime/saveGame.ts:** replaced the legacy save path with bounded deterministic migrations, envelope checksum, journal/temp/backup verification, recovery, async progress/cancel, custom serializers, metadata and platform location.
- **src/runtime/objectPool.ts:** added transform/physics, full-state and custom-signal reset contracts, lifetime expiry and created/reused/leak diagnostics.
- **src/runtime/packages.ts:** added official optional AI 3.8, Object Pool 3.8 and Streaming Tools 3.8 manifests while retaining old package compatibility.

## Editor, rendering and examples

- **src/components/TilemapPanel.vue:** added all Tilemap 2.0 tools, multi-source atlas/slicing controls, animation/variants, brush transforms/randomization, terrain preview, per-tile polygons/metadata/scene data, rich layers, bake and diagnostics.
- **src/components/WorldComponentsInspector.vue:** added focused navigation, streaming, AI and pool component editing, package prompts, diagnostics and profiles.
- **src/components/ConfigPanel.vue:** mounted the focused world-component Inspector and hid package component creation until its optional package is enabled.
- **src/components/EditorBottomPanel.vue, src/store/editor.ts, src/editor/workspaces.ts, src/components/CommandPalette.vue:** removed the visible monolithic World Tools dock, added contextual Tilemap discovery, safe tab fallback and legacy-layout migration.
- **src/components/SaveDataSettings.vue:** added async progress/cancel, recovery, metadata, location and slot list to the Debug Save Inspector; corrected the Chinese slot-summary line box and made long slot metadata wrap safely.
- **src/components/ProjectHealthPanel.vue:** added world extent, tile/chunk/navigation and streaming-memory health metrics.
- **src/components/WorldCanvas.vue:** added state-colored streaming-cell preview labels and preserved navigation/tile debug overlays.
- **src/renderer/sceneRenderer.ts:** passed camera position into parallax-aware tile chunk generation.
- **src/projects/templates.ts:** upgraded Platformer and Top-down to layered TileSet v2 assets, TileMap2D and NavigationRegion2D demonstrations.
- **src/i18n.ts:** added English, German and Chinese labels for every 3.8 editor control.

## Format, version and qualification

- **crates/nova_format/src/lib.rs:** advanced to engine 3.8/schema 28; added TileSet/world-component migration and preservation tests. The public-schema fixtures now cover and target schema 28.
- **Version and release authorities:** src/projects/projectFormat.ts, scripts/nova-export.mjs, scripts/package-release.ps1, package.json, workspace/Tauri Cargo manifests, both Cargo lockfiles and Tauri config synchronize engine 3.8/schema 28 and release commands.
- Rust workspace files already changed for retained physics/runtime/script/WASM work were normalized with **cargo fmt**; no physics formula or public ABI was removed by formatting.
- **scripts/export-reference-projects.mjs:** added seven source references for multilayer/terrain/animated tilemaps, navigation, streaming, save migration and optional pool removal; generated reference bundles were refreshed to 3.8/schema 28.
- **v3.8 qualification scripts:** verify-v3.8.mjs, audit-v3.8.mjs, qualify-layout-v3.8.mjs, verify-v3.8-windows.mjs and generate-v3.8-release-evidence.mjs add headless runtime, static, layout, Windows startup and release-evidence qualification. The suite covers million-tile edit/save/reopen/runtime access, TileMap navigation transforms/costs, pool reset/leak, package enable/disable/upgrade/removal, CI/unit/E2E/migration/performance/security summaries, SBOM and platform provenance. Retained audits were updated only for current version/schema and the intentional World Tools replacement.
- **scripts/package-release.ps1:** synchronized schema 28 metadata and keeps only the eleven mandatory top-level release artifacts; detailed SBOM, notices, migration, limitations and raw reports remain inside the evidence ZIP.
- **Documentation:** README.md, README.zh-CN.md, docs/WORLD_DATA_3_8.md, docs/PROJECT_FORMAT_2_SCHEMA_28.md, compatibility/stable-contract docs and all three Markdown/HTML manuals document every new workflow, migration and limit.
- **Generated artifacts:** release-audits/v3.8.0-* and releases/v3.8.0/* contain reports, screenshots where available, notes, ledger, migration/deprecation/known-issue documents, SBOM, installers, archives and checksums.

No rendering, animation, physics, scripting, audio, UI, plugin, project or supported export feature was deleted. The only retired surface is the duplicated monolithic World Tools dock; its functions moved to contextual and searchable workflows, and legacy layouts migrate safely.
