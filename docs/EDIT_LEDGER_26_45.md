# Nova_A 26.45 — Edit ledger

Every file changed from the 26.44 release to 26.45, with the reason. The plan and status are in `docs/DEV_PLAN_26_45.md`. Nothing was committed, staged or tagged; all changes are in the working tree for the maintainer to commit.

## Version

- `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `crates/nova_format/src/lib.rs`, `src/projects/projectFormat.ts`, `tests/fixtures/migrations/public-schema-expected.json` — Engine 26.45.0 / release 26.45. Project format 2 / schema 29 unchanged.
- `docs/DEV_PLAN_26_45.md` (new), `docs/EDIT_LEDGER_26_45.md` (new), `docs/RELEASE_NOTES_26_45.md` (new), `docs/WEB_HOSTING_26_45.md` (new: the 26.44 guide plus the compatibility Player page and the stored player bindings).

## Cleanup

Chosen by the maintainer: delete `reports/`, `Claude outputs/`, `nova/` (the 26.35 website delivery), the verify scripts of v6–v26.39 the current checks do not use (with their npm entries, fixtures and helpers) and the version documents of 26.39 and earlier; delete untracked leftovers; keep reusable caches. `AGENTS.md` had been deleted by the maintainer and stays deleted.

- Deleted, tracked (2,104 files): `reports/` (261), `nova/` (293), `Claude outputs/` (6), 1,124 files under `scripts/` (one-off verify, inventory and evidence scripts of v6–v26.39, the per-version `build-release-26.4x.cmd` / `package-release-26.4x.cmd/.ps1`, their `scripts/lib` helpers and `scripts/fixtures` data), 417 documents under `docs/` (release notes, ledgers, plans, audits and hosting notes of 26.39 and earlier; `docs/engine/EDIT_LEDGER_26_33.md`, `docs/engine/N0_COMPONENT_AUDIT_26_39.md`, `docs/engine/SOURCE_INVENTORY.json`), `src/runtime/dynamicObjects.ts` (a legacy facade nothing imported) and `src/runtime/saveGame.ts` (moved, see below).
- Deleted, untracked on the build machine: `release-audits/`, `dist/`, export files written into the repository root (a game exported with the repository as its output folder), the one-off files in `.cache/` (reusable caches kept: `node_modules`, `.pnpm-store`, the Rust `target` folders, `.nova-build-cache`).
- `scripts/release.cmd`, `scripts/build-release.cmd`, `scripts/package-release.cmd` (new), `scripts/package-release.ps1` — One release script set for every version (the label comes from `package.json`) instead of a copy per version; `release.cmd` runs every check (now also the desktop host's tests and the repository checks), builds and packages; it never commits. The Web package's font licences are copied from the `@fontsource-variable` packages (they had come from the removed website delivery folder; the first packaging run failed on this and was repeated without rebuilding).
- `scripts/generate-component-primitives.mjs`, `scripts/generate-component-enums.mjs`, `scripts/fixtures/component-property-dispositions.mjs` (new) — The component generators and their fixture without the old version in the name (were `generate-v26.22-*` and a v26.22 fixture).
- `package.json` — Scripts trimmed to the 35 that exist (`release`, `release:package` instead of per-version entries; removed entries pointed at deleted scripts).
- `.gitignore` — Rewritten: Git holds code, the resources the build needs and documentation; everything generated, cached, packaged, exported into the repository root or private stays out. `/godot-master` without a trailing slash, so the user's symbolic link is ignored too.
- `scripts/audit-repository-hygiene.mjs` — Checks the new required rules and protected paths (the protected licence file is the Godot icon licence that `public/third-party` actually holds).
- `scripts/verify-template-catalog.mjs` — The physics-precision markers follow the 26.44/26.45 solver (`directional_inverse_mass`, the 2×2 block solve).
- `scripts/generate-rhai-api-signatures.mjs` — Finds its Rust helper without the deleted per-version tool path.
- `scripts/lib/browserUserAudit.mjs`, `scripts/verify-v26.12-api-signatures.mjs` — No references to deleted helpers.
- `README.md`, `README.zh-CN.md`, `reference-projects/README.md` — Links to deleted documents removed; the Chinese README rewritten after the English one; validation commands and contributing notes current.
- `docs/LAYOUT_ENGINE_STAGE.md`, `docs/PHYSICS_2D.md`, `docs/QUICKSTART_26_42.en.md`, `docs/QUICKSTART_26_42.zh.md`, `docs/RENDERER_STAGE.md`, `docs/RUNTIME_STAGE.md`, `docs/WEB_HOSTING_26_40.md` … `docs/WEB_HOSTING_26_44.md`, `docs/engine/CATEGORY_MAP.json` — Sentences pointing at deleted documents removed; the save facade's new path.
- `src/runtime/platformGapRegister.ts`, `src/runtime/stableCreatorPlatform.ts` — Evidence references to deleted reports replaced by the current checks (pending external items kept).
- `src/components/SceneSideBar.vue` — Status marks at 11 px (typography audit).
- `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md`, `manual/index.html` — Sentences referencing deleted documents removed; the manual presents 26.45 (engine 26.45.0) with a new chapter on 26.39–26.45 in all three languages (Markdown and the HTML manual).

## Physics (Rust)

- `crates/nova_physics/src/collision/mod.rs` — Rounded shapes after Box2D v3: capsules (and a radius on polygons) collide as a core shape plus a radius; distance between cores by GJK; face–face clipping for flat contacts, one point otherwise; manifolds keep feature ids.
- `crates/nova_physics/src/collision/internal_edges.rs` — Only sharp (radius 0) static polygons take part in internal-edge handling; the polygon shape gained its radius.
- `crates/nova_physics/src/query/mod.rs`, `crates/nova_physics/src/query/filtered.rs` — Rays, overlaps and shape casts see capsules' round ends.
- `crates/nova_physics/src/body.rs` — Bodies carry surface (tangent) speed, rolling resistance and the radius of rounded shapes.
- `crates/nova_physics/src/solver/contact_solver.rs` — Conveyor surfaces (the tangent target speed of a contact is the sum of both surfaces), rolling resistance (Box2D v3.1), the block solver for rounded shapes; `SweepMotion` alias (clippy).
- `crates/nova_physics/src/rope/mod.rs` — Wheel joint (rigid across the axis, spring along it, limits, angular motor), soft weld (softness only in the biased pass), target joint (soft 2×2 point constraint with a force limit).
- `crates/nova_physics/src/world/legacy.rs` — Bullets against bullets (both sweeps interpolated); target joints and surfaces in the step.
- `crates/nova_physics/src/world/persistent.rs` — `set_body_target`, `clear_body_target`, `set_body_surface`; `snapshot()` / `restore()` of the whole world (`PhysicsSnapshot`, with an estimate of its size); body extras re-applied after a rebuild.
- `crates/nova_physics/src/lib.rs`, `crates/nova_physics/src/tests.rs` — New modules and fields; contact initializers.
- `crates/nova_physics/src/tests_2645.rs` (new) — Capsules (rest, tip over, stacks, rolling off, rays), wheel joints (suspension, motor), soft and stiff welds, target joint (holds, too weak), conveyor and rolling resistance, bullets, snapshot replay.
- `crates/nova_runtime/src/lib.rs` — Runtime methods for targets, surfaces and snapshots (a restore resets interpolation and drops the abandoned timeline's events); `cast_segments` (batched segment casts for particles) with a test.
- `crates/nova_wasm/src/lib.rs` — WASM API: `set_body_target`, `clear_body_target`, `set_body_surface`, `save_snapshot`, `restore_snapshot`, `snapshot_steps`, `drop_snapshot`, `clear_snapshots`, `cast_segments`; the script runtime's `save_instances`, `restore_instances`, `drop_instances`, `clear_instance_snapshots`.

## Scripting (Rust)

- `crates/nova_script/src/lib.rs` — Commands and functions: `target_joint_move`, `target_joint_release`, `set_surface_speed`, `input_rebind` (one or two arguments), `input_bindings_reset`, `camera_shake`, `camera_zoom`, `camera_follow`, `camera_follow_none`, `screen_flash`; the read `input_prompt` (from the new `prompts` of the input snapshot); `ScriptRuntime::snapshot_instances` / `restore_instances` (instance scopes for the debugger's rewind; another session or a recompiled script is not restored). Tests for each.
- `src/visual/rhaiApiSignatures.generated.json`, `docs/RHAI_API_V2.md`, `docs/RHAI_API_V2_MANIFEST.json`, `docs/NOVA_RHAI_API_V2_STUBS.rhai` — Regenerated (the reference had not listed the functions added since 26.43).
- `src/runtime/scriptApiCatalog.ts` — Entries for the new functions.

## Physics and areas (TypeScript)

- `src/world/components.ts` — Wheel joint defaults (on the wheel, connected to the chassis), joint frequency/damping fields, `TargetJoint2D`, collider surface speed and rolling resistance, Buoyancy angular drag and point-gravity falloff, Camera 2D shake settings and trauma.
- `src/world/componentRegistry.ts`, `src/world/entityBuilder.ts`, `src/world/entitySerialization.ts`, `src/editor/componentPalette.ts`, `src/world/componentPrimitiveTypes.ts`, `src/world/componentFieldDescriptions.ts`, `src/world/componentEnums.ts` (regenerated) — The new component and fields.
- `src/world/Connection.ts` — Joint frequency fields; a Wheel joint on the wheel uses the chassis (its target) as the solver's first body.
- `src/world/World.ts` — Joint kind codes and record fields 40–43; surfaces and target joints sent when they change; `physicsPose` (the solver pose), `saveRuntimeSnapshot` / `restoreRuntimeSnapshot` / `adoptRuntimeState`, `runtimeLayoutKey`, `castParticleSegments`; `lastSettings` public. The body state is read only while the solver's state describes the current bodies (after a reload, Play beginning on a frame without a fixed step left static bodies at (0, 0); present since 26.44 at least, found in the 26.45 hand checks).
- `src/runtime/physicsGeometry.ts` — Convex pieces merged (Hertel–Mehlhorn), capsules (outline, area, inertia), dynamic concave polygons allowed.
- `src/runtime/areaPhysics.ts` (new) — Polygon area/centroid, convex clipping, collider world polygons (at the solver pose), area regions, submerged part.
- `src/runtime/worldGameplayOwner.ts` — Buoyancy from the submerged part at the solver pose; point gravity with falloff.
- `src/runtime/tileMapOwner.ts` — Tile polygons with more than four corners or concave ones are split into convex pieces.
- `src/runtime/physicsProduction.ts` — Capsule and dynamic concave polygons marked exact. `src/runtime/simulationAuthoring26.ts` — Dynamic concave polygons are no longer reported as blocked (only dynamic chains). `src/runtime/objectComposition.ts` — The Target joint is its own component class, not a `Joint2D`.
- `src/renderer/physicsDebugDraw.ts` — Capsule outlines and the wheel joint in the physics debug view.
- `src/components/ConfigPanel.vue`, `src/components/RuntimeComponentsInspector.vue`, `src/components/WorldToolsPanel.vue` (Buoyancy and point-gravity fields) — Inspector fields for the new joints, surfaces, areas and camera shake; Wheel joint labels "Chassis" and "Mount point on the chassis"; overridden prefab fields marked; the status line after Apply to prefab.

## Prefabs

- `src/runtime/prefabRebase.ts` (new) — Rebuilding an instance (or a variant's records) on a new version of its prefab, keeping its own changes; stored scenes; variant bundles; overrides per component field (kind-keyed component lists).
- `src/runtime/prefabs.ts` — Other instances keep the overrides captured before the new version is written (they used to be recomputed against it, which undid the applied change); closed scenes and variants follow (recursively, with their open instances); reset of a single override reads kind-keyed paths.

## Game input

- `src/runtime/input.ts` — Binding capture (next key, mouse button or gamepad button; Escape cancels).
- `src/runtime/inputBindingStore.ts` (new) — The player's own bindings: overrides against the project's, load, save, reset; `{input:Action}` tokens.
- `src/runtime/gameUiOwner.ts` — `{input:Action}` in UI text shows the prompt for the device in use.
- `src/runtime/player/playerHost.ts`, `src/runtime/player/playerView.ts` — The Player stores the player's bindings per game and restores them at start; remap buttons and `input_rebind` change them (they did nothing in the Player before).

## Runtime core

- `src/runtime/GameplayRuntimeCore.ts` — Script commands for target joints, surfaces, rebinding, camera and screen flash; prompts in the script context; `joint.broken` sent to the objects a breaking joint joined; complete rewind keyframes (the store of physics snapshots, script instance snapshots and game state); camera trauma recovery and the screen flash; the Target joint added with `addComponent`.
- `src/runtime/physicsRecorder.ts` — Keyframes within a 64 MB budget; continue restores a keyframe exactly, other steps the bodies only; status and frame information report keyframes.
- `src/runtime/rewindState.ts` (new) — Copies of runtime state (maps, sets, class instances; entities and components shared) and the runtime fields of components.
- `src/runtime/time.ts`, `src/runtime/tweens.ts`, `src/runtime/animationOwner.ts`, `src/runtime/timelineOwner.ts` — Capture and restore for the rewind.
- `src/runtime/particleOwner.ts` — Particles collide through the physics world (segment casts) when there is one.
- `src/renderer/sceneRenderer.ts` — Camera shake (smooth value noise, trauma²) in the game camera's view.
- `src/renderer/lighting2d.ts`, `src/components/WorldCanvas.vue` — The screen flash on the overlay, under the HUD.

## Debugging

- `src/visual/blockScript.ts` — Block breakpoints (stored in the blocks document); the block → line map of the compiled code.
- `src/visual/blockScriptCopy.ts`, `src/components/blocks/BlockStack.vue`, `src/components/blocks/BlockScriptEditor.vue`, `src/components/blocks/blockEditorContext.ts`, `src/components/blocks/blocks.css` — Stop here / Remove breakpoint in the block menu, the red dot and the paused block's outline.
- `src/components/PhysicsRuntimePanel.vue` — Keyframe marks, Nearest keyframe, what a continue restored.
- `src/i18n.ts` — English, German and Chinese text for everything above.

## Player, export and boundaries

- `player-legacy.html`, `src/playerLegacyPage.ts` (new), `src/player.ts`, `vite.config.ts` — The compatibility Player is a page of its own; player.html opens it instead of importing it, so nothing of Vue or the Editor is reachable from player.html.
- `src/runtime/gameExporter.ts`, `scripts/nova-export.mjs`, `src/runtime/releaseEngineering.ts` — Web exports include `player-legacy.html` and its files; its no-cache header.
- `src-tauri/src/lib.rs` — Exporting into a folder that holds other files uses a subfolder named after the game (with a test); the legacy page's header.
- `src/editor/saveGame.ts` (moved from `src/runtime/saveGame.ts`), `src/editor/gameplayWorldHost.ts`, `src/components/SaveDataSettings.vue`, `src/store/physics.ts` — The Editor's reactive save facade lives with the Editor.
- `scripts/audit-engine-boundaries.mjs` — The removed facade entries are gone; an entry missing from the build graph fails; the release gate passes when only the Editor's runtime composition (the open M1 gap) reaches Editor modules.
- `scripts/verify-2643-player-boundary.mjs` — Checks that the compatibility Player is a separate page.

## Checks

- `scripts/verify-2645-physics.mjs` (new, 12 checks), `scripts/verify-2645-prefabs.mjs` (new, 4), `scripts/verify-2645-input.mjs` (new, 3), `scripts/verify-2645-debugger.mjs` (new, 2), `scripts/verify-2645-effects.mjs` (new, 4) — The behaviour above in the real runtime with the WASM core (or the real editor store for prefabs).
