# Nova_A 5.0 migration and rollback policy

Nova_A 5.0 keeps Project Format 2 schema 29. Supported schema fixtures 5–29 migrate in memory through the Rust registry, validate the complete document, canonicalize it, rerun deterministically, and only then replace the session. A backup and migration report are mandatory. Clean 4.0 and 4.9 projects receive the frozen `>=5.0.0 <6.0.0` compatibility boundary without a schema bump.

Rhai API v1 is removed from new authoring. Existing v1 script metadata remains readable so the editor can display diagnostics and migrate to API v2. The Script Studio exposes v1 only as a disabled compatibility state on an already-v1 asset; choosing v2 is one-way for normal authoring. Deprecated calls have documented replacements and diagnostics.

Workspace layout document 3 is the 5.x format. On first load the editor reads the 4.x v2 key, normalizes obsolete pages and duplicate bottom tabs into the current Manage/context model, clamps dimensions, preserves custom layouts, and writes v3. Workspace import accepts v2 and v3; reset removes both current and migrated layout records.

Downgrade is not promised. A 5.0 project may contain contract metadata older builds cannot safely interpret. Use the pre-upgrade backup or source-control revision instead of opening and resaving in an older editor. If validation, deterministic rerun, reference resolution, or package compatibility fails, migration is blocked and the original remains intact. Read-only inspection/download is preferred for a document newer than the editor.
