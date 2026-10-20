# Nova_A 26.44 — Edit ledger

Every file changed from the 26.43 release to 26.44, with the reason. The plan and status are in `docs/DEV_PLAN_26_44.md`. Nothing was committed, staged or tagged; all changes are in the working tree for the maintainer to commit.

## Version

- `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `crates/nova_format/src/lib.rs`, `src/projects/projectFormat.ts`, `tests/fixtures/migrations/public-schema-expected.json` — Engine 26.44.0 / release 26.44. Project format 2 / schema 29 unchanged.
- `scripts/build-release-26.44.cmd`, `scripts/package-release-26.44.cmd`, `scripts/package-release-26.44.ps1`, `package.json` (`release:v26.44`) — Release scripts for 26.44 (the 26.43 scripts with the new version; the source archive is built from the working tree and leaves out top-level folders that are not part of the project, no Git writes).
- `AGENTS.md` — Current task points at the 26.44 plan and `releases/v26.44`.
- `docs/DEV_PLAN_26_44.md` (new), `docs/EDIT_LEDGER_26_44.md` (new), `docs/WEB_HOSTING_26_44.md` (new: the per-release Web hosting guide), `docs/RELEASE_NOTES_26_44.md` (new: release notes).

## Physics: Soft Step solver

- `crates/nova_physics/src/solver/contact_solver.rs` — Rewritten after Box2D v3's Soft Step. Contacts are collected once per step and solved in every substep with fixed anchors; the separation is re-evaluated from the bodies' current poses. Each substep warm starts, solves with a soft bias (contact frequency up to 60 Hz and a quarter of the substep rate, damping ratio 10, push-out at most 3 m/s; twice as stiff against static or kinematic bodies), integrates positions and relaxes without bias, which removes the energy the bias added. Speculative contacts let bodies close the gap within a substep. Friction is solved in the relax pass only, and a friction impulse is removed once the normal impulse is zero (it used to stay and be warm-started every substep, which pumped energy into piles). Two-point manifolds are solved as a block (2×2 LCP, Box2D 2.4) generalised to soft constraints, so a box landing flat does not spin. Restitution is applied once after the substeps from the approach speed. Warm starting is keyed by contact features.
- `crates/nova_physics/src/body.rs` — Velocity and position integration split for substepping; sleep measured from the motion made over the step (`update_sleep_with_motion`); the velocity-based helper is test-only.
- `crates/nova_physics/src/collision/mod.rs` — Polygon manifolds carry feature ids (incident vertices and clip planes), keep the reference face unless the other is clearly better (no flip between equal faces), and accept a speculative margin; `gjk_distance` and `collide_speculative` give speculative contacts for separated shapes; `polygon_face_manifolds` collides a polygon against one chosen face.
- `crates/nova_physics/src/collision/internal_edges.rs` — A polygon contact through an internal edge or a covered corner of adjacent static polygons is moved to the exposed face closest to its normal instead of being dropped. Dropping it lost every contact of a slightly tilted box lying across tile seams, and the box fell through the floor (26.43 too: 82 of 315 seam placements in a sweep).
- `crates/nova_physics/src/world/broad_phase.rs` (new) — Dynamic AABB tree (Box2D `b2DynamicTree`): fat boxes, area-heuristic insertion, AVL rotations; only bodies that move, carry a sensor or were moved since the last step query it.
- `crates/nova_physics/src/world/legacy.rs` — The step: contacts collected once (tree, speculative margin, internal edges, seam duplicates per moving body), then per substep integrate velocities, warm start, soft solve of joints and contacts, integrate positions, continuous sweeps, relax; restitution; impulse cache; snapshots; sleep from motion. Pairs whose both sides rest (asleep, static or a resting kinematic body, not moved since the last step) keep their contacts without colliding again, and still report them; a sleeping body touched by a moving one wakes before the solve (a teleported kinematic platform used to pass through a sleeping box); a replaced body record drops its kept contacts. The static fingerprint for internal edges is only recomputed after a body record changed.
- `crates/nova_physics/src/world/persistent.rs` — A refreshed body record drops its kept resting contacts.
- `crates/nova_physics/src/rope/mod.rs` — Distance, spring, rope-length, revolute and prismatic joints as soft constraints with accumulated impulses and warm starting: revolute and prismatic limits (one-sided) and motors (impulse clamped by the maximum torque or force), springs from stiffness and damping, pull-only strings. Rigid bindings and collision ropes keep the previous solver.
- `crates/nova_physics/src/lib.rs` — Includes the broad phase.
- `crates/nova_physics/src/tests.rs`, `crates/nova_physics/src/world/origin.rs` — Tests for soft contacts and joints converge over steps instead of correcting in one step; new regressions: stale friction impulse, tilted box across tile seams, kept resting contacts (events, teleported platform, record change), random piles stay inside the walls.
- `crates/nova_physics/examples/physics_stress.rs` (new) — Random pile stress test (40–100 rotated boxes and ellipses, overlapping at spawn, masses up to 40×, single floor or tile floor, three quality profiles, 24 seeds): 144 runs, 0 failures (26.43: 20 runs fell through the tile floor or flew off).
- `crates/nova_physics/examples/physics_bench.rs` — Large tile levels (1,600 and 2,000 tiles with 1,000 and 3,000 boxes) and the cost once settled.
- `crates/nova_physics/src/rope/mod.rs` — Revolute joints get a position projection after the velocity solve (up to four Gauss–Seidel passes over the 2×2 anchor error, at most 0.2 m per pass, static, kinematic and sleeping sides immovable), so chains and ragdolls stay connected while swinging (pendulum chain gap under 2.5 mm in the test).

## Physics: characters and platforms

- `crates/nova_physics/src/query/filtered.rs`, `crates/nova_physics/src/query/mod.rs`, `crates/nova_physics/src/world/persistent.rs` — Queries use a cached list of collider proxies with world bounds; a moved body only refreshes its poses, a changed collider or body record rebuilds the list. Raycasts, overlaps and shape casts cull by bounds instead of testing every collider (character queries on a 1,000-box level 17 → 1 ms per frame, see Performance).
- `crates/nova_physics/src/query/mod.rs` — Character movement: a character that starts inside geometry is pushed out first (recovery motion reported); a cast that starts overlapping and moves out of a shape no longer stops the character; the floor's handle and whether it is a one-way platform are reported; the floor velocity is taken at the character's feet (`v + ω × r`, so a rotating platform carries the character along its turn); `set_one_way_pass_through(handle, seconds)` lets a character drop through one-way platforms.
- `crates/nova_physics/src/world/broad_phase.rs` — Tight bounds are only computed for bodies that query the tree.
- `crates/nova_wasm/src/lib.rs`, `crates/nova_runtime/src/lib.rs` — `set_one_way_pass_through` binding.
- `src/world/World.ts` — `CharacterMoveResult2D` carries the floor entity, one-way floor and recovery; `entityForBodyHandle`; `dropThroughOneWay(entity, seconds)`; state read-back skips static bodies and sleeping bodies that did not change; queries send only changed poses (a full sync only when the entity list changed).
- `src/runtime/worldGameplayOwner.ts` — Characters follow a floor moved by a script or an animation (teleported platforms too), turning with it; `CharacterBody2D.floorEntity` / `floorOneWay` are set each move; supports are matched by UUID (the editor hands reactive proxies outside a frame).
- `src/runtime/gameplayComponentsOwner.ts` — Platform Controller 2D: jump buffer (`jumpBufferTime`, 0.1 s), variable jump height (`jumpCutFactor`), drop-through one-way platforms (`dropThroughAction` held down + jump), gravity from the world settings.
- `src/runtime/physicsGeometry.ts`, `src/world/geometry.ts` — Collider preparation and box hulls are reused when nothing changed (two slots, dynamic and static; numeric signature).
- `src/world/components.ts`, `src/world/entityBuilder.ts`, `src/world/componentPrimitiveTypes.ts`, `src/world/componentFieldDescriptions.ts` (generated), `scripts/fixtures/v26.22-property-dispositions.mjs` — New component fields: Platform Controller 2D `jumpBufferTime`, `jumpCutFactor`, `dropThroughAction`; Character Body 2D `floorEntity`, `floorOneWay` (runtime observations); Tile Map 2D `terrainRulesAsset`.
- `src/components/GameplayComponentsInspector.vue`, `src/i18n.ts` — Inspector rows for the new Platform Controller fields (English, German, Chinese).

## Performance (large scenes)

Measured in the container (release builds; `crates/nova_physics/examples/physics_bench.rs`, mean ms per step, 26.43 → 26.44): 20-row pyramid 3.56 → 0.51 (settled 3.28 → 0.16); 1,600 tiles with 400 boxes falling ×4 and 1,000 boxes 12.0 → 1.56 (settled 11.0 → 1.14); 2,000 tiles with 3,000 boxes 38.5 → 4.39 (settled 33.6 → 2.9). Chains: 18 times faster; joint gap 2.6 / 10.5 / 7.1 mm (26.43: 0.3 / 1.5 / 4.7 mm, at a much higher cost). TypeScript side of the 1,000-box level with the new WASM (`.cache/perf/world-sync.mjs`): frame 12.2 / 58.6 → 5.5 / 26.7 ms mean / max, character queries 4 / 17 → 0.2 / 1.0 ms.

## Animation and tweens

- `crates/nova_script/src/lib.rs` — Script API: `animator_crossfade(state, seconds)`, `animator_state()`, `animator_state_time()`, `animator_in_transition()`, `character_floor_is_one_way()`, `character_drop_through([seconds])`, `tween(property, to, seconds[, easing[, options]])` (options: `delay`, `loops`, `yoyo`, `relative`, `signal`), `entity_tween(...)`, `tween_stop([property])`, `entity_tween_stop(...)`; animator snapshot in the callback context; tests.
- `src/runtime/tweens.ts` (new) — Tweens of position, rotation, scale and opacity with the 31 Penner easings, delay, loops, yoyo and relative targets; `tween.finished` and a custom signal when done; matched by UUID, so a tween started in `start()` (reactive proxy) runs on the live object.
- `src/runtime/animationDocuments.ts`, `src/runtime/animationOwner.ts` — Animator: Any State transitions (checked first, never re-entering the active state), states found by id or name, crossfade, `animator.state_entered` / `animator.state_exited` signals, snapshot for scripts.
- `src/runtime/GameplayRuntimeCore.ts` — Tweens advance on the fixed step after the animators; new commands; state signals; script context (animator, one-way floor); world options for the gameplay components.
- `src/components/AnimationPanel.vue`, `src/i18n.ts` — Any State in the controller graph (dashed node and links).
- `src/visual/blockScript.ts`, `src/visual/blockScriptCopy.ts`, `src/components/BlockFieldInput.vue`, `crates/nova_script/tests/fixtures/all-blocks.rhai` (regenerated) — Blocks: glide to / glide by / spin by / fade to / grow to (with easing), drop through, blend to animation; conditions “on a one-way platform” and “animation is”.
- `src/runtime/scriptApiCatalog.ts`, `src/visual/rhaiApiSignatures.generated.json` (regenerated) — Catalog entries and signatures (1,032).
- `scripts/verify-2644-animation.mjs` (new) — Easing curves, tweens, controller documents, the Animator in the real runtime with the Rhai VM, script drop-through (5 checks).

## Level tools

- `src/runtime/tilemap.ts` — Terrain auto-tiling: rules documents v2 with a `cardinal` (16 tiles) or `blob` (47 tiles, corners only with both edges) mode and connected terrains; every tool (brush, line, rectangle, fill, replace, eraser, stamp and pattern) writes its cells first and then re-tiles them and their eight neighbours once; stamps paste exactly and the terrain around them joins; painting the terrain over itself keeps the chosen tile; terrain tiles are never rotated; a missing blob tile falls back to the tile for the same edges; rules are read once per operation; template layout (`terrainTemplateRules`) and `saveTerrainRules`; diagnostics for 47-tile sets.
- `src/runtime/tileMapValues.ts`, `src/world/components.ts`, `src/store/physics.ts` — Tile maps keep their terrain rules (`terrainRulesAsset`, part of asset reference updates).
- `src/components/TilemapPanel.vue`, `src/i18n.ts` — Mode (4 or 8 neighbours), connected terrains, “Lay out from selected tile” (reads the rules from a template block of the TileSet and tags untagged tiles with the terrain); the selected map's rules are saved on the map.
- `src/runtime/tileMapOwner.ts` — An animated tile's frame change rebuilds only the chunks that hold animated tiles (it used to drop every chunk of the map).
- `scripts/verify-2644-level-tools.mjs` (new) — 7 checks: masks and templates, every tool with cardinal and blob rules, connected terrains, per-map rules, stamps, locked layers, animated chunk cache.

## Editor window structure

- `src/editor/contextActions.ts` (new), `src/layout/SideBar.vue`, `src/components/SceneSideBar.vue`, `src/layout/EditorLayout.vue` — The workspace context tools sit at the top of the docked Hierarchy panel (collapsed, the panel is the rail); the separate rail remains only when the Hierarchy is hidden, floating or an overlay (narrow windows) and in Manage.
- `src/components/ConfigPanel.vue`, `src/i18n.ts` — Inspector header in two rows: name and Add component, then search with one filter menu (category, modified only, pinned only); an active filter shows as a token that clears it.
- `src/components/EditorBottomPanel.vue`, `src/i18n.ts` — Short, medium and tall dock heights (160, 280, 440 px) next to the free resize handle; the panel may take up to 64% of the window height.
- `scripts/verify-2644-editor-structure.mjs` (new) — Real input in the built editor: context tools in the Hierarchy and the rail fallback, dock heights, the Inspector filter menu and token, canvas width at 1100–1600 px (5 checks).

## Debug tools

- `Cargo.toml` (Rhai `debugging` feature), `crates/nova_script/src/lib.rs`, `crates/nova_wasm/src/lib.rs` — Line breakpoints and stepping inside Rhai callbacks: a debug run counts statements and stops at a breakpoint line or the next statement for step into / over / out, returning the VM's local variables and call stack; the instance state is restored and nothing of the stopped run is applied (snapshot, abort, re-run). Ordinary callbacks do not use the debugger (0.80 µs per callback before and after).
- `src/runtime/GameplayRuntimeCore.ts`, `src/runtime/scriptDebugOwner.ts`, `src/runtime/scriptModules.ts`, `src/components/ScriptStudio.vue` — Breakpoints anywhere in a script (also in helpers a callback calls) stop at their line; conditions, hit counts and log messages are evaluated with the script's variables; continue and step re-run the callback to the next stop; module lines are mapped back to their files; the debugger pane describes what it does.
- `scripts/generate-rhai-api-signatures.mjs`, `scripts/lib/rhaiApiInventory.mjs` — The signature generator compiles with the same Rhai features.
- `src/runtime/physicsRecorder.ts` (new), `src/components/PhysicsRuntimePanel.vue`, `src/i18n.ts` — Physics recording while the Physics Monitor is open: a ring buffer of body poses and velocities per fixed step (600 steps: 10 s at 60 Hz, 5 s at 120 Hz; fewer for very large scenes); while paused, a slider shows where the bodies were and “Continue from here” rewinds the bodies (scripts and timers keep their state) and drops the later frames.
- `scripts/verify-2644-debugger.mjs` (new) — Bundle line map, recorder ring buffer, recording in the runtime, line stops with locals, step into/out/over, continue and conditions (6 checks).

## Leftovers

- `src/world/stableTrig.ts` — Sine and cosine for transforms are a port of the fdlibm kernels used by musl and by Rust's libm in the WASM core, so they are identical in every browser and match the physics bit for bit; quarter turns stay exact.
- `scripts/verify-2644-trig.mjs` (new), `scripts/fixtures/stable-trig-2644.json` (new) — 1,010 angles against the Rust libm results.
- `src/runtime/latencyProbe.ts`, `src/platform/latencyProbeHost.ts`, `src-tauri/src/lib.rs` — The latency probe sends its batches through the desktop host (`latency_probe_send`, configured loopback collector only, off the main thread) instead of page requests, which recent WebView2 releases block (the probe sent nothing in the 26.43 session); a failed send is logged once.
