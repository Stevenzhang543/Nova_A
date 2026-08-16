# Nova_A 2.6.0 — Worlds, Navigation, and Gameplay Tools

Nova_A 2.6.0 turns the editor’s world-building layer into a practical gameplay toolset while preserving the exact-unit Rust physics pipeline and optional-package design.

## Highlights

- CharacterBody2D uses authoritative Rust shape casts for exact displacement, slopes, steps, floor snapping, wall/floor/ceiling state, one-way platforms, moving-platform velocity, and coyote-time helpers.
- Area2D effectors provide gravity, wind, drag, buoyancy, damage, custom signals, and enter/exit events. Transient forces accumulate for one fixed tick without forcing a retained-world rebuild.
- Optional Nova Navigation and Nova Gameplay AI packages add bounded polygon/grid navigation, A*, flow fields, path smoothing, local avoidance, dynamic rebaking, behavior trees, and hierarchical state machines. Physics-only projects do not load these modules.
- Tilemap authoring now includes palettes, functional brush presets, deterministic scatter, terrain-rule autotiling, multiple visible/locked layers, chunk culling, and collision/navigation/occluder bake reporting.
- WorldChunk2D, Portal2D, queued scene streaming, preload priorities, memory budgets, and origin shifting support large worlds.
- ObjectPool2D integrates prefab prewarming, bounded capacity, reuse, `despawn()`, and lifecycle signals.
- World Tools is a dedicated, searchable editor surface with localized English, German, and Chinese UI plus navigation/area/chunk debug overlays.
- Project Format 2 Schema 19 persists every new component, asset, package state, and world setting while preserving unknown forward-compatible fields.

## Correctness fixes found during release audit

- Registered all 2.6 gameplay components with the authoritative Rust format validator; this fixes fresh Platformer templates being rejected before editor startup.
- Prevented CharacterBody2D from applying its collision-safe displacement and then integrating the same kinematic motion a second time.
- Exposed CharacterBody logical velocity to scripts while keeping the solver velocity neutral after the shape-cast commit.
- Bound tile collision generation to the collision-bake toggle.
- Connected brush-preset size/shape/scatter and terrain-rule neighbor masks to actual tile painting.
- Added script aliases and vector maps so `can_coyote_jump()`, `character_floor_normal()`, and `character_platform_velocity()` match the documented API.
- Removed visible legacy encoding damage in the TextInput placeholder and audited the new panels for corrupt text.

## Release contents

- Portable Windows x64 executable
- Windows x64 MSI installer
- Windows x64 NSIS setup executable
- Portable web build with editor, player, WASM runtime, workers, and multilingual manual
- Complete source archive
- Release notes, MIT license, and SHA-256 checksums

Native Windows files are unsigned community builds. The web archive is the cross-platform release and requires a modern browser with WebAssembly support. macOS and Linux native bundles should be built on their target operating systems using the documented Tauri command.

## Verification

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test --workspace` — 100 tests passed
- `pnpm check`
- all manual/editor/script/rendering/animation/v2.5/v2.6 audits
- optimized Rust-to-WASM and Vite production build
- Tauri release build producing EXE, MSI, and NSIS bundles
- live production-browser test: create Platformer project, open World Tools, run simulation, stop simulation, and verify a clean current console

The Tauri bundler emitted an updater metadata warning because `__TAURI_BUNDLE_TYPE` was not found. Both installers and the portable executable were still produced successfully; this release does not advertise an automatic-updater package.
