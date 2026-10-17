# Nova_A supported API index

For Nova_A 4.9.0 and the 5.0 release-candidate freeze, the stable public contracts are Project Format 2 schema 29, Runtime/Rhai API 2, Plugin API 2, Package Manifest 1, and Build CLI 1. Rhai API v1 remains documented only as read-only migration input for older projects.

- [Rhai API v2](RHAI_API_V2.md): current lifecycle, typed handles, scene/object/component/transform, input, physics, UI, audio, animation, navigation, save, time, log, resource, signal, task, testing, async and debugger symbols.
- [Rhai API v1](RHAI_API_V1.md): historical migration reference; new 4.9 projects must use API v2.
- [Physics 2D](PHYSICS_2D.md): units, ownership, bodies, shapes, materials, events, queries, characters, joints, ropes, layers, and determinism.
- [Stable contracts](STABLE_CONTRACTS.md): versions and compatibility rules.
- [Build CLI](BUILD_CI_GUIDE_4_0.md): seven commands, JSONL, exit behavior, and release gates.
- [Package authoring](PACKAGE_AUTHORING_3_9.md): Manifest 1, permissions, trust, entry types, dependencies, quarantine, rollback, and publishing.
- [Project migration](MIGRATION_4_9.md): accepted schemas, preflight, compatibility seal, backup, validation, and rollback.

Editor-internal TypeScript modules and Experimental package contracts are not public stability promises unless listed here.
