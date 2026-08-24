# Schema 5 migration fixture

- Input: `pre-migration.nova`
- Expected deterministic output: `expected-migrated.nova`
- Command: `cargo run -p nova_format --example migrate_fixture --locked < pre-migration.nova`
- Acceptance: schema 29, engine 4.2.0, preserved unknown marker, valid references, and byte-identical repeat migration.
