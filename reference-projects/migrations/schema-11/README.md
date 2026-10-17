# Schema 11 migration fixture

- Input: `pre-migration.nova`
- Expected deterministic output: `expected-migrated.nova`
- Command: `cargo run -p nova_format --example migrate_fixture --locked < pre-migration.nova`
- Acceptance: schema 29, engine 5.0.0, frozen 5.x compatibility boundary, preserved unknown marker, valid references, and byte-identical repeat migration.
