# Nova_A 2.8.0 release notes

Release date: 2026-08-14  
Project format: Nova_A Project Format 2, schema 21  
Compatibility: legacy schema 5 and later migrate forward; unknown future schemas remain read-only/rejected.

## Production Lab

- Replaced the old bottom-panel Profiler entry with a responsive seven-tab Production Lab while retaining the existing profiler chart and physics-debug controls.
- Added bounded frame traces correlating input, scripts, animation, physics, audio, rendering, assets, allocation/lifetime changes and enabled GPU passes.
- Added total/asset memory budgets, current and peak evidence, lifetime history, leak-trend detection, named captures and capture comparison.
- Added deterministic input record/replay assets, fixed random seeds, per-fixed-step physics checksums, strict mismatch stopping and JSON export.
- Added Unit, Scene, Integration and Headless test definitions with bounded steps/timeouts, assertions, optional screenshots and JSON/JUnit reports.
- Added Data Schema and Data Table assets, field/row validation, CSV/JSON/database-result import and generated TypeScript accessors.
- Added a bounded cancellable job scheduler with configurable workers/queue/timeout and a serialized fallback when Web Workers are unavailable.

## Optional networking and headless runtime

- Added the official `top.whitelists.novaa.networking` package. It is uninstalled/disabled and excluded from player project data by default.
- Added a transport abstraction with browser WebSocket and Tauri native UDP transports, bounded reconnect lifecycle, RPC handlers/calls, snapshot sequence/state, interpolation, velocity extrapolation, rollback helpers and diagnostics.
- Added per-entity Server/Owner authority and independently selectable Transform, Rotation and Velocity replication. The selected properties now control serialized and applied fields.
- Applied the configured bandwidth ceiling independently to outbound and inbound traffic; messages, entities, events, rollback history and diagnostics are bounded.
- Added Game and Authoritative Headless Server runtime modes. Headless mode requires a native target, installed/enabled networking and Server or Host role, omits the canvas and advances fixed gameplay on a bounded timer.
- Guarded asynchronous networking startup so Play/Stop during module loading cannot resurrect a stopped session.

Networking limitations are explicit: WebSocket uses an external WebSocket endpoint/relay; native UDP uses a configured bind address and unicast endpoint. Nova_A provides deterministic helpers and checksums but does not promise that arbitrary user scripts or floating-point simulations are bit-identical across all hardware.

## Data and persistence

- Save slots now use a versioned `nova-save` envelope.
- Project-configured ordered save migrations support top-level rename, default and remove operations. Gaps and future versions are rejected rather than guessed.
- Schema 21 migrates and validates Production Lab, tests, save migration bounds, jobs, optional networking, replication definitions and build runtime mode.
- Data Schema, Data Table and Replay assets are discoverable, editable, serializable and included through the normal asset/build graph.

## Rendering and interface quality

- Requested multisample anti-aliasing for the main WebGL renderer and material previews.
- Enabled high-quality Canvas2D interpolation plus round line caps/joins on scene and overlay paths.
- Enabled font kerning, common ligatures, contextual alternates and optical sizing. Explicit Nearest texture filtering remains unchanged for pixel art.
- Made the Production Lab responsive at desktop, narrow desktop and 900 × 600 layouts; replicated-property controls wrap rather than overflow.
- Updated all new UI labels in English, German and Chinese and added full v2.8 documentation to all three Markdown manuals and the bookmarkable language-switching HTML manual.

## Reliability corrections made during the release audit

- Prevented the bounded job scheduler from flooding its single-thread fallback when workers are busy or unavailable.
- Rejected queued and active jobs cleanly during scheduler shutdown.
- Fixed replay playback ordering so session reset cannot overwrite the recorded seed.
- Disabled screenshots for genuine headless tests.
- Added safe network message normalization, bounded exponential reconnect and cleanup after failed transport startup.
- Prevented removing an absent replication definition from deleting the last definition.
- Added explicit `runtimeMode: game` to every built-in project template.
- Added deterministic Rhai `random()` and `random_range()` with repeatability and range tests.

## Validation

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test --workspace --all-targets` (105 tests)
- `vue-tsc --noEmit`
- every legacy and v2.8 static feature-binding audit
- optimized Rust-to-WASM/Vite production build
- browser visual/interaction smoke at normal desktop and 900 × 600
- Tauri Windows release build, portable EXE, MSI and NSIS installers
- versioned Web/source archives and SHA-256 manifest

No existing user feature or animation was intentionally removed.
