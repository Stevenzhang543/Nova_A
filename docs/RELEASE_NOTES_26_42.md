# Nova_A 26.42

Engine 26.42.0. Project format 2 / schema 29 is unchanged; 26.38–26.41 projects open through the usual upgrade check with only the engine-version stamp updated. The plan for this round is `docs/DEV_MANUAL_26_42.md`; every changed file is listed with its reason in `EDIT_LEDGER.md`.

## Latency and frame rate

Measured on the build machine (Windows 11 Pro 26200, Ryzen 9 8945HX, GeForce RTX 5060 Laptop GPU, 2560×1600 at 240 Hz, WebView2, WebGL2 backend, window maximized) with OS-injected input and desktop capture, on the Platformer test scene with its 2D light and shadow casters. Method, every stage and the raw records: `docs/latency-results.md` and the release evidence archive (`latency/`). "Display" is the change seen in a GDI capture of the composed desktop, not photons.

| Key press (SendInput) → change in desktop capture, P50 / P95 ms | |
| --- | --- |
| 26.41 release, 60 Hz project (17 Oct) | 23.1 (P50) |
| **26.42 release** (portable, started from `releases/v26.42`), same 60 Hz project, editor Play | **18.5 / 26.0** |
| 26.42 development build (18 Oct), same scene at 120 Hz (the new template default) | 13.7 / 18.8 |
| 26.42 development build, exported Windows Player, 60 Hz project | 18.9 / 26.1 |

The development build of 18 October predates soft shadows, normal maps and the fixed timer clock; it measured 19.5 / 26.0 on the 60 Hz project, the same as the release within the 1.5 ms clock-mapping error.

| 60 s of play | 26.41 | 26.42 release |
| --- | --- | --- |
| World submissions per second (240 Hz display) | 233.4 | 239.0 |
| Submission → change in desktop capture, P50 ms | — (2.6 without the light) | 2.3 with the light |
| Runtime frame (simulation), mean ms | 1.2 | 1.15 (1.55 at 120 Hz, development build) |

- **2D lighting is drawn by the WebGL2 renderer.** 26.41 drew the light on a separate Canvas 2D layer that the browser composited over the game; now a half-resolution light buffer is multiplied into the scene inside the renderer's own frame. The lit scene reaches the screen as quickly as the unlit scene did in 26.41, and the renderer's GPU timer now includes the light.
- **Templates run physics at 120 Hz.** Input waits for the next fixed step; at 120 Hz that wait is about half as long (3.3 instead of 8.5 ms P50). New projects from templates use a "Responsive 120 Hz" profile with 4 substeps (the same 480 substeps per second as 60 Hz × 8). Existing projects keep their rate; the tick-rate field now explains the trade-off.
- **Quieter Play mode.** While a game runs or is paused there is no live background blur anywhere in the editor, and the floating scene controls fade out after 1.5 s without pointer movement. In the Game view, the editor overlay canvas is no longer cleared and redrawn every frame when it has nothing to show.
- The character-interpolation question from the development plan was measured: a physics-driven character showed 18.5 ms (Interpolate) against 19.2 ms (None) P50, below the 3 ms threshold, so per-body interpolation settings were not added.

## Rendering

- Point, spot (cone with soft inner edge), area and directional lights; shadows from `ShadowCaster2D` respect caster opacity and self-shadowing. Lights now also reach the background inside their range, and shadows block the light rather than painting black over the scene, so lit scenes look different from 26.41 (generally more natural).
- Shadow quality keeps its meaning: Hard draws sharp shadows, Soft and Ultra blur the shadow edge (4 and 8 pixels, as before).
- Normal maps on sprites are shaded per light on the GPU: a surface facing the light is brighter, one facing away darker, and a flat normal map looks like an unmapped sprite.
- Scenes that use light layer masks or sprite light masks keep the 26.41 Canvas 2D lighting, as does any device where the light shaders fail; the renderer reports which path it used and why. `?lighting=canvas` forces the old path in the browser build.
- With the WebGL2 renderer, exposure, contrast, saturation, blur, bloom and vignette were applied twice in 26.41 (once by the renderer's post-process shader and again by a CSS filter and an overlay). They are now applied once.

## Gameplay timing

- **Fixed-step timer clock.** Projects made from 26.42 templates advance script timers with each physics step, so `on_timer` fires in the same step at any frame rate (before that step's `fixed_update`). Existing projects keep the frame-time clock and behave exactly as before; Physics → Timer clock switches it.
- Orbit Dodge and Hazard Crossing: the moving hazards now move themselves with their own scripts instead of being moved by the player's script every frame, and they stop when the round ends.

## Desktop

- `NOVA_DESYNCHRONIZED=1` (desktop) or `?desynchronized=1` (Web) asks for a desynchronized, lower-latency game canvas in the Player; it is off by default, and whether the browser granted it is reported to the latency probe. Not measured in this release.
- Audio stored inside a project (all template sounds) failed to load in the desktop editor and in exported Windows games: the desktop security policy did not allow the WebView to read `data:` and `blob:` audio. That error also blocked the Windows export of projects using such sounds (the 26.41 limit "exported Player not measured"). The policy now allows these sources for media and fetches; the Platformer test project exports and runs.

## New starters

- **Skyline Trilogy** — three platformer stages (tutorial, moving and one-way platforms, timed coin arena) with checkpoints and a saved best time.
- **Pendulum Post** — rope-and-joint puzzle: cut swinging chains to deliver two balls past a motorised windmill.
- **Reflex Lab** — reaction-time game with five timed rounds, a pointer-follow comparison, script frame statistics and a marker scene for external latency measurement.

All three are in English, German and Chinese, with previews, controls, expected results and manual sections; the library now has 43 starters.

## Editor interface

Direction: iOS-style system materials and grouped lists; no Apple fonts, icons or other assets are bundled.

- New **System Light** and **System Dark** palettes (default for fresh settings; existing palette choices are kept).
- **Reduce transparency** in Settings → Appearance turns every glass surface opaque; the editor also uses static glass on low-end profiles and while its window is inactive.
- Inspector sections are rounded grouped cards with the header outside and taller rows separated by hairlines.
- Focus rings follow each control's rounded shape; buttons give a short spring press; fields are borderless until hovered; tabs are a segmented control with a raised selection; menus use concentric rounded items; tree selection stays grey until the tree has focus.

## Learning

- `docs/QUICKSTART_26_42.en.md` / `.zh.md`: a 30-minute path from the Platformer template to a Web export, plus four timing rules — `fixed_update` versus `update`, tick rate and latency, writes applied after the callback, and when collision callbacks and timers fire. Linked from the READMEs and the top of the manual.
- The scripting contract now states the timing within a frame. A new check confirms in the shipped script runtime that reads after a write in the same callback return the state from before the callback.

## Verification

Recorded in the release evidence archive: `checks-release/` (the release build), `latency/`, `screenshots/`, `container/` (the same content checks on Linux), and `checks/`, `checks-b/` (earlier development runs).

- On Windows, in the run that built the released files (`.cache/_latency/release-26.42.cmd`): `pnpm build` (WASM, `vue-tsc`, Vite), `pnpm tauri build`, the node typecheck, `cargo fmt --check`, `cargo clippy --workspace --all-targets -D warnings` and `cargo test --workspace` (198 tests) pass.
- Browser checks with real pointer and keyboard input in Edge 147 pass: `verify-2640-editor-workflow` 7/7, `verify-2641-editor-ui` 6/6, `verify-2642-lighting` 4/4 and `verify-2642-glass-budget` 5/5 (3 live glass layers while editing, none in Play, 0 overlay clears in 10 s of an unlit Game view, secondary-label contrast 6.8:1 light / 8.6:1 dark). In the release run `verify-2642-glass-budget` first failed its fourth check: the click on Reduce transparency arrived while the Manage workspace was still sliding in and missed the switch. The check now waits until the switch stops moving (and would record a second click if one were needed); the re-run passed with one click, and packaging only started after that. Both logs are kept.
- `verify-2642-lighting-render` 4/4 draws known scenes with the production renderer in Edge and reads the pixels back: shadow on the far side of a caster with no seams (26 inside, 255 beside it), a 4 px hard against a 16 px soft penumbra, the spot cone, and normal-map shading (255 facing the light, 84 facing away, a flat map equal to an unmapped surface).
- `verify-2642-fixed-timers` 4/4 runs the real Runtime headless at 60, 144 and 240 Hz: with the fixed clock every 0.1 s timer expires at fixed steps 12, 24, 36 … at all three rates; with the old frame clock it expires one step earlier at 144 Hz.
- Content checks pass: `verify-2642-levels` 17/17 (including real execution of every new script in the shipped WebAssembly runtime), `verify-2642-script-write-read` 5/5, `verify-v26.11-templates` (62 checks) and `verify-v26.15-library-metadata` (both failed before this round and were fixed).
- All eleven files in `releases/v26.42` match `SHA256SUMS.txt`.
- The released portable executable was started from `releases/v26.42` with the latency test project: the launcher and status bar show 26.42; the upgrade check (26.40 → 26.42) opened the project without rewriting it; Settings → Reduce transparency switched on and off; Play ran and keyboard input moved the character; the latency in the table above was measured on this executable. From the same editor, Build Settings exported the project for Windows (`build-info.json`: engine 26.42.0); the exported game started and moved the character with the keyboard.

## Limits

- Latency figures come from one Windows laptop at 240 Hz. The 26.41 release could not be re-run in the same session, so its values are from 17 October; the 120 Hz and exported-Player rows come from the development build of 18 October. Drag latency, the Web Player, photon latency and PresentMon present statistics were not measured. Submissions per second are app-side WebGL2 submissions, not presented frames.
- The exported Player still uses the editor's Vue-based player shell. The framework-free Player host (P-E2) moves to 26.43, as the development manual allows; until then the Player is not separated from editor modules.
- The editor window-structure redesign (G1: toolbar, sidebar, panel docking) moves to 26.43, as planned. Smaller G0 details are also left for it: numeric fields with axis letters and inline steppers, sheet-style dialog headers, scroll-edge masks and automatic contrast checks for custom palettes.
- Collision callbacks of a frame with several physics steps arrive together after the last step (documented in the quick start and the scripting contract).
- The exported game's sound was not checked by ear; the desynchronized-canvas switch was not measured. After the latency runs on the release executable (100 Space presses, each of which can trigger the jump sound, and 60 s of movement), Build Settings listed one audio underrun as a warning; it was not investigated further.
- Installers (MSI, NSIS) were built and version-checked but not installed. Linux desktop packages, macOS and mobile devices are not part of this release.
- Pre-existing Rust warning: unused `declared_decoded_bytes` in `src-tauri/src/runtime_pak_preflight.rs`.
- Nothing was committed, staged or tagged; the source archive is built from the working tree.
