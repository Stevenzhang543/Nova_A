# Nova_A 26.41 — Edit ledger

Every file changed from the committed 26.40 tree (`ec6a626`) to the 26.41 release, with the reason. Nothing was committed, staged or tagged during this round; all changes are in the working tree for the maintainer to commit.

## Play-mode frame cost and input latency

- `src/world/plainView.ts` (new) — Host hook that hands the Runtime the plain objects behind the editor's observable world during a playing frame, plus `PlainKeyMap` for identity-keyed maps. Runtime code never imports Vue; the editor installs `toRaw`, the Player keeps the identity view.
- `src/world/World.ts` — `entities`/`connections` are accessors over the observed arrays; inside `withPlainAccess` they return the plain arrays, so simulation, scripts and rendering stop paying Vue proxy traps on every field access (about half the CPU of a playing frame in 26.40).
- `src/runtime/GameplayRuntimeCore.ts` — Playing frames run inside `world.withPlainAccess`. Breakpoint analysis is memoised per source text instead of re-parsing the script on every call. Records the input sample time for the latency probe.
- `src/editor/runtimePresentationSync.ts` (new), `src/components/WorldCanvas.vue` — Because playing frames write plain objects, the hierarchy and the Inspector are refreshed at 10 Hz and exactly on pause/stop: array membership, entity names/enabled state, component maps (components the Runtime added, replaced or removed) and the selected objects' fields. Without this the Inspector kept showing the authored values during Play.
- `src/world/geometry.ts` — Normalisers write a field only when its value changes; idle editing no longer re-renders the Inspector every frame.
- `src/world/hierarchy.ts`, `src/runtime/tileMapOwner.ts`, `src/runtime/navigationOwner.ts`, `src/runtime/aiOwner.ts`, `src/runtime/simulationEvidenceOwner.ts`, `src/runtime/runtimeWorldHost.ts`, `src/runtime/worldStreamingOwner.ts`, `src/runtime/animationOwner.ts`, `src/runtime/timelineOwner.ts` — Identity checks and identity-keyed caches compare plain objects, so a proxy and its target are the same entity; the streaming owner returns early when a world has no streaming content.
- `src/runtime/scriptCoverage.ts`, `src/runtime/profiler.ts` — Coverage hits and script-function samples are accumulated and published at most every 250 ms instead of sorting/splicing reactive arrays on every call.
- `src/renderer/lighting2d.ts` — Shadow casting fills one path per caster with consistent winding instead of one blurred fill per boundary segment. In 26.40 every edge quad ran a full-canvas blur, which made the 2D lighting overlay the bottleneck of the whole display pipeline (about 98 world submissions per second on a 240 Hz display; 234 after the change) and removes darker seams where quads overlapped.

## Measurement

- `src/runtime/latencyProbe.ts` (new) — Opt-in latency probe: per input the handler time, the fixed step (or editor command) that consumed it and the first WebGL2 world submission after it; per frame rAF time, simulation, render and submission times, fence deferral and the GPU timer. Bounded memory, posted about once per second to a loopback collector only. Off unless a collector is named.
- `src/platform/latencyProbeHost.ts` (new), `src/App.vue`, `src/player.ts` — Activate the probe from `NOVA_LATENCY_PROBE` (desktop) or `?latencyProbe=` (Web), loopback addresses only.
- `src/runtime/input.ts` — Probe hooks on key and mouse-button edges.
- `src-tauri/src/lib.rs` — `latency_probe_endpoint` (accepts only `http://127.0.0.1:<port>` / `http://localhost:<port>`).
- `scripts/latency/nova_latency_harness.py` (new) — Windows harness: OS-injected input with `SendInput`, GDI capture of the composed desktop polled about every 4 ms, QPC clock, loopback collector with clock-sync round trips. Modes: key (play mode), drag (editor), frames (60 s).
- `scripts/latency/analyze_latency.py`, `scripts/latency/report_latency.py` (new) — Join harness and probe records with the stated clock-mapping error, write joined CSV, frame CSV and summary JSON; build the comparison tables.
- `scripts/latency/make_test_project.py` (new) — Builds the latency test project (Platformer plus a white marker driven by `input_down("Jump")` in `fixed_update`).
- `docs/latency-results.md` (new) — Method, conditions and results.

## Editor interface

- `src/ui/tokens.css`, `src/ui/editor.css` — Liquid-Glass-style material for the floating control layer only (`nv-glass`, regular/clear, capsule), with rim, sheen and hover/pressed tints; light theme, Increased Contrast and Reduce Transparency fall back to opaque surfaces.
- `src/ui/motion.css` — Menus and popovers use a 93 % surface with blur instead of a see-through tint; one chevron rotation for disclosures (the second rotation in `forms.css` turned collapsed chevrons to point up).
- `src/ui/forms.css` — Settings rows: label at the leading edge, control at the trailing edge in grouped cards; search field with an inline icon; chevron fix.
- `src/layout/EditorLayout.vue` — The opaque viewport header is gone; scene tabs, scene tools and layers float over the canvas as glass capsules and step aside for the rulers.
- `src/components/SceneTabs.vue`, `src/components/ToolBar.vue`, `src/components/LayerBar.vue` — Capsule styling; history arrows only when there is history; popovers anchored to their capsule.
- `src/components/WorldCanvas.vue` — Rulers use the theme tokens (resolved once per theme change), 20 px band, 10 px labels and a less crowded tick spacing.
- `src/components/ConfigPanel.vue` — Transform first; rarely used object settings collapsed below the components; Connections opens only when there are connections; compact header with the add-component button and one scrolling row of categories and filters.
- `src/components/ObjectOwnershipPanel.vue` — Same disclosure style as the other Inspector sections.
- `src/components/EditorBottomPanel.vue` — The asset toolbar stays on one row in narrow docks (secondary actions become labelled icon buttons).
- `src/components/CreateObjectPalette.vue` — Category chips wrap instead of being clipped by the dialog edge.
- `src/panels/SettingsPanel.vue` — Search label not repeated, documentation link inline, sliders show the value once.
- `src/components/EditorFeedback.vue`, `src/layout/StatusBar.vue` — The notification history opens from the status bar; the pill no longer floats over the Inspector when no toast is showing.
- `src/i18n.ts` — "Connections" capitalised in English.

## Desktop behaviour

- `src-tauri/src/lib.rs`, `src/platform/launchProject.ts` (new), `src/App.vue` — A `.nova` path on the command line (Open With / file association) opens through the normal open preflight, after any crash-recovery prompt.
- `src/runtime/teamWorkflow.ts`, `src/App.vue` — Closing the desktop window releases this editor's project lease; before, a lease could outlive the window and the next session reported the project as locked for up to two hours.

## Version, build, release and tests

- `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `crates/nova_format/src/lib.rs`, `src/projects/projectFormat.ts`, `tests/fixtures/migrations/public-schema-expected.json` — Version 26.41.0 / release name 26.41. Project format 2, schema 29 unchanged.
- `src/store/physics.ts` — Installs the editor's plain view; development-only hooks for the dev server.
- `scripts/verify-engine-script-state.mjs` — Flushes the batched coverage before reading it.
- `scripts/verify-2641-editor-ui.mjs` (new) — Regression test with real input for the 26.41 fixes (floating chrome, chevrons, Inspector during Play, notification history, Create object categories, Settings alignment).
- `scripts/build-release-26.41.cmd`, `scripts/package-release-26.41.cmd`, `scripts/package-release-26.41.ps1` (new) — Build and package the eleven-file set. The source archive is built from the working tree (`git ls-files` read-only), never from `git archive HEAD`, and no script writes to git.
- `docs/RELEASE_NOTES_26_41.md`, `docs/EDIT_LEDGER_26_41.md`, `docs/WEB_HOSTING_26_41.md` — This release's documents.
- `AGENTS.md` — Current task, version and the no-commit rule for this round.
