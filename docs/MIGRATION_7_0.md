# Nova_A 7.0 migration and recovery

Nova_A 7.0 keeps Project Format 2/schema 29. The ordinary 6.x→7.x change is a deterministic engine-compatibility metadata seal from `<7.0.0` to `<8.0.0`; it is not a schema migration and must not remove authored content.

## User workflow

1. In Project Manager choose the project file. Do not overwrite the original externally.
2. Read the complete preflight: identity, source/target engine and schema, counts, package compatibility, warnings, and steps.
3. Leave complete pre-upgrade backup enabled and download the source copy.
4. Inspect the dry-run log and semantic diff. A 6.x/schema-29 project should show compatibility metadata and engine authority changes only.
5. Apply only after deterministic rerun, complete validation, canonical serialization, and reparse pass.
6. Save to a new version-control change list, reopen, Play, and build a development player.
7. If anything differs unexpectedly, use Project Manager or Project Health to download/restore the retained rollback copy.

## Failure rules

- Malformed JSON, unsupported format, future schema, empty/reversed engine range, invalid package, nondeterministic output, validation failure, or serialization failure blocks commit.
- Future schemas stay non-mutating/read-only. Nova_A never guesses a downgrade.
- Missing optional packages preserve serialized data and disable only the unavailable behavior.
- If the bounded local rollback cannot be stored, the downloadable complete backup is still required before apply.
- Unknown compatible fields round-trip; a migration may not silently discard them.

## Developer qualification

Golden fixtures cover the oldest supported schema, intermediate schemas, schema 29 from historical 3.x/4.x/5.x/6.x boundaries, current 7.0, malformed ranges, future schemas, deterministic double runs, canonical round trips, semantic diff, and rollback checksum. TypeScript and Rust format implementations must agree.
