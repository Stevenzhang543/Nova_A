# Nova_A 3.9.0 exhaustive edit ledger

## Build, platforms and native shell

- package.json and pnpm-lock.yaml: synchronized 3.9 scripts/version and CLI/audit/release commands.
- Cargo.toml, Cargo.lock, src-tauri/Cargo.toml, src-tauri/Cargo.lock and src-tauri/tauri.conf.json: synchronized 3.9 native authorities and dependency locks.
- src/runtime/buildSettings.ts: presets, local-only output/signing/history, platform manifests, cache modes, include/exclude/strip/compress, reports and symbols.
- src/runtime/platformSupport.ts: declared Tier 1, Experimental and Unsupported matrix; hidden deferred targets.
- src/runtime/gameExporter.ts and scripts/nova-export.mjs: filtered assets, dependency/size reports, cache validation and schema-29 deterministic export.
- src-tauri/src/lib.rs: cache/report/native symbol support, local Git initialization, schema/version metadata and Stable rejection of deferred Android export.
- src/components/BuildSettingsPanel.vue: preset/platform/delivery/diagnostics/history UI, tier badges, task integration and readable 11 px floor.
- scripts/nova-cli.mjs: validate/import/test/build/export/package/version headless surface with JSONL.

## Package security and collaboration

- src/runtime/packages.ts: required manifest fields, exact registry trust, archive/dependency hashes, atomic dependency checks, permission review, deterministic lock, quarantine, rollback, cache verification and Safe Mode behavior.
- src/components/PackageManagerPanel.vue: type/security/hash/permission inspection, reviewed updates, quarantine/cache and rollback controls.
- src/runtime/teamWorkflow.ts: structured project/settings/package/scene/prefab/resource diffs, no-op canonicalization, operation summaries, ignore/hook/CI templates and external-source handling.
- src/components/TeamWorkflowPanel.vue: inline structured compare, external reload, Git initialization, templates, locks and readable diff typography.

## Support, contracts and editor surfaces

- src/runtime/support.ts and src/components/StudioStatusDialog.vue: known issues, migrations and privacy-reviewed local diagnostic bundle.
- src/runtime/networking.ts: explicit RPC, replication, prediction, headless and diagnostics interfaces behind an Experimental non-blocking gate.
- src/runtime/stableContracts.ts: schema 29 plus Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 freeze.
- src/components/ConfigPanel.vue and src/components/ErrorRecovery.vue: Inspector and recovery context-help anchors.
- src/i18n.ts: English, German and Chinese labels for every 3.9 build/package/team/support control.

## Format, documents, examples and qualification

- src/projects/projectFormat.ts, crates/nova_format/src/lib.rs and migration fixtures: engine 3.9/schema 29 authority and schemas 5-29 golden coverage.
- README.md, README.zh-CN.md, docs/STABLE_CONTRACTS.md, docs/COMPATIBILITY.md, docs/KNOWN_LIMITATIONS.md, docs/BUILD_AUTOMATION_3_9.md, docs/PLATFORM_SUPPORT_3_9.md, docs/PACKAGE_AUTHORING_3_9.md, docs/COLLABORATION_3_9.md, docs/NETWORKING_EXPERIMENTAL_3_9.md and docs/TUTORIALS_3_9.md: release, migration, role guides and honest platform/support boundaries.
- manual/index.html and all three Markdown manuals: searchable/bookmarkable 3.9 build, package, collaboration and freeze documentation in English, German and Chinese.
- templates/package-authoring: secure package manifest, tests and publishing guide.
- .githooks/pre-commit and .github/workflows/nova-validation.yml: repository validation templates.
- scripts/export-reference-projects.mjs and reference-projects: regenerated all retained references to schema 29 and added build-automation, package-authoring, source-control-workflow, web-deployment and headless-networking source projects.
- scripts/audit-v3.9.mjs, verify-v3.9.mjs, qualify-layout-v3.9.mjs, verify-v3.9-windows.mjs and generate-v3.9-release-evidence.mjs: release qualification and evidence.
- Existing audit scripts were changed only where their current version/schema/manual authority had to advance to 3.9/schema 29; their historical feature checks remain.
- scripts/package-release.ps1: schema-29 metadata and the mandatory eleven-artifact release layout.

No user-facing feature, animation or rendering-quality path was removed. Stable selection now intentionally excludes unverifiable packages and unsupported/deferred platforms; legacy project data remains readable.
