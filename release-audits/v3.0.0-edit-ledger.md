# Nova_A 3.0.0 exhaustive edit ledger

Scope: changes made for the v3.0.0 stabilization request. No user-facing feature or animation was deleted. Project schema remains 22; only engine/product SemVer moved to 3.0.0.

## Added files

- `.github/workflows/release-matrix.yml` — clean Windows/Linux/macOS core, audit, web and native bundle matrix; separate honest Android contract gate.
- `.github/workflows/stability-24h.yml` — explicit self-hosted 24-hour qualification and report upload.
- `docs/STABLE_CONTRACTS.md` — frozen project/runtime/plugin/package/CLI contracts.
- `docs/COMPATIBILITY.md` — previewed, backed-up, atomic migration policy and golden scope.
- `docs/BENCHMARKS.md` — methodology, budgets, exceptions, and corrective-plan policy.
- `docs/STABILITY.md` — smoke versus 24-hour qualification rules and fault containment.
- `docs/PLATFORM_VERIFICATION.md` — honest Windows/web/Linux/macOS/Android evidence matrix.
- `docs/KNOWN_LIMITATIONS.md` — explicit 2D scope and optional/native/platform boundaries.
- `crates/nova_physics/examples/v3_benchmark.rs` — deterministic release-mode 2,000-body throughput workload with finite-output assertion.
- `tests/fixtures/migrations/public-schema-inputs.json` and `public-schema-expected.json` — public schema 5–22 migration goldens.
- `src/runtime/stableContracts.ts` — single public contract authority, Studio Status state, and diagnostics.
- `src/runtime/faultCenter.ts` — deduplicated, bounded recoverable/fatal fault storage and diagnostics.
- `src/components/StudioStatusDialog.vue` — in-app stable-contract viewer, manual link, and diagnostic copy.
- `src/components/ErrorRecovery.vue` — in-app fatal recovery, diagnostics download/copy, safe continuation, and Safe Mode restart.
- `scripts/export-reference-projects.mjs` — deterministic generator/auditor for six source projects and Plugin API 2 WASM sample.
- `scripts/benchmark-v3.mjs` — machine-readable physics/script/import/export/size benchmark with explicit unavailable metrics; production web evidence also records JavaScript file count, aggregate raw/gzip bytes, and the largest chunk.
- `scripts/stability-v3.mjs` — bounded/24-hour play-stop, streaming, reimport, corruption, and plugin-isolation harness.
- `scripts/audit-typography.mjs` — 16 px base, 11 px floor, multilingual font, smoothing, and reduced-motion gate.
- `scripts/audit-v3.mjs` — contracts, versions, migration goldens, localization, controls, dialogs, references, docs, CI, and optional-package gate.
- `reference-projects/README.md`; `projects/empty.nova`, `platformer.nova`, `top-down.nova`, `physics-sandbox.nova`, `ui-showcase.nova`, `networked-optional.nova`; `plugins/hello-plugin/plugin.json`, `hello-plugin.wasm` — generated editable reference bundle.
- `release-audits/v3.0.0-benchmarks.json` — measured headless results and explicit pending interactive metrics.
- `release-audits/v3.0.0-stability-smoke.json` — 500-cycle bounded local result, explicitly not a 24-hour pass.
- `release-audits/v3.0.0-release-notes.md` and this ledger — release communication/evidence.

## Contract, version, format, and build edits

- `Cargo.toml`, `Cargo.lock`; `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`; `package.json`; `src/projects/projectFormat.ts`; `crates/nova_format/src/lib.rs` — synchronized engine/product/crate metadata to 3.0.0 while retaining Project Format 2/schema 22/minimum 5.
- `src-tauri/src/lib.rs`, `src/runtime/gameExporter.ts`, `src/runtime/replay.ts`, `src/runtime/shipping.ts`, `src/runtime/testRunner.ts`, `src/assets/projectFolder.ts`, `src/runtime/novaPak.ts`, `src/world/World.ts` — synchronized generated reports, replays, telemetry, tests, folders, packages, crash logs, symbol maps, platform configs, and defaults to engine 3.0.0.
- `src/runtime/plugins.ts`, `src/runtime/packages.ts` — consume centralized Plugin API 2/Manifest 1 constants; package SemVer supports comparator intersections and accurate caret-zero semantics; official optional packages accept the compatible 3.x range.
- `scripts/nova-export.mjs` — Build CLI 1 reports engine 3.0.0 and correctly encodes inline text assets.
- `scripts/package-release.ps1` — release now requires/copies notes and ledger and adds reference-project/evidence ZIPs before checksumming everything.
- `vite.config.ts` — isolates the Vue runtime for smaller cacheable chunks and preserves the separate WASM runtime chunk.

## Migration, reference, export, and stability edits

- `crates/nova_format/src/lib.rs` — added schema 5–22 golden projection/round-trip and deterministic corrupted-input no-panic/future-schema tests; updated current-engine assertions.
- `src/projects/templates.ts` — platformer gains real Light2D/ShadowCaster2D and enabled ambient lighting; audit requires them; network sample range is v3-compatible.
- `src/runtime/novaPak.ts` and `scripts/nova-export.mjs` — known inline text asset types use UTF-8 bytes; binary/data/blob/HTTP/disk sources retain their existing paths. This fixes template export without changing asset content.
- `scripts/stability-v3.mjs` — corrected the bounded-smoke loop to select duration *or* cycle count (the first pre-release run exposed and stopped the incorrect infinite-deadline OR condition).
- `scripts/benchmark-v3.mjs` — records the full parsed exporter report instead of only its closing line.

## Fault-containment edits

- `src/App.vue`, `src/main.ts` — globally mount recovery/status UI and catch Vue/mount failures.
- `src/runtime/crashReporter.ts` — reports through the fault center, catches persistence failures, prevents duplicate browser propagation, and retains ResizeObserver-warning filtering.
- `src/components/WorldCanvas.vue` — catches animation-frame/WASM startup errors and stops the failing frame loop safely.
- `src/runtime/productionRuntime.ts`, `src/components/ProfilerPanel.vue` — optional networking load/start/stop failures are recoverable and cannot become unhandled fatal promises.
- `src/assets/AssetDatabase.ts`, `src/components/EditorBottomPanel.vue` — queued atlas rebuilds capture failure, retain the previous atlas, and expose a localized warning.
- `src/layout/TopBar.vue` — Help gains Studio Status; About opener/pop-up failures are recoverable rather than unhandled.

## Localization, manuals, and release-audit edits

- `src/i18n.ts` — EN/DE/ZH strings for v3 status, contracts, diagnostics, recovery, website failure, atlas failure, and final v3 label.
- `README.md`, `README.zh-CN.md` — v3 scope, contracts, references, evidence, pending qualification, packaging command, and schema/version metadata.
- `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md`, `manual/index.html` — engine 3.0 metadata and section 26 covering contracts, migrations, recovery, references, evidence, and limitations; HTML bookmarks/language switch include v3. The browser audit also caught and corrected the embedded masthead's stale `2.9 Documentation` label.
- `scripts/audit-manual.mjs`, `scripts/audit-editor-shell.mjs`, `scripts/audit-v2.7.mjs`, `scripts/audit-v2.8.mjs`, `scripts/audit-v2.9.mjs` — retained feature audits now validate the current 3.0 metadata while continuing to gate their original feature sets.

## Typography and control semantics edits

- `src/assets/main.css` — 16 px scalable base, 12/13/15 px tokens, 34 px normal input floor; existing antialiasing, multilingual rounded font stack, compact mode, high contrast, and reduced motion retained.
- Mechanically raised positive explicit text below 11 px to 11 px in: `src/panels/SettingsPanel.vue`; `src/layout/SideBar.vue`, `TopBar.vue`, `StatusBar.vue`; and `src/components/ActionBar.vue`, `AnimationPanel.vue`, `BuildSettingsPanel.vue`, `CommandPalette.vue`, `ConfigPanel.vue`, `ConnectionBuilder.vue`, `ContextMenu.vue`, `EditorBottomPanel.vue`, `LayerBar.vue`, `ManualViewer.vue`, `PackageManagerPanel.vue`, `PhysicsRuntimePanel.vue`, `ProfilerPanel.vue`, `ProjectManager.vue`, `RuntimeComponentsInspector.vue`, `RenderingPanel.vue`, `PresentationPanel.vue`, `SaveDataSettings.vue`, `PluginSettings.vue`, `SceneSideBar.vue`, `TeamWorkflowPanel.vue`, `TilemapPanel.vue`, `ToolBar.vue`, `WorkspaceBar.vue`, `ScriptStudio.vue`, `WorldToolsPanel.vue`. Zero-size responsive label hiding was not changed.
- `src/components/PresentationPanel.vue` — marks theme preview controls read-only/disabled instead of implying commands.
- `src/components/ScriptStudio.vue` — test result rows use non-interactive article semantics instead of inert buttons.

## Generated/verification consequences

- Regenerated `reference-projects/**` after template/range changes and `Cargo.lock` after the crate version bump.
- No source feature was removed. Larger minimum text may wrap sooner; responsive/narrow layouts and browser smoke are release gates.
- 24-hour, Linux, macOS, signed Android, and interactive GPU/native performance results are not fabricated; their workflows and pending state are published.
- The successful MSI/NSIS build's Tauri bundle-type marker advisory is documented explicitly: Nova_A does not ship the updater plugin or updater signatures, so 3.0.0 distribution uses full installers and does not claim automatic differential updates.

## Verification performed

- `vue-tsc --noEmit` passed; the production Vite/WASM build completed with 231 transformed modules.
- The complete manual/editor/script/rendering/animation/v2.5/v2.6/v2.7/v2.8/v2.9/typography/v3 audit chain passed. The v3 audit covered 1,107 visible controls and every public schema 5–22 golden.
- `cargo fmt --all -- --check` and `cargo clippy --workspace --all-targets -- -D warnings` passed.
- `cargo test --workspace --all-targets` passed 110 tests: format 32, math 2, physics 59, runtime 5, script 11, plus non-test crates/examples; `cargo test --manifest-path src-tauri/Cargo.toml` passed four native exporter/path/hash/package tests.
- Browser smoke covered all five workspaces, all four primary views, all eleven bottom panels, EN/DE/ZH, light/dark, contrast, reduced motion, 900×600 responsive layout, Play/Pause/Step/Stop, Physics Monitor, Studio Status, and all three manual languages. No page-console error or whole-page overflow remained.
- The packaged native executable started hidden, remained alive and responsive for the startup smoke, and was then stopped by its exact process ID.
- Authenticode inspection reports `NotSigned` for the EXE, MSI, and NSIS outputs. The release notes, platform matrix, and known-limitations document now state this explicitly; SHA-256 verification is included, while publisher signing remains external work requiring Whitelist's certificate.
- The bounded stability smoke passed 500 play/stop cycles, 1,166 streaming operations, 500 reimports, 500 corrupt inputs, and 500 isolated plugin traps. The 24-hour flag remains honestly false.
- The final benchmark recorded finite 2,000-body physics, 1,000 script samples, 20 × 16 MiB import samples, deterministic platformer export, the 10,372,608-byte native executable, and measured production JavaScript sizes. Interactive GPU/native metrics remain explicitly null with corrective plans.
- Release packaging produced 11 required files: portable EXE, MSI, NSIS, web/source/reference/evidence ZIPs, notes, ledger, license, and checksum manifest. All ten payload SHA-256 entries matched; all ZIP paths were traversal-safe; the source archive contains package/manual/evidence files, and the portable executable reports file/product version 3.0.0.
