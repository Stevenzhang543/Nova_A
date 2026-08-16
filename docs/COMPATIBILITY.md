# Compatibility and migration policy

Nova_A 3.2.0 writes Project Format 2, schema 23, engine version 3.2.0. It accepts every publicly supported schema from 5 through 23.

Import is transactional:

1. Parse and bound the selected file.
2. Route a newer major/schema to the non-mutating read-only compatibility viewer before editor state changes.
3. Produce a migration preview and package compatibility report.
4. Offer the untouched source as a rollback download and retain a local rollback copy when storage allows.
5. Migrate in memory, validate the complete document, serialize/reparse it, and only then replace the session.

The golden matrix in `tests/fixtures/migrations/` covers schemas 5–23 and checks the schema target, active scene, scene/entity counts, compatibility metadata, engine version, unknown-field preservation, and post-serialization validation. Deterministic corrupted-input mutations verify that import does not panic. The legacy `v1_1_2_project.json` fixture remains as an additional real historical sample.

Packages and plugins are audited before activation. A project can be opened with an incompatible optional package disabled; its manifest and serialized data stay present so repairing the dependency does not lose data.

Downgrading a schema-23 project into an older Nova_A version is not supported. Use the automatic pre-upgrade backup to return to the original file.
