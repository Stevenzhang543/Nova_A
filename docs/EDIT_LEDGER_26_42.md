# Nova_A 26.42 — Edit ledger

Every file changed from the committed 26.41 tree (`44a1b41`, "update v26.41") to the 26.42 release, with the reason. The plan is `docs/DEV_MANUAL_26_42.md`; work-package names (WP-0, P-A …) refer to it. Nothing was committed, staged or tagged; all changes are in the working tree for the maintainer to commit.

## WP-0 version

- `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `crates/nova_format/src/lib.rs`, `src/projects/projectFormat.ts`, `tests/fixtures/migrations/public-schema-expected.json` — Engine 26.42.0 / release 26.42. Project format 2 / schema 29 unchanged.
- `scripts/build-release-26.42.cmd`, `scripts/package-release-26.42.cmd`, `scripts/package-release-26.42.ps1`, `package.json` (`release:v26.42`) — Release scripts for 26.42 (copies of the 26.41 scripts with the new version; the source archive is still built from the working tree, no Git writes).
- `AGENTS.md` — Current task points at the 26.42 manual and `releases/v26.42`.
- `docs/DEV_MANUAL_26_42.md` (new) — The 26.42 development manual (engineering review, levels, GUI design and plan).

## WP-P performance and latency

- `src/components/WorldCanvas.vue` (P-A) — In the Game view, when nothing would be drawn on the overlay canvas (no Canvas 2D light, post effect, debug view, game UI or point gizmo), the overlay is cleared once after the last frame that drew and then skipped; a resize (which covers DPR changes) always clears. `?overlaySkip=0` restores the clear on every frame. Counters in `globalThis.__novaOverlayStats`. The shared tail (game UI resolution, accessibility nodes, render graph, render-texture capture) moved into `finishOverlayFrame`, so input hit-testing still sees the UI on skipped frames.
- `src/ui/tokens.css`, `src/layout/EditorLayout.vue` (P-A with G0) — While playing or paused every glass layer uses a static tint (no `backdrop-filter`).
- `src/projects/templates.ts` (P-B) — New projects from templates run physics at 120 Hz with 4 substeps (`Responsive 120 Hz` profile: Balanced with `tickRate 120`, `minimumSubsteps 4`; the substeps per second stay at 480). Existing projects keep their saved rate. Template `fixed_update` scripts were checked: all are `dt`-based.
- `src/components/PhysicsSettingsPanel.vue`, `src/i18n.ts` (P-B) — The tick-rate field explains the relation between tick rate and input wait (EN/DE/ZH).
- `src/renderer/lighting2dGpu.ts` (new, P-D) — 2D lighting on the WebGL2 renderer: a half-resolution light buffer cleared to the ambient level, one additive quad per light (point, spot cone, area rectangle, directional), hard shadows from the light-facing edges of each `ShadowCaster2D` extruded to infinity (w = 0) and accumulated as transmittance in the buffer's alpha, casters without self-shadowing restored, then multiplied into the scene (stored as L/2 so lights may brighten up to 2×). Falls back to the Canvas 2D path, with the reason reported, for normal maps, light layer masks and sprite light masks, or when the light shaders fail; `?lighting=canvas` forces the old path.
- `src/renderer/lighting2dGpu.ts` (P-D, second pass) — Shadows are accumulated per light in a transmittance mask and blurred with a separable Gaussian on the Soft (4 px) and Ultra (8 px) shadow qualities; normal-mapped sprites write world-space normals into a half-resolution normal buffer that shades each light (flat normals keep the unmapped brightness), so normal maps no longer force the Canvas 2D path.
- `src/renderer/WebGL2Renderer.ts`, `src/renderer/types.ts`, `src/renderer/sceneRenderer.ts` (P-D) — The renderer owns the GPU light pass (`supportsGpuLighting`, `submitLighting`), records each camera, and draws the lights after the world batches and before the MSAA resolve and post process, so the GPU timer covers them. Context loss and destroy release the light resources. `renderWorld` builds the light set and reports `lightingBackend`/`lightingFallbackReason` in the stats.
- `src/renderer/types.ts`, `src/renderer/sceneRenderer.ts`, `src/renderer/WebGL2Renderer.ts` (P-D, second pass) — Sprite commands carry their normal-map region; the renderer records normal-mapped sprites while the frame is submitted and hands their geometry to the light pass.
- `src-tauri/src/lib.rs`, `src/player.ts`, `src/renderer/WebGL2Renderer.ts`, `src/renderer/types.ts`, `src/runtime/latencyProbe.ts`, `src/components/WorldCanvas.vue` (P-E3) — Opt-in desynchronized game canvas for the Player (`NOVA_DESYNCHRONIZED=1` on the desktop through the new `canvas_desynchronized` command, `?desynchronized=1` on the Web); off by default. The renderer records whether the context was granted it and the latency probe reports the backend and that flag with every batch.
- `src/components/WorldCanvas.vue` (P-D) — Skips the Canvas 2D lighting overlay when the GPU drew the light. With the WebGL2 renderer the CSS `filter` on the world canvas and the overlay vignette are no longer applied: the renderer's post shader already applies exposure, contrast, saturation, blur, bloom and vignette, so 26.41 applied them twice. `globalThis.__novaLighting` reports the backend for tests and the probe.

## WP-P P-E1 export blocked by audio

- `src-tauri/tauri.conf.json` — The desktop content security policy had no `data:`/`blob:` in `connect-src` and no `media-src`, so the WebView refused to fetch template audio stored as `data:` URLs ("Failed to fetch"). Audio therefore failed during Play in the desktop editor and Player, and the Build Settings validation (which includes runtime audio errors) blocked the Windows export of any project using the Platformer jump sound. `connect-src` now allows `data: blob:` and `media-src` allows `'self' data: blob: asset:`; nothing else in the policy changed.

## WP-S stability (timers and templates)

- `src/runtime/time.ts`, `src/runtime/GameplayRuntimeCore.ts`, `src/world/World.ts`, `src/runtime/runtimeSceneData.ts` (S-2) — Optional fixed timer clock: `globalSettings.timerClock: 'fixed'` advances script timers and tasks with each fixed step and dispatches expirations before that step's `fixed_update` (also in single-step mode). A missing field keeps the frame-time clock, and only an explicit `'fixed'` is saved, so older projects are unchanged.
- `src/components/PhysicsSettingsPanel.vue`, `src/i18n.ts` (S-2) — Physics → Timer clock (EN/DE/ZH).
- `src/projects/templates.ts` (S-2, S-5) — Templates write `timerClock: 'fixed'`. The moving hazards of Orbit Dodge and Hazard Crossing have their own motion scripts (`set_position`, reset on Restart, stop on the `course.finished` signal) instead of the player's script moving them with `entity_set_position` every frame; the player keeps the same formula for its hit test.
- `scripts/verify-2642-fixed-timers.mjs` (new, S-2) — Runs the real Runtime, World and script VM headless at 60, 144 and 240 Hz and checks that each timer expires in the same fixed step with the fixed clock.

## WP-L levels

- `src/projects/templates.ts`, `src/projects/templateGuides.ts`, `src/i18n.ts` — Three new templates (introduced 26.42): **Skyline Trilogy** (`platformer-trilogy`, three stages with checkpoints, moving and one-way platforms, coins and a saved best time), **Pendulum Post** (`pendulum-post`, rope-and-joint puzzle with a motorised windmill), **Reflex Lab** (`reflex-lab`, reaction game, pointer-follow comparison, script frame statistics and a marker scene for the external latency harness). Catalogue entries, EN/DE/ZH names, guides, features and release-audit contracts.
- `src/assets/template-previews/platformer-trilogy.png`, `pendulum-post.png`, `reflex-lab.png` (new) — Game-view previews captured from the editor (1518 × 553).
- `manual/index.html`, `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md` — Template sections for the three starters (same layout as the 26.15 starter sections).
- `scripts/verify-2642-levels.mjs` (new) — Catalogue, guides, release audit, project validation, identity and reference integrity, and real WASM execution of every new Rhai script (17 checks).
- `scripts/verify-v26.11-templates.mjs` — Expects 43 templates; checks the new hazard motion scripts and evaluates them for the hazard hit test; the "newest first" order now starts with the three 26.42 templates; the particle check drives the fixed-World `RuntimeParticleOwner` directly (the legacy shim requires the editor's installed port, which made the script fail with `PARTICLE_LEGACY_PORT_REQUIRED` since 26.3x).
- `scripts/verify-v26.15-library-metadata.mjs`, `scripts/fixtures/v26.15-template-library.json` — 43 launcher ids; audit metadata only compared for the 26.15 package identity it was written for.

## WP-G interface (G0)

- `src/ui/tokens.css` — iOS-style token set: System Light/Dark neutral palettes, fills, separators, label hierarchy, materials (ultra-thin to thick), glass budget states (`data-glass` live/static/off, Play degradation), Reduce Transparency, spring curves, concentric radii. The five 26.41 palettes are kept.
- `src/store/colorPalettes.ts`, `src/store/preferences.ts` — `System Light` / `System Dark` palettes and the new defaults for fresh preferences; `Reduce transparency` preference; `data-glass` is `static` for the low-end profile or an inactive window and `off` with Reduce Transparency.
- `src/panels/SettingsPanel.vue`, `src/i18n.ts` — Reduce transparency switch (EN/DE/ZH).
- `src/ui/editor.css` — Focus ring follows the control's radius; spring press feedback; tinted, gray, plain, small and large button styles; borderless fields; segmented tabs with a raised selection; glass edge ring and hover highlight; concentric menu items; tree selection grey until the tree has focus.
- `src/ui/components/UiButton.vue` — `tinted`, `gray`, `plain` variants and a `size` prop.
- `src/ui/forms.css` — Inspector sections are inset-grouped cards (header outside, 12 px radius, rows ≥ 36 px with hairline separators).
- `src/layout/EditorLayout.vue` — During Play the floating viewport controls fade out after 1.5 s without pointer movement and return on the next movement or keyboard focus.

## WP-S stability and learning

- `docs/QUICKSTART_26_42.en.md`, `docs/QUICKSTART_26_42.zh.md` (new, S-1) — 30-minute path from the Platformer template to a web export, plus four timing rules (fixed vs frame update, tick rate and latency, writes applied after the callback, event and timer timing).
- `README.md`, `README.zh-CN.md`, `manual/index.html`, `docs/FIRST_GAME_5_0.md` — Links to the quick start.
- `docs/SCRIPTING_CONTRACT_26_23.md` (S-3) — Timing within a frame: queued writes, once-per-frame physics events, frame-clock timers, `input_pressed` in fixed steps.
- `scripts/verify-2642-script-write-read.mjs` (new, S-4) — Confirms in the shipped WASM runtime that reads after a write in the same callback return the pre-callback snapshot and that script variables change immediately.

## WP-M measurement and checks

- `scripts/verify-2642-glass-budget.mjs` (new) — Live glass ≤ 5 while editing (3 measured), 0 while playing or paused, Play-mode fade and wake, overlay clears ≤ 2 in 10 s of an unlit Game view, Reduce Transparency, secondary-label contrast ≥ 4.5:1. The Reduce Transparency check clicks only after the switch has stopped moving (the Manage workspace slides in); a second click, if ever needed, is recorded in the observations.
- `scripts/verify-2642-lighting.mjs` (new) — GPU lighting backend in the Platformer template (dark and light themes, during Play) and the forced Canvas 2D fallback.
- `scripts/verify-2642-lighting-render.mjs` (new) — Builds a page around the production WebGL2Renderer, draws known scenes and reads the pixels back: shadow direction and seams, hard against soft penumbra width, the spot cone and normal-map shading.
- `scripts/latency/make_test_project.py` (M-1) — `--marker character` (Kinematic RigidBody2D + CharacterBody2D moved with `move_character`), `--tick 60|120|240`, `--interpolation Interpolate|None`.
- `docs/latency-results.md` — 26.42 release measurements (the portable executable from `releases/v26.42`) and the development measurements (lit scene 60/120 Hz, frames, character marker Interpolate/None, exported Windows Player).
- `docs/QUICKSTART_26_42.en.md`, `docs/QUICKSTART_26_42.zh.md`, `docs/SCRIPTING_CONTRACT_26_23.md` — Timer clock rules updated for the fixed-step clock.
- `docs/RELEASE_NOTES_26_42.md`, `docs/WEB_HOSTING_26_42.md` (new) — Release notes; Web hosting notes with the content-security-policy requirements for hosts that add their own policy.
- `docs/EDIT_LEDGER_26_42.md` (this file).

## Verification during development (Windows, Edge 147, this machine)

`.cache/_latency/build-checks-26.42.cmd` and `-26.42b.cmd` (logs in `.cache/evidence-26.42/checks*/`): `pnpm build` (WASM, vue-tsc, Vite), `pnpm tauri build`, node `tsc`, `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` (198 passed), `verify-2642-levels` (17/17), `verify-2642-script-write-read` (5/5), `verify-v26.11-templates` (57), `verify-v26.15-library-metadata`, `verify-2640-editor-workflow` (7/7), `verify-2641-editor-ui` (6/6), `verify-2642-glass-budget` (5/5), `verify-2642-lighting` (4/4) — all passed. Latency: `docs/latency-results.md`, raw records in `.cache/_latency/results42/`.

## Release build and checks (19 October 2026)

`.cache/_latency/release-26.42.cmd` built the released files from this working tree and ran every check (logs: `.cache/evidence-26.42/checks-release/`): `pnpm build`, `pnpm tauri build`, node `tsc`, `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` (198 passed), `verify-2642-levels` 17/17, `verify-2642-script-write-read` 5/5, `verify-2642-fixed-timers` 4/4, `verify-v26.11-templates` (62), `verify-v26.15-library-metadata`, `verify-2640-editor-workflow` 7/7, `verify-2641-editor-ui` 6/6, `verify-2642-lighting` 4/4, `verify-2642-lighting-render` 4/4 passed; `verify-2642-glass-budget` failed its Reduce Transparency check (click during the workspace slide-in, log kept as `verify-2642-glass-budget-first-run.log`). After the test fix above, `release-26.42-finish.cmd` re-ran it (5/5, one click) and only then ran `scripts/package-release-26.42.ps1`. The eleven files in `releases/v26.42` match `SHA256SUMS.txt`. The portable executable from `releases/v26.42` was then started and checked by hand and measured (`docs/latency-results.md`); `.cache/_latency/repackage-26.42.cmd` repackaged the release afterwards so that the documents and the evidence archive include those results (the executables and installers were not rebuilt).

## Moved to 26.43

- P-E2 Vue-free Player host and `verify-2642-player-boundary` (the manual's fallback: the existing Player stays the default).
- G1 window structure, and the remaining G0 details (numeric fields with axis letters and inline steppers, sheet-style dialog headers, scroll-edge masks, contrast checks for custom palettes).
- S-6 solver parameters (the manual schedules them after measurement).
- P-C step 2 (per-body interpolation) is not needed: the measured difference is below the manual's 3 ms rule.
