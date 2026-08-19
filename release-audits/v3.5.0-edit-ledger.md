# Nova_A 3.5.0 exhaustive edit ledger

This ledger records every v3.5.0 source, project-format, editor, runtime, test, documentation, generated-reference, audit, evidence, and packaging edit. The retained v3.4 production-physics implementation is not removed or relabelled; entries below describe the 3.5 programming-workflow delta and the final formatting corrections.

## Version and project-format authority

- `package.json`: set 3.5.0; add API documentation, language-server, headless script-test, v3.5 audit/verification/layout/evidence commands; retain the complete historical audit chain.
- `pnpm-lock.yaml`: refresh lock metadata for the 3.5 package authority without changing the dependency surface.
- `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`: synchronize workspace crates, native package, and application metadata to 3.5.0.
- `src/projects/projectFormat.ts`, `crates/nova_format/src/lib.rs`: advance Project Format 2 to schema 25/engine 3.5.0; add validated additive script metadata while retaining schema 5–24 migration behavior and unknown compatible fields.
- `tests/fixtures/migrations/public-schema-inputs.json`, `tests/fixtures/migrations/public-schema-expected.json`: extend public golden migration coverage through schema 25.
- `docs/PROJECT_FORMAT_2_SCHEMA_25.md`: document the schema-25 script-asset contract, migration, rollback, compatibility, and validation rules.
- `scripts/nova-export.mjs`, `src/runtime/gameExporter.ts`, `src/runtime/novaPak.ts`, `src/runtime/packages.ts`, `src/runtime/shipping.ts`, `src/runtime/testRunner.ts`, `scripts/package-release.ps1`, and `scripts/stability-v3.mjs`: update export, package, test, stability, release-schema metadata, and complete release-document packaging to 3.5.0/schema 25.

## Embedded Rhai host and stable API

- `crates/nova_script/src/lib.rs`: freeze Nova Rhai API v1; add versioned deterministic scene/entity/component/resource handles; add structured export metadata; register lifecycle, scene/object/component/transform/input/physics/UI/audio/animation/navigation/save/time/log/resource functions; add UI text/value and navigation target commands; add debug/info/warning/error logging; add signals, timers, deferred calls, cancellable tasks, modules/packages, deprecation diagnostics, trigger stay and timer lifecycle; reject invalid arguments explicitly; retain the last valid cached AST after compile failure; and add 15 focused host/API/compatibility tests.
- `crates/nova_script/examples/nova_script_test.rs`: add the headless test runner with discovery, setup/teardown, parameterized cases, timeout, skip, tags, deterministic seeds, output capture, JSON/JUnit reports, and exit codes 0/1/2.
- `tests/fixtures/scripting/headless-pass.rhai`, `headless-fail.rhai`: add deterministic passing/skipped/parameterized and intentional-failure CI fixtures.
- `tests/fixtures/scripting/api-v1-contract.json`: archive all 108 API v1 symbols for compatibility checking.

## Script assets, serialization, and runtime

- `src/assets/types.ts`: add API version, detailed breakpoint, test, dependency/package, reload-policy, signal-connection, recovery-source, and saved-hash script fields.
- `src/assets/AssetDatabase.ts`: normalize every schema-25 script field, preserve old script assets, and supply safe defaults.
- `src/world/components.ts`: extend script properties with type/default/range/step/enum/resource/group/tooltip/serialization metadata.
- `src/store/physics.ts`: serialize script metadata and omit properties explicitly marked non-serializable.
- `src/projects/templates.ts`: upgrade built-in scene/project scripts to supported v1 callbacks and schema-25 asset defaults.
- `src/runtime/GameplayRuntime.ts`: connect complete export metadata, property synchronization/clamping, project-local module resolution, timer/task/signal callbacks, UI/navigation host commands, detailed breakpoints, break-on-error/source frames, atomic hot reload with preserve/recreate/disabled policies, deterministic script tests, and per-callback profiling.
- `src/runtime/scriptSettings.ts`: add v1 compatibility, diagnostic, debugger, reload, task/timer, and script-workflow settings.
- `src/runtime/scriptDebug.ts`: add debugger sessions, pause/continue/restart, callback-boundary step modes, stable breakpoint evaluation, stack/scopes/locals/watches/evaluation/object inspection, and reload status.
- `src/runtime/profiler.ts`: add per-script/per-callback calls and timing, allocation estimates, bounded captures, capture comparison, and exportable profiler state.

## Language service, templates, and external protocol

- `src/editor/scriptApi.ts`: define the 108-symbol API v1 catalog across all required domains with signatures, parameters, documentation, examples, namespaces, lifecycle markers, and deprecation replacements.
- `src/editor/scriptLanguage.ts`: add stable coded/ranged/phase diagnostics; deduplication; semantic tokens; API-aware completion and parameter help; hover; definition/references; safe rename; formatter; quick fixes; symbols/outline; workspace index; test discovery; dependency analysis; API usage; and JSON-lines protocol dispatch. Fix export-annotation recognition and unmatched-brace range uniqueness found by fuzzing.
- `src/editor/scriptTemplates.ts`: centralize default source and add supported Component, UI, Physics, Animation Event, and Test templates without unsupported callbacks.
- `scripts/nova-rhai-language-server.mjs`: expose `nova-rhai-language/1` over stdio with analyze/completion/hover/definition/references/workspace-symbol/formatting/shutdown methods.
- `scripts/generate-script-api-docs.mjs`: generate API docs and coverage, verify all docs/examples/host bindings, and compare the frozen archive for breaking changes.
- `docs/RHAI_API_V1.md`: generate the complete signature/example/deprecation reference for all 108 symbols.
- `docs/RHAI_LANGUAGE_PROTOCOL.md`: document protocol framing, methods, messages, configuration, and external editor integration.

## Script Studio, Inspector, Profiler, and layout

- `src/components/ScriptStudio.vue`: redesign the programming workspace; add template selection, formatting, references, API version, module/package and reload controls, detailed breakpoints, debug controls, stack/scopes/watches/evaluation, test editing/results, signal connections, API browser/examples/deprecation guidance, Problems codes/phases/actions, outline/references, recovery/hash state, and responsive inspector stacking.
- `src/components/ConfigPanel.vue`: render grouped script export metadata consistently and raise property-help text to the 11 px readable floor.
- `src/components/ProfilerPanel.vue`: add the Scripts tab, per-callback timing table, captures/export/comparison, responsive small-screen layout, and raise heading text to the 11 px readable floor.
- `src/components/EditorBottomPanel.vue`: use the centralized supported default script template and retain existing Assets/Console/Animation/Tilemap/Settings/Build behavior.
- `src/i18n.ts`: add complete English, German, and Chinese labels/messages for templates, API version, modules/packages, reload policy/state, signals, breakpoints, debugger, tests, profiler, diagnostics, recovery, and API browsing.
- `src/components/CommandPalette.vue`, `ProjectHealthPanel.vue`, `ProjectManager.vue`, `RuntimeComponentsInspector.vue`, `SceneSideBar.vue`, `StudioStatusDialog.vue`, `ToolBar.vue`, `WorldCanvas.vue`, `src/layout/EditorLayout.vue`, `SideBar.vue`, `TopBar.vue`, `src/panels/SettingsPanel.vue`: retain and qualify existing editor surfaces under the 3.5 responsive/version/layout contract; update current version/schema messaging where present.
- `src/components/ContextMenu.vue`, `src/editor/gizmo.ts`, `src/renderer/sceneRenderer.ts`, `src/store/editor.ts`, `src/world/Entity.ts`, `World.ts`, `Connection.ts`, `geometry.ts`, and `hierarchy.ts`: retain existing authoring/rendering behavior and compatibility while adopting the current project/runtime types.

## References and examples

- `scripts/export-reference-projects.mjs`: export schema-25/engine-3.5 references and add five required scripting projects with deterministic expected results and test controls.
- `reference-projects/README.md`: document the v3.5 lifecycle/signals, async/tasks, debugger, test-runner, and API-v1 examples plus all retained references.
- Added `reference-projects/projects/script-lifecycle-signals`, `script-async-tasks`, `script-debugger-scenarios`, `script-test-runner`, and `script-api-v1-examples`, each with `project.nova`, `README.md`, `expected-output.json`, and `test-controls.json`.
- Regenerated every retained top-level/bundled reference—`empty`, `platformer`, `top-down`, `physics-sandbox`, `ui-showcase`, `networked-optional`, `data-foundation-validation`, `workspace-recovery-validation`; the six authoring references; and the six production-physics references—to engine 3.5.0/schema 25 without deleting their behaviors.

## Verification, audit, and evidence

- `scripts/verify-v3.5.mjs`: add 10,000-case parser/diagnostic fuzzing, semantic/template checks, direct/external language protocol tests, 13 debugger callback paths, atomic hot-reload test, headless runner/JUnit/exit-code tests, API compatibility checks, and 5,000-line error-storm benchmark.
- `scripts/audit-v3.5.mjs`: add 17 static requirement groups covering the full programming workflow, bindings, UI, docs, references, compatibility, and release evidence.
- `scripts/qualify-layout-v3.5.mjs` and the parameterized base qualifier: cover English/German/Chinese; 800/1024/1280/1600/1920 widths; every workspace; every Script and Profiler tab; settings, bottom and side panels; overflow, overlap, vertical writing, console, and fatal surfaces; generate six screenshots and a 261-state report.
- `scripts/generate-v3.5-release-evidence.mjs`: generate build-environment, SPDX SBOM, third-party, localization, platform, and exact v3.5 known-issue evidence.
- `scripts/audit-manual.mjs`, `audit-editor-shell.mjs`, `audit-script-studio.mjs`, `audit-rendering.mjs`, `audit-animation.mjs`, `audit-v2.5.mjs` through `audit-v3.2.mjs`, and `audit-v3.mjs`: recognize 3.5.0/schema 25 while continuing to test every historical feature. Correct schema coverage to 5–25 and the 11 px typography floor.
- `release-audits/v3.5.0-*.json` and `release-audits/screenshots/v3.5.0/*`: generate API coverage, fuzz, debugger, hot reload, test CI, protocol, compatibility, benchmarks, layout, programming-workflow, reference, stability, build, platform, accessibility, SBOM, and known-issue evidence.

## Documentation

- `README.md`, `README.zh-CN.md`: rewrite the current release overview, feature map, stable API, programming workflow, build/test/release commands, compatibility, references, and release files for 3.5.0.
- `docs/SCRIPTING_3_5.md`: add the complete workflow, API contract, handles, exports, callbacks, signals, async work, modules, diagnostics, debugger, reload, tests, profiler, templates, migration, and limitations guide.
- `docs/BENCHMARKS.md`, `COMPATIBILITY.md`, `KNOWN_LIMITATIONS.md`, `STABILITY.md`, `STABLE_CONTRACTS.md`: update current authority, measurements, schema/API guarantees, qualification state, and honestly disclosed limitations.
- `docs/PROJECT_FORMAT_2_SCHEMA_23.md`, `PROJECT_FORMAT_2_SCHEMA_24.md`: retain historical schema references and point readers to current schema 25 where appropriate.
- `manual/MANUAL.en.md`, `MANUAL.de.md`, `MANUAL.zh-CN.md`: add complete localized v3.5 Script Studio, API, debugger, reload, test, profiler, and migration instructions.
- `manual/index.html`: update engine/schema metadata and add bookmarkable English/German/Chinese v3.5 scripting sections.
- `release-audits/v3.5.0-release-notes.md`, `migration.md`, `deprecations.md`, `known-issues.md`, and this ledger: publish exact behavior, compatibility, changes, and boundaries.

## Generated release files

- `nova_core/pkg/*` and `dist/*`: regenerate release WebAssembly and optimized editor/player/manual assets from the verified sources.
- `src-tauri/target/release/nova_a.exe`, MSI, and NSIS setup executable: rebuild from the v3.5.0 source and lockfiles.
- `releases/v3.5.0/*`: package portable EXE, MSI, setup EXE, Web/source/reference/evidence archives, release documents, SPDX SBOM, license, and SHA-256 checksums.

No user-facing feature or animation was intentionally removed. The final formatting-only correction changes four 10 px labels to 11 px and does not alter control dimensions, data, calculations, rendering, or input behavior.
