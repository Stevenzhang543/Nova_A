# Expected migration behavior

- The v6.9 fixture previews a metadata-only `<7.0.0` → `<8.0.0` compatibility seal.
- The preview produces a backup and deterministic semantic diff before apply.
- Repeating the migration is a no-op and produces the same canonical project.
- Rollback restores the byte-for-byte source fixture.
- The future-schema fixture is blocked without modifying the open project.
