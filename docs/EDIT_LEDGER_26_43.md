# Nova_A 26.43 — Edit ledger

Every file changed from the 26.42 release to 26.43, with the reason. The plan and status are in `docs/DEV_PLAN_26_43.md`. Nothing was committed, staged or tagged; all changes are in the working tree for the maintainer to commit.

## Version

- `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `crates/nova_format/src/lib.rs`, `src/projects/projectFormat.ts`, `tests/fixtures/migrations/public-schema-expected.json` — Engine 26.43.0 / release 26.43. Project format 2 / schema 29 unchanged.
- `scripts/build-release-26.43.cmd`, `scripts/package-release-26.43.cmd`, `scripts/package-release-26.43.ps1`, `package.json` (`release:v26.43`) — Release scripts for 26.43 (the 26.42 scripts with the new version; the source archive is built from the working tree, no Git writes).
- `AGENTS.md` — Current task points at the 26.43 plan and `releases/v26.43`.
- `docs/DEV_PLAN_26_43.md` (new), `docs/EDIT_LEDGER_26_43.md` (new), `docs/WEB_HOSTING_26_43.md` (new: the per-release Web hosting guide, with the 26.43 tablet editor and independent Player notes).
- `docs/RELEASE_NOTES_26_43.md` (new) — Release notes.
- `scripts/verify-2643-exported-web.mjs` (new) — Release check: serves a Web game exported by the editor and plays it in Edge (independent Player starts without fallback, fills the window at 1280×800 and 1194×834, Space jumps, D walks).
- `docs/latency-results.md` — 26.43 exported Windows game measured against the 26.42 export (end to end; the probe's stage records were not received in that session).

## Physics: the jumping character no longer "flies" at box edges

Cause: the character controller stepped up while airborne. When the feet of a jumping character met the side of a box within the step height (0.35 m), it was lifted onto the step, and scripts that read velocity back as motion/dt saw that lift as up to 42 m/s upward at 120 Hz.

- `crates/nova_physics/src/query/mod.rs` — Character movement: step-up and floor snap only for a character that already stands on a walkable floor and is not moving up (as Rapier's autostep and Unity's step offset do); the step lands on the step top or is abandoned; the reported motion excludes step lift and floor snap, so motion/dt never turns a step into a launch; snapping never pulls a falling character down early; a character that walked off an edge is no longer on the floor.
- `crates/nova_physics/src/world/legacy.rs` — Continuous collision per body: only bodies set to Continuous that move more than a quarter of their size in a substep are swept in size-sized segments and bisected to the earliest contact (before, the fastest body pushed the whole world to up to 128 substeps and could still tunnel). Pairs that contacts cannot move (static/kinematic with static/kinematic) are skipped except for sensors — most pairs in tile levels. The broad phase sweeps along the axis where bodies spread most, keeping contact identity for warm starting. Velocity iterations stop once the contact set has converged (joints and ropes keep every iteration). Internal edges of adjacent static polygons are rebuilt when a static body changes.
- `crates/nova_physics/src/collision/internal_edges.rs` (new), `crates/nova_physics/src/collision/mod.rs`, `crates/nova_physics/src/lib.rs` — Internal-edge filtering: a contact through the shared edge of two adjacent static polygons (tile seams, boxes laid end to end) is dropped, so bodies slide over seams without snagging or bouncing; exposed faces still collide. An ellipse's contact point now comes from the ellipse surface: the EPA point against a long box could lie far away (20 m on a 40 m wall), the lever arm turned the impulse into spin, and fast balls passed through.
- `crates/nova_physics/src/solver/contact_solver.rs`, `crates/nova_physics/src/body.rs`, `crates/nova_physics/src/lib.rs` — Resting contacts keep a small linear slop (5 mm, scaled down for tiny shapes) so they persist between substeps: no begin/end flicker, warm starting works. Contacts where neither side can move are reported but not solved. Solver impulses no longer reset the sleep timer (the support impulse woke every resting body each substep, so nothing ever slept); a hit body's island wakes at the end of the step.
- `crates/nova_physics/src/tests.rs` — Regression tests: airborne character never stepped up a box edge; floor snap needs a grounded character and is not velocity; per-body continuous sweeps; bullets never tunnel through a thin wall; resting box sleeps without contact flicker and wakes when hit; box tower and pyramid stable and sleeping; static/kinematic pairs not collided; sliding over tile seams; exposed tile faces still collide; identical worlds give identical checksums.
- `crates/nova_physics/examples/physics_bench.rs` (new) — Bench (release): 20-row pyramid 3.47 ms/step (was 10.93), tile-floor scene 0.85 ms (was 6.05).
- `src/runtime/gameplayComponentsOwner.ts` — Platformer component: a ceiling hit clears upward speed.
- `scripts/verify-2643-character-edge.mjs` (new) — Real runtime, World and Rhai VM (WASM) with the Platformer geometry and the template movement script; 44 jumps at the platform edge; checks no upward speed beyond the jump speed and no rise above the discrete apex.

## Physics: collision callbacks after each step; transforms

- `src/world/World.ts`, `src/runtime/GameplayRuntimeCore.ts` — New `globalSettings.eventDispatch: 'step'`: `on_collision_*` / `on_trigger_*` run right after the physics step that produced them, so what a callback changes applies to the next step. The last step's events are dispatched after the frame's presentation read (which could otherwise overwrite a callback's velocity or position). Without the setting (all projects made before 26.43) callbacks still run once per frame. The frame's `world.events` lists all events either way.
- `src/runtime/runtimeSceneData.ts`, `src/components/PhysicsSettingsPanel.vue`, `src/i18n.ts` — Saved/loaded only when 'step' (old documents unchanged); Physics settings → Collision callbacks (EN/DE/ZH).
- `src/projects/templates.ts` — New template projects use per-step callbacks (with the fixed timer clock from 26.42).
- `src/world/stableTrig.ts` (new), `src/world/hierarchy.ts`, `src/runtime/physicsGeometry.ts` — Quarter-turn rotations (0°, 90°, 180°, 270°) use exact 0/±1, so rotated tile maps, hierarchies and segment colliders line up exactly (cos(π/2) is 6e-17 in JS) and do not depend on a browser's libm for those angles.
- `scripts/verify-2643-event-timing.mjs` (new) — The callback sees the same fixed step count whether a frame holds 1 or 4 steps (per-step), frame dispatch is unchanged, and a callback's bounce applies on the next step.

## Scripting

- `crates/nova_script/src/lib.rs` — One Rhai engine per runtime, reused for every callback (0.87 µs per callback instead of 146 µs). New API: `call_on(entity|id, fn, [args])`, `call_global(name, fn, [args])`, `call_group(group, fn, [args])`, `after(seconds, fn, [args])`, `entity_has_tag`, `entity_in_group`, `entity_handle_of`, `play_sound(asset, #{bus, volume, pitch, looped, tag})`, `stop_sounds(tag[, fade])`, `play_music(asset[, fade][, volume])`, `stop_music([fade])`, `set_bus_volume(bus, volume)`, `play_video(asset, #{skippable, volume, looped})`, `stop_video()`. Called functions receive arguments by their arity. (`call` is a Rhai keyword, hence `call_on`.)
- `crates/nova_script/examples/script_bench.rs` (new) — Callback bench.
- `src/runtime/GameplayRuntimeCore.ts` — Applies the new commands: bounded call queue (512 per flush, 10,000 pending), delayed calls on game time (cleared with their entity), media references by path or asset UUID, one message per failing call or missing media, `video.finished` signal with `#{asset, reason}`.
- `src/runtime/globalScriptSettings.ts`, `src/runtime/globalScripts.ts` (new), `src/runtime/scriptSettings.ts`, `src/panels/SettingsPanel.vue`, `src/i18n.ts` — Global scripts (Project Settings → Scripting): each runs on its own physics-free host object placed first in the world, starts before the scene, survives scene changes and is removed at Stop. Exports include their script assets.
- `src/runtime/audioRuntime.ts`, `src/runtime/audioOwner.ts` — Script sounds with bus, volume, pitch, loop and tag; music with crossfade on the Music bus; bus volume overrides. The underrun counter ignores a suspended audio context (no user gesture yet, hidden tab), which produced the warning seen in 26.42 Build Settings.
- `src/runtime/videoOwner.ts` (new), `src/runtime/runtimeAssetRecordContracts.ts`, `src/assets/AssetDatabase.ts`, `src/components/EditorBottomPanel.vue` — Video assets (mp4/webm/m4v/ogv/mov) with an inspector preview; full-screen video playback for scripts (skip with pointer/Escape/Enter/Space, muted retry when autoplay is refused).
- `src/runtime/scriptApiCatalog.ts`, `src/visual/rhaiApiSignatures.generated.json` — API catalogue entries and the regenerated signature inventory (the static analyzer knows the new functions).
- `src/runtime/worldGameplayOwner.ts` — `normalizeWorldGameplaySettings` exported for the independent Player.
- `scripts/verify-2643-scripting.mjs` (new) — Global host, call_global/call_on round trip, call_group, after, soft media failures, bounded call loops, host removal at Stop (real WASM).

## Blocks (visual programming, simpler)

- `src/visual/blockScript.ts`, `src/visual/blockScriptCopy.ts` (new) — Block document model and compiler to Rhai (`// @nova-blocks 1 {json}` header): 13 events, 44 statements, 8 conditions in plain words, with values checked against variables and asset pickers; EN/DE/ZH copy.
- `src/components/blocks/*` (new), `src/components/ScriptWorkspace.vue`, `src/components/ScriptStudio.vue`, `src/visual/graphStudioState.ts` — Blocks tab first in the Script workspace: categories, drag from the toolbox or by grip, nested stacks, condition picker, generated code view; scripts made with blocks open in Blocks.
- `crates/nova_script/tests/blocks_fixture.rs`, `crates/nova_script/tests/fixtures/all-blocks.rhai` (new), `scripts/verify-2643-blocks.mjs` (new) — Every block and event compiles, passes the analyzer and runs in the real engine.

## Independent Player (P-E2): exported games start without Vue or Editor code

- `src/runtime/player/playerHost.ts`, `playerView.ts`, `playerSurface.ts`, `playerConfiguration.ts`, `playerMessages.ts`, `playerDebugOverlay.ts`, `player.css` (new) — Composition root from the package to a running game: core WASM → package → migrated project → settings (input, audio, physics, scripting, production, presentation, rendering policy, packages, plugins) → CPU resource catalog → media (fonts and up to 512 images ready before the first frame; a failing source is reported and loads lazily) → localization, input prompts and HUD reads → World bootstrap → Gameplay Runtime → renderer surface → DOM view (world canvas, HUD canvas, accessibility nodes, native text input, captions, touch controls) or a fixed-step loop for headless servers. Renderer rebuilds on context restore/faults, falling back to Canvas2D after repeated faults. Development exports: F3 frame statistics, F4 physics debug layer (`?debug=stats,physics`); Release exports have none.
- `src/player.ts`, `src/playerLegacy.ts` (new), `src/PlayerApp.vue` — The independent Player is the default. The compatibility (Vue) Player loads lazily for `?legacyPlayer=1`, desktop network test instances, and automatically (one page reload) when the independent Player cannot start a game; `?legacyPlayer=0` disables that fallback (tests). `globalThis.__NOVA_PLAYER__` reports mode, stage and fallback. Loading/error screen, full-screen control.
- `src/App.vue` — Desktop exports (the editor binary in game mode) used to open the compatibility Player inside `index.html`; they now go straight to `player.html`, so Windows/macOS/Linux games run the independent Player as well (with the same automatic fallback).
- `src/runtime/packages.ts`, `src/runtime/packageManifestVersion.ts` (new), `src/runtime/stableContracts.ts`, `src/editor/packageStateAdapter.ts` (new), `src/main.ts` — Package state is plain data; the Editor wraps it reactively at start (as production/script state already were), so the Player reads packages with the Editor's own normalizer.
- `src/visual/graphCatalogSources.ts` (new), `src/visual/graphCatalog.ts`, `src/runtime/plugins.ts` — The graph catalog reads plugin graph nodes from a registered source instead of the Editor's plugin store, and the API manifest from the runtime catalog.
- `scripts/verify-2643-player-boundary.mjs` (new) — Builds the production Player bundle and checks that nothing loaded at startup is Vue, an Editor store/component/panel or Editor i18n, and that the compatibility Player is a lazy chunk; also that desktop exports are routed to `player.html`.
- `scripts/verify-2643-web-player.mjs` (new) — Exported Platformer in the built Player at 1280×800, 1194×834, 768×1024 and 507×834: fills the viewport, keyboard and touch controls work, debug tools only in development exports, compatibility Player still runs.

## Debug and render tools

- `src/renderer/physicsDebugDraw.ts` (new), `src/components/WorldCanvas.vue` — Physics debug drawing shared by the Editor and the Player (colliders, sleeping, AABBs, centres, velocities, forces, joints, character floor/wall/ceiling normals and requested motion, rope nodes, contact points and normals); collider labels are drawn upright; ~100 lines removed from WorldCanvas.

## Web, iPad and browsers

- `index.html`, `player.html` — `maximum-scale=1` (no zoom on focused fields), `viewport-fit=cover` (safe areas); the Player also disables double-tap zoom and runs full screen from the iOS home screen.
- `src/ui/tokens.css`, `src/assets/main.css`, `src/App.vue`, `src/components/ContextMenu.vue`, `src/components/CreatorOnboarding.vue`, `src/components/UndoHistoryPanel.vue`, `src/components/EditorFeedback.vue` — `--vh100` (dvh where supported) instead of 100vh/100vw, which on iPad Safari was taller than the visible area and with a desktop scrollbar wider than the page.
- `src/ui/editor.css` — The editor is an app surface: no rubber-banding, pull-to-refresh, text inflation or double-tap zoom.
- `src/runtime/mobileViewport.ts`, `src/components/MobileShell.vue` — Phones vs tablets by screen size: only phones get the rotate prompt and forced 44 px controls; tablets keep one control rhythm.
- `src/store/preferences.ts` — First start follows the system language.
- `src/renderer/fontStack.ts` (new), `src/renderer/sceneRenderer.ts`, `src/runtime/uiTextPresentationValues.ts`, `src/runtime/gameUiOwner.ts`, `src/renderer/WebGL2Renderer.ts` — One portable font stack (author family, imported and locale fallbacks, bundled Nunito Sans / Noto Sans SC); cached text is redrawn when a web font finishes loading.
- `src/layout/EditorLayout.vue`, `src/components/ToolBar.vue` — Wide / medium / narrow editor layouts by measured width: medium floats the inspector, narrow floats both panels with toggles in the viewport; tools become a vertical capsule in narrow viewports.
- `src/runtime/deviceInput.ts`, `src/components/VirtualControlsOverlay.vue`, `src/components/DeviceInputPanel.vue` — Automatic touch controls generated from the input map when a project defines none (setting in Devices & mobile input).
- `src/runtime/editorWindow.ts`, `src/PlayerApp.vue` — WebKit-prefixed full screen for iPad Safari; browser games get a full-screen button.
- `scripts/lib/browserUserAudit.mjs` — `NOVA_AUDIT_BROWSER` selects any Chromium (Linux container runs); fixed en-US language for the audits.

## Editor window structure (G1)

- `src/layout/TopBar.vue`, `src/components/editorIconPaths.ts`, `src/i18n.ts` — Below 860 px the six menus fold into one Menu button whose list opens the same menus (the workspace switcher and Run no longer overflow at iPad split-view widths); the brand mark gives way below 600 px; arrow-key navigation in the menu bar; Alt alone focuses the menus.
- `src/layout/EditorLayout.vue` — F6 / Shift+F6 move between title bar, hierarchy, viewport, inspector and bottom panel with a short outline cue; windows 1240–1479 px wide keep both panels docked but narrower (canvas 660 px at 1280 instead of 536).
- `src/ui/components/UiSegmented.vue` (new), `src/components/ConfigPanel.vue` — Segmented control; the Inspector's body type uses it (fires `change`, so history and validation work as with the select).
- `src/components/ActionBar.vue` — Run is the one tinted primary button.
- `src/layout/StatusBar.vue` — Status text is a polite live region.
- `scripts/verify-2643-editor-shell.mjs` (new) — Canvas widths at 1100/1280/1600, compact title bar at 768/507, F6/Shift+F6 and Alt, segmented body type with undo.
