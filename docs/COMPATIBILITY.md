# Compatibility and migration policy

Nova_A 5.0.0 writes Project Format 2, schema 29, engine version 5.0.0. It accepts every publicly supported schema from 5 through 29. Schema 29 remains frozen; 5.0 seals the former `<4.0.0` and `<5.0.0` boundaries to the 5.x `<6.0.0` contract without adding schema fields. Migration preserves collision bits, masks, scripts, presentation, authored strokes, tile data, packages and compatible unknown fields; older readers must use the pre-migration backup.

Import is transactional:

1. Parse and bound the selected file.
2. Route a newer major/schema to the non-mutating read-only compatibility viewer before editor state changes.
3. Produce a format/engine/content/package preflight for every external project.
4. For any migration, download the untouched source as a mandatory rollback artifact and retain a local rollback copy when storage allows.
5. Migrate in memory, validate the complete document, serialize/reparse it, and only then replace the session.

The golden matrix in `tests/fixtures/migrations/` covers schemas 5–29 and checks the schema target, active scene, scene/entity counts, compatibility metadata, engine version, unknown-field preservation, physics-layer bit preservation, script metadata, visual/audio/world-data defaults, and post-serialization validation. Deterministic corrupted-input mutations verify that import does not panic. The legacy `v1_1_2_project.json` fixture remains as an additional real historical sample.

Historical additive boundaries remain covered: schema 28 introduced the v3.8 world-data, Tilemap 2.0, navigation, streaming, save-recovery, and optional-pool contract; schema 29 added the v3.9 build/package/collaboration metadata. Both migrate to the same frozen schema 29 representation under engine 4.0.

Packages and plugins are audited before activation. A project can be opened with an incompatible optional package disabled; its manifest and serialized data stay present so repairing the dependency does not lose data.

Downgrading a 4.0 project into an older Nova_A version is not supported even though schema remains 29. Use the automatic pre-upgrade backup to return to the original file. See `MIGRATION_4_0.md`, `ARCHIVED_ENGINE_GUIDANCE_4_0.md`, and `STABLE_CONTRACTS.md`.
