# Nova_A 3.4.0 exhaustive edit ledger

This ledger records every v3.4.0 source, configuration, documentation, test, generated-reference, audit, and packaging edit. Generated build outputs are listed separately because their binary contents are produced by the verified build.

## Version and project-format authority

- `package.json`: set 3.4.0; add v3.4 audit, live verification, native benchmark, layout qualification, and evidence commands; append them to the full audit chain.
- `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`: synchronize workspace, native application, and lock metadata to 3.4.0.
- `src/projects/projectFormat.ts`, `crates/nova_format/src/lib.rs`: advance Project Format 2 to schema 24/engine 3.4.0; migrate named layers and interpolation while preserving all legacy collision bits and compatible unknown fields.
- `tests/fixtures/migrations/public-schema-inputs.json`, `tests/fixtures/migrations/public-schema-expected.json`: extend golden migration coverage through schema 24.
- `scripts/nova-export.mjs`, `src/runtime/gameExporter.ts`, `src/runtime/novaPak.ts`, `src/runtime/packages.ts`, `src/runtime/shipping.ts`, `src/runtime/testRunner.ts`, `scripts/package-release.ps1`, `scripts/stability-v3.mjs`: update release/schema/export/evidence metadata to 3.4.0/schema 24.

## Native physics and runtime

- `crates/nova_physics/src/body.rs`: add capsule and finite-segment native shapes; add friction/restitution combine fields; retain the v3.3 54-value body adapter; expose shape and sleep/CCD data used by diagnostics.
- `crates/nova_physics/src/lib.rs`: expose the updated 56-value ABI and previous 54-value compatibility stride.
- `crates/nova_physics/src/world/legacy.rs`: apply deterministic material-combine priority in contact solving and pass expanded body records.
- `crates/nova_physics/src/world/persistent.rs`: sort contact lifecycle events by stable handle pair/phase and emit stable Stay events.
- `crates/nova_physics/src/query/mod.rs`: add/complete ray, shape, point, overlap, contact, and character movement queries; exclude the character’s own collider; implement slopes, step, snap, safe margin, moving-platform velocity, and outward obstacle normals.
- `crates/nova_physics/src/rope/mod.rs`: expand supported constraint/joint state, motor solving, and break diagnostics.
- `crates/nova_physics/src/tests.rs`: add capsule, segment, material-combine, compatibility, deterministic events, CCD/sleep, and physics conformance coverage.
- `crates/nova_physics/examples/v3_4_evidence.rs`: add optimized 100/1,000/10,000-body measurements, deterministic replay, tunnelling, 20-body stable-stack, and 2,592,000-tick accelerated-soak evidence.
- `crates/nova_runtime/src/lib.rs`: forward trigger Enter/Stay/Exit and collision lifecycle data; expose native teleport/velocity behavior and tests.
- `crates/nova_wasm/src/lib.rs`: export teleport and velocity methods to the WebAssembly host.

## World model, serialization, and scripting APIs

- `src/world/components.ts`: add explicit production body roles, collider support model, local compound shapes, material references/combine modes, expanded joints, character data, and transform ownership.
- `src/world/Entity.ts`: initialize and clone new collider/body/joint production fields safely.
- `src/world/World.ts`: serialize/load new physics fields; build deterministic compound envelopes; carry named layers/material combine codes into native records; expose query/contact/character APIs; sort lifecycle events.
- `src/world/Connection.ts`: add joint motor/break/collision state and compatibility defaults.
- `src/world/geometry.ts`, `src/world/hierarchy.ts`: preserve new shape/ownership data through geometry and hierarchy operations.
- `src/store/physics.ts`: add interpolation and named-layer state; round-trip schema-24 physics; bind query/material/compound/joint fields; route direct dynamic transform writes through teleport; serialize all available scenes into Build Settings on first save.
- `src/runtime/buildSettings.ts`: allow serialization against the authoritative available-scene list.
- `src/runtime/physicsProduction.ts`: add named layer defaults/normalization/search/presets, material assets/combine math, units, shape-support disclosure, stable event sorting, validation, and conformance definitions.
- `src/runtime/physics2d.ts`: add contact queries, teleport, velocity state, move-and-slide, and character-state script/editor APIs.
- `src/runtime/GameplayRuntime.ts`, `src/runtime/physicsMonitor.ts`, `src/runtime/physicsDebug.ts`, `src/runtime/replay.ts`: connect stable Stay events, production diagnostics, layer colors, replay, and expanded metrics.
- `src/assets/types.ts`, `src/assets/AssetDatabase.ts`: recognize and create `.nova-material` assets and preserve their dependency/hash metadata.

## Editor UI and formatting

- `src/components/PhysicsSettingsPanel.vue`: add dedicated Simulation, Layers, Materials, and Conformance pages with units, validation, search, presets, compact pairs, advanced matrix, material editing, CCD/interpolation/sleep diagnostics, and test controls.
- `src/panels/SettingsPanel.vue`, `src/layout/EditorLayout.vue`: route Project Settings → Physics to the dedicated panel.
- `src/components/ConfigPanel.vue`: add body-role/ownership controls, supported collider selection, local compound shape editing, named layer/mask controls, material asset/combine controls, character settings, and expanded joint motor/limit/break settings.
- `src/components/RuntimeComponentsInspector.vue`: display production body/character/joint state and diagnostics.
- `src/components/WorldCanvas.vue`, `src/renderer/sceneRenderer.ts`: render collider/joint/character/debug overlays above scene content, named layer colors, compound shape authoring, and production gizmos.
- `src/components/ProfilerPanel.vue`: add sleeping-body, continuous-body, joint-constraint, contact, fixed-step, replay, and test metrics.
- `src/components/ToolBar.vue`: replace fixed-width multilingual controls with max-content horizontal labels, safe intrinsic sizing, and non-overlapping responsive behavior.
- `src/components/CommandPalette.vue`, `src/components/ContextMenu.vue`, `src/components/EditorBottomPanel.vue`, `src/components/ProjectHealthPanel.vue`, `src/components/ProjectManager.vue`, `src/components/SceneSideBar.vue`, `src/components/ScriptStudio.vue`, `src/components/StudioStatusDialog.vue`, `src/layout/SideBar.vue`, `src/layout/TopBar.vue`, `src/editor/gizmo.ts`: expose the new Physics page/actions, preserve schema/version messaging, and align supporting panels with the responsive 3.4 layout contract.
- `src/i18n.ts`: add complete English, German, and Chinese v3.4 physics, material, layer, character, joint, validation, profiler, and support-status text.
- `src/projects/templates.ts`: update Platformer and Physics Sandbox production physics defaults and reference coverage.

## Reference projects

- `scripts/export-reference-projects.mjs`: generate schema-24 references, attach valid deterministic asset pipeline hashes, and add platformer-character, top-down-character, joint-showcase, trigger-showcase, CCD, and stacking bundles while retaining physics-sandbox.
- `reference-projects/README.md`: document the seven required v3.4 physics projects and controls.
- Regenerated every existing top-level and bundled reference (`empty`, `platformer`, `top-down`, `physics-sandbox`, `ui-showcase`, `networked-optional`, `data-foundation-validation`, and `workspace-recovery-validation`) to engine 3.4.0/schema 24 with updated expected outputs and READMEs.
- Added `reference-projects/projects/platformer-character`, `top-down-character`, `joint-showcase`, `trigger-showcase`, `ccd-test`, and `stacking-test`, each with `project.nova`, `README.md`, `expected-output.json`, and `test-controls.json`.
- Regenerated retained v3.3 authoring references (`authoring-pixel-art`, `authoring-resolution-independent`, `authoring-parallax`, `authoring-multiple-cameras`, `authoring-nested-prefabs`, `authoring-5000-stress`) under the current 3.4/schema-24 authority.

## Audits, evidence, and layout qualification

- `scripts/audit-v3.4.mjs`: add static end-to-end checks for all v3.4 object, shape, material, query/event, character, joint, layer, quality, template, localization, and toolbar requirements.
- `scripts/verify-v3.4.mjs`: add executable layer/material/event/round-trip/deterministic-save/reference validation.
- `scripts/benchmark-v3.4.mjs`: generate machine-labelled performance, determinism, tunnelling, stable-stack, character, soak, and SVG graph evidence.
- `scripts/qualify-layout-v3.3.mjs`, `scripts/qualify-layout-v3.4.mjs`: parameterize the multilingual multi-resolution browser audit and add Physics Settings coverage.
- `scripts/generate-v3.3-release-evidence.mjs`, `scripts/generate-v3.4-release-evidence.mjs`: parameterize release-evidence production and add v3.4 SBOM, platform, known-issue, build-environment, accessibility/localization, and third-party records.
- `scripts/audit-manual.mjs`, `scripts/audit-editor-shell.mjs`, `scripts/audit-animation.mjs`, `scripts/audit-script-studio.mjs`, `scripts/audit-rendering.mjs`, `scripts/audit-v2.5.mjs` through `scripts/audit-v3.2.mjs`, and `scripts/audit-v3.mjs`: retain historical feature checks while recognizing 3.4.0/schema 24 as current authority.
- `release-audits/v3.4.0-*.json` and `v3.4.0-physics-performance.svg`: generated verification, benchmark, determinism, tunnelling, character, stack/soak, reference, layout, stability, build, platform, localization, SBOM, and known-issue evidence.

## Documentation

- `README.md`, `README.zh-CN.md`: document 3.4.0 features, build/run commands, schema 24, compatibility, and complete release artifacts.
- `docs/PHYSICS_2D.md`: add production physics object, units, ownership, shape, material, query/event, character, joint, layer, diagnostics, and API reference.
- `docs/PROJECT_FORMAT_2_SCHEMA_24.md`: add migration/compatibility contract and exact collision-bit preservation rules.
- `docs/COMPATIBILITY.md`, `docs/STABILITY.md`, `docs/STABLE_CONTRACTS.md`, `docs/BENCHMARKS.md`, `docs/PROJECT_FORMAT_2_SCHEMA_23.md`: update current authority and cross-version guarantees.
- `docs/KNOWN_LIMITATIONS.md`: record query-only chain/concave shapes, compound-envelope behavior, accelerated-soak scope, signing, and platform boundaries.
- `manual/MANUAL.en.md`, `manual/MANUAL.de.md`, `manual/MANUAL.zh-CN.md`: add complete localized 3.4 production-physics instructions.
- `manual/index.html`: update engine/schema metadata and add bookmarkable English/German/Chinese v3.4 physics sections.

## Generated release files

- `nova_core/pkg/*` and `dist/*`: regenerated release WebAssembly and optimized editor/player/manual bundles.
- `src-tauri/target/release/nova_a.exe`, MSI, and NSIS setup executable: rebuilt from the verified 3.4.0 sources.
- `releases/v3.4.0/*`: package portable EXE, MSI, setup EXE, Web/source/reference/evidence ZIPs, release notes, this ledger, license, and SHA-256 checksums.

No existing user-facing feature or animation was intentionally removed. Numeric collision bits and legacy project identities remain compatible; unsupported dynamic shape behavior is disclosed instead of being silently simulated incorrectly.
