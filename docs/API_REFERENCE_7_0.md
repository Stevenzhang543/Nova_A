# Nova_A 7.0 API and SDK index

This index distinguishes stable runtime contracts from editor-only helpers and external platform adapters.

## Gameplay behavior

- `RHAI_API_V2.md` and `RHAI_API_V2_MANIFEST.json`: authoritative gameplay API 2 calls, types, determinism, thread, permission, and graph-node metadata.
- `NOVA_RHAI_API_V2_STUBS.rhai`: offline completion/reference stubs.
- `RHAI_V1_TO_V2.json`: compatibility mapping; API 1 is not a new-authoring target.
- `NOVA_GRAPH_FORMAT_5_2.md`, `VISUAL_SCRIPTING_5_2.md`, and `VISUAL_SCRIPTING_5_3.md`: Visual Graph 1, typed pins, blocks, generated Rhai, debugging, refactoring, and semantic identity.
- `DYNAMIC_OBJECT_API_5_4.md`, `GAMEPLAY_FRAMEWORK_5_4.md`, and `INPUT_GAME_FLOW_5_4.md`: entities, pending handles, components, input, game flow, save/checkpoints, AI, and pooling.

Rhai and Visual Graph are synchronized authoring views of one bounded command runtime. A graph-only or code-only behavior cannot receive a stronger host permission.

## Editor and extension SDK

- `AUTOMATION_VISUAL_SCRIPTING_6_3.md`: bounded Rhai editor automation, read-only queries, dry-run diff, permission preview, apply/cancel, and single-step rollback.
- `PACKAGE_PLUGIN_SDK_5_0.md`: Plugin API 2 contribution descriptors, lifecycle, permission review, WASM sandbox, and package-defined nodes.
- `ECOSYSTEM_COLLABORATION_SHIPPING_6_9.md`: Package Manifest 1 publisher CLI, reproducible archives, trust/revocation/advisories, offline mirrors, and updater boundary.
- `PACKAGE_AUTHORING_3_9.md`: historical package structure retained for compatibility.

Private keys, arbitrary native execution, process spawning, network access, filesystem access, device deployment, and signing are never implied by importing a manifest or opening a panel.

## Content, physics, rendering, audio, world, and networking

- `CONTENT_ANIMATION_6_4.md`: importer/reimport and reusable Resource contracts.
- `PHYSICS_RENDERER_6_5.md` and `PHYSICS_2D.md`: exact compound children, chains/concave policy, CCD, joints, Rope2D, units, and diagnostics.
- `MATERIALS_EFFECTS_5_5.md`, `PARTICLES_POST_5_5.md`, and `RENDERER_CAPABILITY_PATHS.md`: material/particle/render graphs and fallback rules.
- `ANIMATION_AUDIO_CINEMATICS_5_6.md` and `AUDIO_PRODUCTION.md`: animation, timeline, mixer, effects, and recovery.
- `WORLDS_NAVIGATION_AI_5_7.md`: TileMap, navigation, AI, streaming, and pooling.
- `MULTIPLAYER_PRODUCTION_6_6.md`: optional networking protocol, authority, rollback, multi-instance and security hooks.
- `DEVICE_MOBILE_ACCESSIBILITY_6_7.md`: device input, virtual controls, gamepad, accessibility semantics and mobile gates.

## Project/build contracts

- `SERIALIZATION_SPECIFICATION_4_2.md`: canonical project data rules.
- `STABLE_CREATOR_PLATFORM_7_0.md`: current seven-contract decision and feature-readiness model.
- `MIGRATION_7_0.md`: preview, backup, deterministic compatibility seal, diff, validation, and rollback.
- `BUILD_EXPORT_5_0.md` and `RELEASE_ENGINEERING_5_0.md`: Build CLI 1, outputs, host gates, provenance, and exact release package.

The generated in-app API browser remains the precise callable-level reference. Documentation describes usage; actual validation metadata in the generated manifest is authoritative.
