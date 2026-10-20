# Nova_A 26.43

Engine 26.43.0. Project format 2 / schema 29 is unchanged; 26.38–26.42 projects open through the usual upgrade check with only the engine-version stamp updated. The plan and status for this round are in `docs/DEV_PLAN_26_43.md`; every changed file is listed with its reason in `EDIT_LEDGER.md`.

## Physics

- **A jumping character no longer "flies" at box edges.** The character controller stepped up while in the air: when a jumping character's feet met the side of a box within the step height, it was lifted onto the step, and scripts that read velocity back as motion ÷ time saw that lift as a launch of up to 42 m/s. Step-up and floor snap now need a character that stands on a walkable floor and is not moving up, and the reported motion no longer includes the lift or the snap. A ceiling hit clears the Platformer component's upward speed.
- **Continuous collision per body.** Only bodies set to Continuous that move more than a quarter of their size in a substep are swept, and each is bisected to its earliest contact. Before, the fastest body raised the substep count of the whole world (up to 128) and thin walls could still be missed.
- **Tile seams.** A contact through the shared edge of two adjacent static polygons (tile seams, boxes laid end to end) is dropped, so bodies slide over seams without snagging or bouncing; exposed faces still collide.
- **Resting contacts and sleep.** Resting contacts keep a small slop, so they no longer flicker between begin and end, and warm starting works. Bodies at rest now fall asleep (the support impulse used to wake every resting body each substep) and wake when hit.
- An ellipse's contact point is taken from the ellipse surface; against long boxes it could lie metres away, which turned the impulse into spin and let fast balls pass through.
- Pairs that contacts cannot move (static or kinematic with static or kinematic) are skipped except for sensors, and the velocity solver stops once contacts have converged. Release benchmark: a 20-row pyramid steps in 3.47 ms (26.42: 10.93 ms), a tile-floor scene in 0.85 ms (6.05 ms).
- **Collision callbacks after each step.** With Physics settings → Collision callbacks → After each step (`globalSettings.eventDispatch: 'step'`), `on_collision_*` and `on_trigger_*` run right after the physics step that produced them, so what a callback changes applies to the next step. New template projects use it; projects made before 26.43 keep one dispatch per frame.
- Rotations by quarter turns (0°, 90°, 180°, 270°) are exact, so rotated tile maps, hierarchies and segment colliders line up exactly.

## Scripting

- The script runtime reuses one engine for every callback: 0.87 µs per callback instead of 146 µs.
- **Calls between scripts:** `call_on(entity, fn, [args])`, `call_global(name, fn, [args])`, `call_group(group, fn, [args])` and `after(seconds, fn, [args])`, plus `entity_has_tag`, `entity_in_group` and `entity_handle_of`. Calls are queued and bounded (512 per flush), and delayed calls follow game time and disappear with their entity.
- **Global scripts** (Project Settings → Scripting) start before the scene, survive scene changes and end at Stop; exports include them.
- **Audio and video from scripts:** `play_sound` with bus, volume, pitch, loop and tag; `stop_sounds`; `play_music` with crossfade; `stop_music`; `set_bus_volume`; `play_video` / `stop_video` for full-screen video (skippable, with a `video.finished` signal). Video files (mp4, webm, m4v, ogv, mov) can be imported and previewed.
- The audio underrun warning no longer counts time while the browser keeps audio suspended (before the first click, or in a hidden tab); that was the warning seen in 26.42 Build Settings.

## Blocks

A new **Blocks** tab, first in the Script workspace, builds scripts from blocks written in plain words: 13 events, 44 actions and 8 conditions, in categories, dragged from the toolbox and nested by dragging. Values are checked against the project's variables and assets, and the generated Rhai code can be viewed. Scripts made with blocks reopen in Blocks. Every block is compiled, analysed and run in the real script engine by the tests.

## Player

- **Exported games start without editor code.** Windows and Web exports run a new Player that loads the package, the scene, media and fonts and runs the game without Vue or any editor module. The previous Player is kept as a fallback: if the new Player cannot start a game, the page reloads once in the previous Player (`?legacyPlayer=1` forces it in a browser).
- The renderer is rebuilt after a lost graphics context or repeated faults, and falls back to Canvas 2D if WebGL2 keeps failing.
- **Debug tools in development exports:** F3 shows frame statistics (frame rate, CPU time, runtime and renderer details) and F4 draws the physics layer (colliders, sleeping bodies, contacts, velocities, joints, character normals). Release exports have no debug tools. The editor and the Player share the same physics debug drawing.

## Web, iPad and browsers

- The editor uses the visible viewport height (`dvh`) and safe areas, so iPad Safari's toolbar and desktop scrollbars no longer push it out of view or cause a page scroll; Safari no longer zooms into focused fields; text uses one portable font stack (bundled Nunito Sans and Noto Sans SC as fallbacks) and is redrawn when a web font finishes loading. On first start the editor follows the system language.
- Phones and tablets are told apart by screen size: only phones get the rotate prompt and enlarged controls. The editor picks wide, medium or narrow layouts by measured width; in narrow windows both panels float over the canvas.
- Exported Web games fill the visible screen exactly, offer a full-screen button (also on iPad Safari) and, on touch screens, show touch controls generated from the game's input actions when the project defines none.

## Editor window

- Below 860 px the six menus fold into one **Menu** button, so the workspace switcher and Run stay visible in iPad split view; arrow keys move along the menu bar and Alt alone focuses it.
- F6 and Shift+F6 move the keyboard between title bar, hierarchy, viewport, inspector and bottom panel.
- Windows 1240–1479 px wide keep both panels docked but narrower: at 1280 px the canvas is 660 px wide instead of 536.
- The Inspector's body type is a segmented control; Run is the one tinted primary button; the status bar is announced to screen readers.

## Latency

Measured on the build machine (Windows 11 Pro 26200, Ryzen 9 8945HX, GeForce RTX 5060 Laptop GPU, 2560×1600 at 240 Hz, WebView2) with OS-injected input and desktop capture, on the exported 60 Hz Platformer test game, built on 19 October from the same source as this release. Method and raw records: `docs/latency-results.md` and the release evidence archive (`latency/`).

| Key press (SendInput) → change in desktop capture, P50 / P95 ms, key down | |
| --- | --- |
| 26.42 exported game, same session | 18.3 / 25.6 |
| **26.43 exported game (new Player)**, two runs | **15.7 / 23.9** and **17.9 / 25.7** |

The new Player is not slower than the 26.42 Player. The difference between the builds is within the spread between two runs of the same build, so no improvement is claimed. The per-stage breakdown is not available for this release: the in-app latency probe sent no records in that session from any build, including the 26.42 export that reported on 18 October. The end-to-end numbers do not depend on the probe.

## Verification

Recorded in the release evidence archive: `checks-release/` (the release build of 20 October), `release-play/` (the released editor's own exports), `latency/`, `screenshots/`, and `checks/`, `checks-b/` (development runs of 19 October).

- On Windows, in the run that built the released files (`.cache/_latency/release-26.43.cmd`): `pnpm build` (WASM, `vue-tsc`, Vite), `pnpm tauri build`, the node typecheck, `cargo fmt --check`, `cargo clippy --workspace --all-targets -D warnings`, `cargo test --workspace` (214 tests) and the Rhai signature inventory (221 host functions, 1,017 signatures, unchanged from the committed file) pass.
- New checks for this release, in Edge 147 or the shipped WebAssembly runtime: `verify-2643-character-edge` 3/3 (44 jumps at a box edge with the template movement script), `verify-2643-event-timing` 4/4, `verify-2643-scripting` 8/8, `verify-2643-blocks` 8/8, `verify-2643-player-boundary` 4/4 (nothing loaded before a game starts imports Vue or editor code; desktop exports use the same Player page), `verify-2643-web-player` 5/5 (the exported Platformer at 1280×800, 1194×834, 768×1024 and 507×834 with keyboard and touch input, debug tools only in development exports, the fallback Player still runs) and `verify-2643-editor-shell` 5/5 (canvas widths, Menu button at 768 and 507 px, F6, Alt, body type with undo).
- The checks of earlier releases pass on this build: `verify-2640-editor-workflow` 7/7, `verify-2641-editor-ui` 6/6, `verify-2642-glass-budget` 5/5, `verify-2642-lighting` 4/4, `verify-2642-lighting-render` 4/4, `verify-2642-fixed-timers` 4/4, `verify-2642-levels` 17/17, `verify-2642-script-write-read` 5/5, `verify-v26.11-templates` (62 checks) and `verify-v26.15-library-metadata`.
- All eleven files in `releases/v26.43` match `SHA256SUMS.txt`.
- The released portable executable was started from `releases/v26.43`: the launcher and status bar show 26.43. A new project from the Platformer template played in the editor; jumping into the floating platform from below and against its side left the character under or on the platform, without any upward launch, and Stop restored the scene. From the same editor, Build Settings → Windows (Production qualified, x86_64, debug profile) → Build and run produced a game (`build-info.json`: engine 26.43.0) that started in the new Player, showed F3 statistics (WebGL2, 240 frames per second), and walked and jumped with the keyboard, again without a launch at the platform edge. Build Settings → Web → Build wrote `index.html`, the Player files and `game.nova-pak`; `verify-2643-exported-web` 3/3 served that folder and played it in Edge 147 (new Player without fallback, fills the window at 1280×800 and 1194×834, Space lifted the player 2.8 m, D walked it 4.1 m).

## Limits

- "iPad" in these notes means iPad screen sizes and touch input emulated in Edge (Chromium). Safari, Firefox and physical iPhone, iPad and Android devices were not tested.
- Not done in this round: preset heights for the bottom panel, a two-row Inspector header with a filter menu, merging the side bar into the scene side bar, a render cache for animated tiles, and exact sine and cosine for angles other than quarter turns.
- Latency comes from one Windows laptop at 240 Hz; the per-stage breakdown, drag latency, the Web Player, photon latency and PresentMon statistics were not measured.
- Script sound, music and video were checked through the runtime's commands and state in the tests, not by ear or eye.
- Installers (MSI, NSIS) were built and version-checked but not installed. Linux desktop packages, macOS and mobile devices are not part of this release.
- Pre-existing Rust warning: unused `declared_decoded_bytes` in `src-tauri/src/runtime_pak_preflight.rs`.
- Nothing was committed, staged or tagged; the source archive is built from the working tree.
