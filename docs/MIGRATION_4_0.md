# Nova_A 4.0 migration and rollback guide

Nova_A 4.0.0 keeps **Project Format 2 schema 29**. The schema was frozen in 3.9; 4.0 seals engine and package compatibility without changing authored scenes, resources, stable UUIDs, APIs, or save ordering.

## Upgrade workflow

1. Open a `.nova` document from Project Manager.
2. Review source/target engine and schema, scenes, entities, assets, packages, warnings, and every preflight row.
3. For a 3.x source, Nova_A downloads the complete original before any migration and keeps a bounded machine-local rollback copy.
4. Migration occurs in memory through the registered Rust chain. The 3.9 `<4.0.0` engine boundary becomes `<5.0.0`; schema remains 29.
5. Nova_A validates format identity, manifest, paths, UUIDs, component dependencies, asset hashes/references, scenes, packages, and finite numeric data, then canonicalizes and reparses the result.
6. Only a valid result replaces the editor session. On failure, the current project remains available and the original file is unchanged.

Schemas 5–29 are accepted. A newer schema is shown read-only and can be downloaded unchanged. Reverse migration is never attempted; use **Download rollback copy** and open it with the archived engine named by the project. Large projects that exceed local-storage limits still receive the mandatory downloaded backup.

For automation, run `pnpm nova validate --project project.nova --jsonl` before and after upgrading. Never overwrite the only project copy, cache generated files as authoritative content, or hand-edit UUIDs and package locks.
