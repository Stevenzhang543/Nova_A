# Phase II engine capability audit — target 26.33

Status: scoped 26.33 regression closure; broader acceptance limits remain explicit. Baseline commit 050ed885c9d1bdb151eef3ab136c98cd121c848f (GUI full upgrade), clean before this phase. The existing editor design system is retained. Hierarchy, save transactions, Play input ownership and joint registry integration were repaired; detailed evidence follows.

## Evidence rules

A named type or historical release claim is discovery evidence, not completeness. Each capability must trace runtime, persistence, editor/undo, failure handling, docs and executed tests. COMPLETE requires applicable acceptance criteria and current-source evidence; PARTIAL includes explicitly unvalidated integration. Deferred advanced work must have a reason.

## Repository ownership and architecture

- src/world: TypeScript entity/component/scene model and world-to-WASM bridge.
- src/runtime: game systems, scripting host, lifecycle, assets/resources, save and export services.
- src/renderer: Canvas2D/WebGL2 backends and camera/material/light/render graph infrastructure.
- src/assets and src/projects: asset database/import pipeline and project/schema/archive lifecycle.
- src/store/physics.ts: editor authoring/history/play orchestration; a major shared integration boundary to inspect carefully.
- src/components, src/layout, src/panels, src/ui: Vue editor and centralized presentation system. PlayerApp is a separate exported-game entry.
- crates/nova_math, nova_physics, nova_runtime, nova_script, nova_format: Rust math/solver/runtime/Rhai/schema implementations. nova_wasm exposes the browser bridge; nova_headless is physics-oriented, not assumed to be a full game runtime. nova_core is a compatibility crate.
- src-tauri: native filesystem/window/project/build operations.
- scripts/tests/reference-projects: automated checks, fixtures, reference games and build/release tooling.
- godot-master is third-party reference source; node_modules, target, dist and nova_core/pkg are dependencies/generated outputs; releases contains immutable historical packages. They are not parallel maintained engine implementations.

The reproducible SOURCE_INVENTORY.json indexes 434 owned source files / 95,386 lines and 633 existing verification/audit entrypoints. Import/symbol indexing is not a claim that all branches have been reviewed or executed.

## Initial traces and candidate risks

- Entity component map retains removed records for history; lifetimes use WeakMap generations and unwrap Vue proxies. Inspect scene/pool transitions for stale-handle revival.
- World drives Rust WASM, translates collider/connection buffers and events, and feeds tile collision descriptors. Runtime gameplay composes scripting/input/media/UI/nav. A type-only check cannot validate these bridges.
- hierarchy.ts composes signed TRS and caches UUID lookup using array identity/length/endpoints. Same-length middle replacement and rotated nonuniform ancestry require explicit tests before any architectural change. No defect is asserted yet.
- Scene transition prepares and validates a transaction before world replacement and restores on failed commit; inspect persistent children and additive streaming separately.
- saveGame.ts has a distinct bounded/checksummed runtime envelope; verify malformed/quota/migration paths and reopen, not only project serialization.
- Many historical frontend suites have version gates or old editor selectors. Establish which assertions still apply; do not relabel stale evidence as 26.33.

## Category investigation map

### A. Core scenes and objects

Owners: `src/world/Entity.ts`, `src/world/SceneManager.ts`, `src/runtime/runtimeSceneTransition.ts`, `src/runtime/runtimeSceneStreaming.ts`, `src/runtime/prefabs.ts`, `src/runtime/sceneInstances.ts`, `src/runtime/entityLifetimes.ts`.
Editor search targets: HierarchyPanel, SceneTabs, ObjectBlueprintPanel.
Acceptance scope: Stable identities, component lifetime, scene transaction rollback, nested reuse, clone/reference repair.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### B. Transforms

Owners: `src/world/Transform.ts`, `src/world/hierarchy.ts`, `src/world/geometry.ts`.
Editor search targets: ConfigPanel, viewport gizmos.
Acceptance scope: Parent propagation, signed scale, local/world inversion, reparent preservation, hierarchy-cache invalidation.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### C. 2D rendering

Owners: `src/renderer/sceneRenderer.ts`, `src/renderer/Canvas2DRenderer.ts`, `src/renderer/WebGL2Renderer.ts`, `src/renderer/renderTextures.ts`.
Editor search targets: RenderingSettingsPanel, ConfigPanel.
Acceptance scope: Sprites/regions/tint/order, backend parity, culling, sampling, primitives, resource lifetime.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### D. Cameras

Owners: `src/renderer/cameraMath.ts`, `src/renderer/sceneRenderer.ts`, `src/world/components.ts`.
Editor search targets: RuntimeComponentsInspector.
Acceptance scope: Follow/smoothing/bounds/shake/viewports and coordinate conversion.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### E. Texture and sprite pipeline

Owners: `src/assets/AssetDatabase.ts`, `src/assets/importPipeline.ts`, `src/assets/contentInteroperability.ts`, `src/assets/derivedSprites.ts`.
Editor search targets: EditorBottomPanel, ImportedAssetBindings.
Acceptance scope: Import/reimport identity, atlas regions, missing inputs, cache eviction and persistent references.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### F. Animation

Owners: `src/runtime/animation.ts`, `src/runtime/rigging.ts`, `src/runtime/timeline.ts`, `src/runtime/animationProduction.ts`.
Editor search targets: AnimationPanel.
Acceptance scope: Signed playback, interpolation/events/state transitions, serialized clips, preview and runtime agreement.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### G. Physics 2D

Owners: `src/world/World.ts`, `src/runtime/physics2d.ts`, `src/runtime/physicsGeometry.ts`, `src/runtime/worldGameplay.ts`.
Editor search targets: PhysicsSettingsPanel, RuntimeComponentsInspector.
Acceptance scope: Rust solver bridge, bodies/shapes/joints/queries/events, character collision, units and determinism.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### H. Tilemaps

Owners: `src/runtime/tilemap.ts`, `src/runtime/tileSceneRuntime.ts`, `src/assets/tiledInterchange.ts`.
Editor search targets: TilemapPanel, WorldToolsPanel.
Acceptance scope: Layers, paint/fill/selection, atlas transforms, terrain, animation, collision/nav/occlusion and large maps.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### I. Lighting

Owners: `src/renderer/lighting2d.ts`, `src/renderer/sceneRenderer.ts`.
Editor search targets: RenderingSettingsPanel, RuntimeComponentsInspector.
Acceptance scope: Light type/mask/attenuation/occlusion, fallback parity; advanced normal-map support needs explicit scope.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### J. Materials and shaders

Owners: `src/renderer/materials.ts`, `src/renderer/materialGraph.ts`, `src/renderer/WebGL2Renderer.ts`.
Editor search targets: MaterialGraphPanel.
Acceptance scope: Real parameter consumption, reusable resources, fallback diagnostics and authored shader restrictions.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### K. Particles

Owners: `src/runtime/particles.ts`, `src/renderer/particleGraph.ts`.
Editor search targets: ParticleGraphPanel, RuntimeComponentsInspector.
Acceptance scope: Emitter lifecycle, lifetime curves, deterministic randomness, coordinate spaces and preview.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### L. Navigation

Owners: `src/runtime/navigation2d.ts`, `src/runtime/navigationGeometry.ts`, `src/runtime/aiTools.ts`.
Editor search targets: WorldToolsPanel.
Acceptance scope: Path queries, obstacle changes, agent movement and actual debug display.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### M. Audio

Owners: `src/runtime/audio.ts`, `src/runtime/audioBuffers.ts`.
Editor search targets: AudioSystemPanel, RuntimeComponentsInspector.
Acceptance scope: Loading/cache, pause/stop/loop/pitch/buses, 2D attenuation and scene lifetime.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### N. Input

Owners: `src/runtime/input.ts`, `src/runtime/deviceInput.ts`, `src/runtime/inputModality.ts`.
Editor search targets: DevicePreviewPanel, PhysicsSettingsPanel.
Acceptance scope: Named action edges/axes, consumption, remapping, device fallback and project persistence.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### O. Scripting and logic

Owners: `src/runtime/GameplayRuntime.ts`, `src/runtime/scriptModules.ts`, `src/runtime/scriptHotReload.ts`, `src/runtime/eventSheets.ts`.
Editor search targets: ScriptWorkspace, EventSheetPanel, VisualGraphPanel.
Acceptance scope: Rhai lifecycle/host APIs, error isolation, hot reload, graph/event interoperability.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### P. Signals and events

Owners: `src/runtime/GameplayRuntime.ts`, `src/runtime/eventSheets.ts`, `src/runtime/entityLifetimes.ts`.
Editor search targets: EventSheetPanel, ObjectBlueprintPanel.
Acceptance scope: Payload/subscription identity, unsubscribe, destruction and pooled lifetime safety.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### Q. Resources

Owners: `src/runtime/resources.ts`, `src/runtime/dataResources.ts`, `src/assets/assetReferences.ts`, `src/assets/assetGraph.ts`.
Editor search targets: EditorBottomPanel, ImportedAssetBindings.
Acceptance scope: Stable asset references, inheritance, rename/move/delete and dependency closure.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### R. Game UI

Owners: `src/runtime/gameUi.ts`, `src/runtime/uiLayout.ts`, `src/runtime/uiNativeInput.ts`, `src/runtime/uiAccessibility.ts`.
Editor search targets: PresentationPanel, RuntimeComponentsInspector.
Acceptance scope: HUD/menu controls, anchors/layout/focus/events, exports and pointer/gameplay consumption.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### S. Text and fonts

Owners: `src/runtime/uiTextLayout.ts`, `src/runtime/uiTextPresentation.ts`, `src/renderer/sceneRenderer.ts`.
Editor search targets: PresentationPanel, RuntimeComponentsInspector.
Acceptance scope: Font loading/fallback, Unicode, wrapping, alignment and measurement.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### T. Runtime saves

Owners: `src/runtime/saveGame.ts`, `src/runtime/GameplayRuntime.ts`.
Editor search targets: SaveDataPanel.
Acceptance scope: Per-project slots, validation/checksum/migration/rollback; distinct from editor project files.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### U. Project settings

Owners: `src/projects/projectData.ts`, `src/runtime/buildSettings.ts`, `src/runtime/production.ts`, `src/store/physics.ts`.
Editor search targets: BuildSettingsPanel, PhysicsSettingsPanel.
Acceptance scope: Startup scene, output/window settings, input/physics/audio persistence.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### V. Build/run/export

Owners: `src/runtime/gameExporter.ts`, `src/runtime/webArchive.ts`, `src/runtime/exportTemplates.ts`, `src/runtime/deliveryPipeline.ts`.
Editor search targets: ToolBar, BuildSettingsPanel.
Acceptance scope: Play restore/restart, actual assets/player closure, Web/Windows launch; no untested platform claims.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### W. Debugging

Owners: `src/runtime/scriptDebug.ts`, `src/runtime/physicsDebug.ts`, `src/runtime/dynamicInspection.ts`, `src/runtime/faultCenter.ts`.
Editor search targets: ConsolePanel, ScriptWorkspace, PhysicsRuntimePanel.
Acceptance scope: Real logs/errors/stacks/breakpoints/live inspection and collision diagnostics.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### X. Profiling

Owners: `src/runtime/profiler.ts`, `src/runtime/performanceTools.ts`, `src/runtime/largeWorldPerformance.ts`.
Editor search targets: ProfilerPanel.
Acceptance scope: Measured timing/counters, representative loads, scene-cycle resource growth.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### Y. Editor history

Owners: `src/store/physics.ts`, `src/runtime/projectTransactions.ts`, `src/runtime/projectMutationRouter.ts`.
Editor search targets: UndoPanel, ConfigPanel, TilemapPanel, AnimationPanel.
Acceptance scope: Atomic edits, drag grouping, cross-resource drafts, undo/redo and reopened projects.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

### Z. Editor workflows

Owners: `src/editor/selection.ts`, `src/editor/commands.ts`, `src/projects/projectManager.ts`.
Editor search targets: HierarchyPanel, CommandPalette, ProjectManager.
Acceptance scope: Selection/reparent/clipboard/drop/search/shortcuts/recovery; dedicated UX phase follows engine.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress. Workspace owner resolved: src/editor/workspaces.ts.

### AA. Additional 2D capabilities

Owners: `src/runtime/worldGameplay.ts`, `src/runtime/objectPool.ts`, `src/runtime/time.ts`, `src/runtime/replay.ts`, `src/runtime/localization.ts`, `src/runtime/plugins.ts`.
Editor search targets: WorldToolsPanel, PluginSettingsPanel.
Acceptance scope: Parallax/path/canvas layers, timers/tasks, seeded math, pooling, localization and extension scope.
Status: PARTIAL — implementation exists; detailed trace and Phase II execution remain in progress.

## P0-HIERARCHY-01 — reproduced stale parent identity

Status: FIXED; seven production-module regression checks pass. Browser prefab authoring remains a separate acceptance item.

Actual bundled modules report a child world X of 12 after its parent is replaced at the same array index with a same-UUID parent at X=20; expected X is 22. After another replacement and World.invalidateRuntime(), the result remains 22 instead of 32. Evidence: reports/phase2/baseline/hierarchy-replacement-probe.json. Prefab apply/revert/reset use the same in-place replacement pattern, and invalidateHierarchyIndex currently has no callers.

Acceptance: same-length middle replacement, UUID replacement/removal, reorder and ordinary signed-transform conversions use current entities; valid unchanged lookups retain constant-time indexing; prefab reset/apply and history remain compatible. No schema, local transform convention or solver-math change. Add regressions before fixing. Evaluate invalidation at World runtime reset plus identity-checked indexed resolution so correctness does not depend only on array endpoints. Nonuniform rotated ancestor shear is a separate architectural question, not bundled into this fix.

## P0-SAVE-01 — runtime save correctness

Ten real-module checks reproduced and now pass selected-slot persistence, custom serializer roundtrip, cleanup refusal after verified commit/load, interrupted primary writes, backup recovery, obsolete recovery invalidation, schema migration and cancellation. Production owner: src/runtime/saveGame.ts. The stored envelope remains v2; `_custom.` is already the normalized persisted namespace, so the fix restores existing stored custom values rather than migrating data. Evidence: reports/phase2/runtime-save.json and preserved baseline failures. This is not native storage certification. Serializer callbacks are application code; rollback of arbitrary side effects is not guaranteed.

## P0-INPUT-01 — editor/game keyboard ownership

A fresh top-down starter failed W movement in Design while Play remained active. ToolBar.handleShortcut consumed W before runtime input could sample it. Authoring shortcuts now run only in Edit mode. The real browser regression verifies W/S movement and Q/W authoring shortcuts after Stop. No binding schema or gameplay action names changed.

## Representative workflow execution

Fresh platformer, top-down and responsive-UI projects were created via launcher controls, saved to actual files, reopened, compared, played, rendered and stopped. All three pass with no uncaught browser exceptions. Embedded JSON asset key ordering is canonicalized on import, so comparisons decode JSON while preserving every value. This establishes startup/persistence/input integration, not full game completion, exhaustive UI interaction or all platformer mechanics. Evidence: reports/phase2/browser/v26.32-phase2-workflows.json. Version is still the development source version until final 26.33 release qualification.
