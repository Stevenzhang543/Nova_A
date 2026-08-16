# Nova_A 3.2.0 edit ledger

Source state: reviewed working-tree snapshot based on the repository HEAD recorded in build evidence; no signed tag was created.  
Schema: Project Format 2 advances from 22 to 23.  
Public contracts: Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 are unchanged.  
Dependencies: no new third-party dependency; locked workspace package versions advance to 3.2.0.  
Migration: ordered registry covers schemas 5–23; schemas 5–22 receive manifest/asset defaults and component dependencies before validation.

## Added source and specifications

- `src/projects/projectManifest.ts` — typed manifest, directory ownership, engine range, package lock, build-preset references, defaults, and validation.
- `src/projects/projectData.ts` — canonical deterministic serializer, stable ordering policy, finite-number normalization, manifest/project normalization, and canonical project text.
- `src/runtime/projectIntegrity.ts` — project Validate/Repair, missing references, stable-ID checks, component dependencies, backup/rollback, unused resources, and scene dependency graph.
- `src/runtime/sceneInstances.ts` — create/instantiate/unpack nested scene assets and remap local/entity references safely.
- `docs/PROJECT_FORMAT_2_SCHEMA_23.md` — authoritative schema-23 format, serialization, migration, compatibility, identity, and folder rules.
- `scripts/audit-v3.2.mjs` — schema/data/UI/window static acceptance audit.
- `scripts/verify-v3.2.mjs` — no-op/deterministic saves, full migration matrix, interruption rollback, move/rename preservation, and nested reference verification.
- `scripts/benchmark-v3.2.mjs` — 50,000-asset index/search benchmark with explicit budget.
- `scripts/qualify-editor-v3.2.mjs` — fresh-profile keyboard, global F11 enter/exit, fatal-console, and four-resolution layout qualification.
- `scripts/qualify-native-window-v3.2.ps1` — exact native maximized/decorated/resizable launch measurement; CDP F11 measurement when WebView2 exposes a fresh debug target, with an honest `passed-with-gap` result when a reused production process prevents the transition rerun.
- `scripts/generate-v3.2-release-evidence.mjs` — build-environment and SPDX dependency evidence.
- `reference-projects/projects/data-foundation-validation.nova` — nested-scene/prefab, override, imported-asset, dependency, external-change, and missing-reference repair fixture.
- `reference-projects/projects/data-foundation-validation/*` — generated README, expected output, test controls, validation command, and canonical project copy.
- `release-audits/v3.2.0-*` — format, migration, serialization, move/rename, benchmark, reference, browser/native, build, test, accessibility, security, known-issue, notes, and provenance evidence.

## Project format, serialization, and persistence edits

- `crates/nova_format/src/lib.rs` — current engine 3.2.0/schema 23, typed manifest checks, explicit migrations 5→23, asset metadata/default migrations, stable sort rules, component dependency insertion, corruption coverage, and golden fixture updates.
- `src/projects/projectFormat.ts` — frontend format authority becomes engine 3.2.0/schema 23.
- `src/store/physics.ts` — persists manifest/asset database, canonical text, prefab/scene instance layers, and remaps nested stable IDs when cloning.
- `src/world/Entity.ts` — adds typed `PrefabInstanceLayer` and `SceneInstanceLayer` persistence.
- `src/runtime/prefabs.ts` — nested prefab layers, override comparison, individual reset, outer-layer unpack, and source-local identity retention.
- `src/runtime/projectUpgrade.ts` — dry-run registry plan, source/target compatibility details, and package impact.
- `src/projects/projectManager.ts` — transactional open/restore and future-schema read-only compatibility documents.
- `src/projects/templates.ts` — schema-23 manifest/data defaults in new projects.
- `tests/fixtures/migrations/public-schema-inputs.json` — public corpus now covers every schema 5–23.
- `tests/fixtures/migrations/public-schema-expected.json` — golden target becomes schema 23/engine 3.2.0.

## Asset database/import edits

- `src/assets/types.ts` — importer version, source/artifact hashes, dependency/reverse-dependency metadata, favorites, state, linked source, generated/read-only status, presets, previews, and logs.
- `src/assets/contentHash.ts` — synchronous, dependency-free SHA-256 with known-answer verification plus consistent data-URL source decoding for editor-created and repaired assets.
- `src/assets/importPipeline.ts` — bounded retry/log lifecycle, distinct source/artifact SHA-256 and cache key, last-valid result, cancellation, automatic linked-source reimport, failed-reimport conflict retention, external-change records, and preset-aware import settings.
- `src/assets/AssetDatabase.ts` — stable database settings, reverse graph rebuild, favorites/saved filters/presets, generated protection, external source watching/reimport, reference-preserving move/rename, dependency/unused/missing queries, and canonical snapshot support.
- `src/assets/projectFolder.ts` — canonical export and schema-23 project folder/manifest behavior.
- `src/components/EditorBottomPanel.vue` — replaces resource chips with searchable filters; adds favorites, saved filters, hashes, source linking, external-change resolution, queue retry/logs, presets, generated badges, previews, scene asset create/instantiate, dependencies, reverse dependencies, missing repair, unused report, and operation previews.

## Scene, prefab, inspector, and health UI edits

- `src/components/ConfigPanel.vue` — prefab Compare/Reset and scene-instance Unpack controls; compact code/button text raised to 11 px.
- `src/components/ProjectHealthPanel.vue` — manifest view, Validate/Repair/Backup/Rollback actions, issue disposition, and scene dependency graph.
- `src/components/ProjectManager.vue` — schema 23, engine/package compatibility, dry-run migration steps, backup messaging, and future-schema read-only viewer.
- `src/components/CommandPalette.vue` — Project Validate/Repair commands; keyboard badges/icons raised to 11 px.
- `src/i18n.ts` — all new project, asset, scene, prefab, compatibility, repair, external-change, preset, operation-preview, and maximized-window strings in English, German, and Chinese.

## Window, typography, and UX edits

- `src-tauri/tauri.conf.json` — version 3.2.0; initial window is maximized, decorated, resizable, and not fullscreen.
- `src-tauri/capabilities/default.json` — retains only the window capabilities needed for maximize/restore/F11 and monitor recovery.
- `src/runtime/editorWindow.ts` — converts unexpected startup fullscreen to normal windowing, defaults to maximize, restores validated saved bounds when requested, and keeps F11 as explicit true fullscreen.
- `src/store/preferences.ts` — adds default-on `launchMaximized`, migrates the legacy fullscreen preference, and permanently disables automatic true fullscreen.
- `src/panels/SettingsPanel.vue` — exposes “Launch in a maximized resizable window.”
- `src/components/BuildSettingsPanel.vue`, `CommandPalette.vue`, `ConfigPanel.vue`, `ConsolePanel.vue`, `EditorBottomPanel.vue`, `ProfilerPanel.vue`, `ProjectManager.vue`, `RenderingPanel.vue`, `SaveDataSettings.vue`, `ScriptStudio.vue`, and `WorkspaceBar.vue` — raise all remaining 8–10 px normal/monospace text to the enforced 11 px floor.
- `scripts/audit-typography.mjs` — also audits CSS `font` shorthand so tiny text cannot bypass the floor.

## Version, runtime, build, docs, and retained-audit edits

- `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `package.json`, `src-tauri/src/lib.rs`, and serialized/runtime version constants in `src/runtime/gameExporter.ts`, `novaPak.ts`, `packages.ts`, `replay.ts`, `shipping.ts`, `testRunner.ts`, `src/world/World.ts`, and related status UI — synchronize 3.2.0 metadata.
- `scripts/nova-export.mjs` — Build CLI output identifies engine 3.2.0 and accepts current schema 23 while continuing to reject future schemas; the production benchmark caught and verified this guard change.
- `scripts/export-reference-projects.mjs` — generates schema-23, engine-3.2 bundles and the data-foundation fixture.
- `scripts/package-release.ps1` — embeds schema 23 in Web metadata and retains the exact 11-artifact release contract.
- `scripts/benchmark-v3.mjs` and `scripts/stability-v3.mjs` — current evidence paths and engine metadata become 3.2.0.
- `scripts/audit-manual.mjs`, `audit-editor-shell.mjs`, `audit-script-studio.mjs`, `audit-rendering.mjs`, `audit-animation.mjs`, `audit-v2.5.mjs`, `audit-v2.6.mjs`, `audit-v2.7.mjs`, `audit-v2.8.mjs`, `audit-v2.9.mjs`, `audit-v3.mjs`, `audit-v3.1.mjs`, and `verify-v3.1.mjs` — retain historical feature assertions while recognizing current schema/version and the release-owner maximized-window override.
- `README.md`, `README.zh-CN.md`, `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md`, and `manual/index.html` — document every v3.2 workflow in English/German/Chinese and update current release metadata/bookmarks.
- `instructions.txt` — retains the release-owner roadmap verbatim while normalizing five Markdown metadata lines so repository whitespace validation remains clean.
- `docs/BENCHMARKS.md`, `COMPATIBILITY.md`, `STABILITY.md`, and `STABLE_CONTRACTS.md` — schema-23/current-release rules and evidence boundaries.
- `reference-projects/README.md` and generated reference `.nova`/bundle files — version-pin engine 3.2/schema 23 and add validation instructions.

## Deprecations, removals, and compatibility effects

- Deprecated: path-only persistent identity, nondeterministic serialization, ad-hoc scans as authority, mutable generated artifacts, and formats without stable IDs/schema.
- Removed user-visible functionality: none.
- Generated artifacts are no longer directly editable; source/import settings remain editable and regeneration is explicit.
- Schema 22 projects acquire schema-23 manifest/asset metadata on migration. All normal IDs and unknown fields remain preserved.
- A future schema opens read-only; Nova_A does not guess at a downgrade.

## Risk controls

- Canonical output rejects/normalizes non-finite numeric values and has deterministic/no-op evidence.
- Migration and repair operate on copies, validate before replacement, keep a complete backup, and restore the previous session on error/interruption.
- Move/rename keeps UUID identity and previews every known dependent. Delete remains behind dependent preview and the application confirmation UI.
- Import work is bounded, cancellable, retryable, logged, and retains the last valid artifact.
- Nested scene/prefab cycles and missing sources are validation errors; unpack/remap generates collision-free IDs.
- Window configuration remains ordinary, decorated, and resizable; only F11 requests true fullscreen.
