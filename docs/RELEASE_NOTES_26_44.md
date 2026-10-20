# Nova_A 26.44

Engine 26.44.0. Project format 2 / schema 29 is unchanged; 26.38–26.43 projects open through the usual upgrade check with only the engine-version stamp updated. The plan and status for this round are in `docs/DEV_PLAN_26_44.md`; every changed file is listed with its reason in `EDIT_LEDGER.md`.

## Physics

- **New contact solver.** Contacts follow Box2D v3's Soft Step: they are found once per step (with a small speculative margin, so fast bodies meet before they overlap), solved softly in every substep and relaxed afterwards, which removes the energy that position correction used to add. Two-point contacts are solved together, so a box landing flat does not start to spin; bounce is applied once after the substeps. Piles stay calm: in a stress test of 144 random piles (40–100 rotated boxes and ellipses, overlapping at spawn, masses up to 40×) no body fell through the floor or flew off; 26.43 failed 20 of them.
- **Tile seams.** A slightly tilted box lying across the seam of two floor tiles could lose all its contacts and fall through the floor (26.43 too). Contacts through a seam are now moved onto the exposed face instead of being dropped.
- **Joints** (distance, spring, revolute, prismatic) are soft constraints with limits and motors that hold under load; revolute chains are pulled back together after each step, so chains and ragdolls no longer drift apart while swinging.
- **Large scenes.** A dynamic AABB tree replaces the pair search, bodies at rest keep their contacts without colliding again, and a sleeping body wakes as soon as something moves into it (a teleported platform could pass through it). Release benchmark, milliseconds per physics step, 26.43 → 26.44: 20-row pyramid 3.56 → 0.51; a 1,600-tile level with 1,000 boxes 12.0 → 1.56; a 2,000-tile level with 3,000 boxes 38.5 → 4.39. In the editor runtime the 1,000-box level's frame went from 12.2 to 5.5 ms on average, and character queries from 4 to 0.2 ms.

## Characters and platforms

- A character that starts inside geometry is pushed out, and casts that start in contact no longer stop it.
- The floor's velocity is taken at the character's feet, so a rotating platform carries the character around; floors moved by a script or an animation (also teleported ones) carry it too.
- **One-way platforms:** `character_drop_through()` in scripts, the "drop through" block, and in the Platform Controller hold the down action and jump (`Drop-through action`).
- Platform Controller: jump buffer (a jump pressed shortly before landing still happens), variable jump height (releasing jump early cuts the rise) and the world's gravity.

## Animation

- **Animator:** transitions from Any State, crossfades from scripts and blocks, `animator.state_entered` / `animator.state_exited` signals, and scripts can read the current state, its progress and whether a transition is running. Any State appears in the controller graph.
- **Tweens:** `tween("x", 3.0, 0.5, "quad_out")` animates position, rotation, scale or opacity with 31 easing curves, delays, loops, yoyo and relative targets, and sends `tween.finished` (and an optional signal of your own) when done. Blocks: glide to, glide by, spin by, fade to, grow to and blend to animation; conditions "on a one-way platform" and "animation is".

## Level tools

- **Terrain auto-tiling** with 16-tile (4 neighbours) or 47-tile "blob" (8 neighbours) rules, for every tile tool: brush, line, rectangle, fill, replace, eraser, stamp and pattern. Neighbouring cells re-tile when you paint or erase; stamps paste exactly and the terrain around them joins; terrains can connect to each other (grass to ground). Each tile map keeps its own rules. "Lay out from selected tile" reads the rules from a template block of the TileSet.
- Animated tiles now rebuild only the chunks that contain them on each frame change.

## Editor

- The workspace tools that sat in a separate rail now sit at the top of the Hierarchy panel (collapsed, the panel is the rail); the canvas gains the rail's width. The rail returns when the Hierarchy is hidden or floating.
- The Inspector header has two rows: the object's name with Add component, then search with one filter menu (category, modified only, pinned only); an active filter shows as a token you can click to clear it.
- The bottom panel snaps to short, medium and tall heights, next to its free resize handle.

## Debugging

- **Breakpoints stop at their line in Rhai scripts**, with the script's local variables and call stack, and step into, over and out of lines; conditions, hit counts and log messages use the script's variables. A stop re-runs the callback from its start up to that line, and nothing of a stopped run is applied, so every effect happens once.
- **Physics recording:** while the Physics Monitor is open, the last 600 physics steps of body motion are recorded (10 s at 60 Hz, 5 s at 120 Hz; fewer steps in very large scenes). When paused, drag the slider to see where the bodies were, and "Continue from here" rewinds the bodies to that step (scripts and timers keep their state).

## Smaller fixes

- Sine and cosine for transforms are computed the same way in every browser and bit for bit like the physics core, so the same project produces the same positions everywhere.
- The latency probe reports through the desktop host. In the 26.43 session its page requests to the loopback collector never arrived (recent WebView2 releases restrict them), so no stage times were measured; with 26.44 the exported game delivered every batch (see Verification).

## Verification

Recorded in the release evidence archive: `checks-release/` (the run that built the released files), `release-play/` (the released editor's own exports), `latency/` (probe check) and `screenshots/`. Build machine: Windows 11 Pro 26200, Ryzen 9 8945HX, GeForce RTX 5060 Laptop GPU, 2560×1600 at 240 Hz, Edge 147, WebView2.

- On Windows, in the run that built the released files (`.cache/_latency/release-26.44.cmd`, 20 October): the Rhai signature inventory (235 host functions, 1,032 signatures), `pnpm build` (WASM, `vue-tsc`, Vite), `pnpm tauri build`, the node typecheck, `cargo fmt --check`, `cargo clippy --workspace --all-targets -D warnings`, `cargo test --workspace` (225 tests), the physics stress example (72 runs, 0 failures), the physics and script benchmarks, and 23 verify scripts pass.
- New checks for this release, in Edge 147 or the shipped WebAssembly runtime: `verify-2644-animation` 5/5, `verify-2644-level-tools` 7/7, `verify-2644-editor-structure` 5/5, `verify-2644-debugger` 6/6 and `verify-2644-trig` 2/2.
- The checks of earlier releases pass on this build: `verify-2643-character-edge` 3/3, `verify-2643-event-timing` 4/4, `verify-2643-scripting` 8/8, `verify-2643-blocks` 8/8, `verify-2643-player-boundary` 4/4, `verify-2643-web-player` 5/5, `verify-2643-editor-shell` 5/5, `verify-2640-editor-workflow` 7/7, `verify-2641-editor-ui` 6/6, `verify-2642-glass-budget` 5/5, `verify-2642-lighting` 4/4, `verify-2642-lighting-render` 4/4, `verify-2642-fixed-timers` 4/4, `verify-2642-levels` 17/17, `verify-2642-script-write-read` 5/5, `verify-v26.11-templates` (62 checks), `verify-v26.12-api-signatures` and `verify-v26.15-library-metadata`.
- Benchmarks on the build machine (release build, this release): 20-row pyramid 0.65 ms per step, 1,600 tiles + 1,000 boxes 1.80 ms, 2,000 tiles + 3,000 boxes 5.42 ms, no bullet tunnelled. The 26.43 → 26.44 comparison in Physics was measured in one Linux container session for both versions; the Rhai debugging support did not change the cost of an ordinary callback there (0.79 µs without, 0.80 µs with).
- All eleven files in `releases/v26.44` match `SHA256SUMS.txt`.
- The released portable executable was started from `releases/v26.44`: the launcher and status bar show 26.44. A new project from the Platformer template opened with the workspace tools at the top of the Hierarchy and the dock heights in the bottom panel. In editor Play the character walked, jumped onto the floating platform from the side and stayed under it when jumping from below. In the Debug workspace (the rail returns there because the Hierarchy is hidden) the Physics Monitor recorded the steps; paused, the slider showed the character where it had been 4.8 s earlier, "Continue from here" put it back there, and play went on from that point. From the same editor, Build Settings → Windows (Production qualified, x86_64, debug profile) → Build and run produced a game (`build-info.json`: engine 26.44.0) that started in the independent Player, showed F3 statistics (WebGL2, 240 frames per second) and walked and jumped with the keyboard. Build Settings → Web → Build wrote `index.html` (title "Release Check 44"), 133 files under `assets/` and `game.nova-pak`; `verify-2643-exported-web` 3/3 served that folder and played it in Edge 147 (Space lifted the player 2.8 m, D walked it 4.1 m).
- Latency probe: the exported Windows game, started with `NOVA_LATENCY_PROBE` and driven for 10 s by the harness, delivered 16 batches with 40 inputs, 3,837 frame records and 48 clock samples (`latency/probecheck44`); the six attempts before the collector was started were counted as failures and logged once. End-to-end latency was not re-measured in this round.

## Limits

- Prefab instances in scenes that are not open are not refreshed when their prefab changes (open scenes are, on Apply); prefab variants stay copies of their base.
- Line debugging covers text Rhai scripts; visual graphs still step through their commands.
- Physics recording rewinds bodies only.
- "iPad" means iPad screen sizes and touch input emulated in Edge (Chromium). Safari, Firefox and physical devices were not tested. Linux desktop packages, macOS and mobile devices are not part of this release; installers were built but not installed.
- Pre-existing Rust warning: unused `declared_decoded_bytes` in `src-tauri/src/runtime_pak_preflight.rs`.
- Nothing was committed, staged or tagged; the source archive is built from the working tree.
