# Nova_A 26.10 migration and compatibility

Nova_A 26.10 keeps Project Format 2/schema 29 and all seven frozen public contracts. Moving from an earlier product label to 26.10 is not by itself a schema migration and must not delete, rename or rewrite authored content unnecessarily.

## Before opening a project

1. Keep the original project/archive outside the destination directory and verify its hash.
2. Open it through Project Manager so parsing and preflight happen before content can execute.
3. Review detected project format/schema, engine range, scenes/entities/assets, packages, permissions, unknown fields, warnings and the exact planned steps.
4. Download the complete pre-upgrade source copy and leave the bounded local rollback enabled when storage permits.
5. Cancel if the preview contains an unexplained removal, coercion, missing package, future contract or nondeterministic result.

## Apply contract

The migration engine must:

1. parse without running scripts, plugins, automation or imported content;
2. reject malformed data and keep future formats/schemas non-mutating/read-only;
3. run the complete conversion twice in memory and require byte-identical canonical output;
4. preserve unknown compatible fields and stable object/asset/graph identities;
5. show a semantic diff with additions, edits, preserved unknowns and removals;
6. validate every authoritative section, dependency, permission and reference;
7. serialize, reparse and validate the candidate before commit;
8. replace the editor session atomically only after all blocking checks pass;
9. retain rollback identity and checksum.

An engine-range compatibility seal may update reviewed metadata without changing schema 29. That metadata-only change must still appear in the diff. An absent optional package preserves its serialized data and disables only unavailable behavior; it may not silently discard components or scripts.

## Visual Graph, Rhai and Event Sheet

Visual Graph Format 1 and Rhai API 2 remain the authoring contracts. Linked files preserve graph, node, variable and behavior identities. Supported source reconstructs structural blocks; unsupported source remains in a visible bounded Code block. Migration may not delete arbitrary Rhai to make a graph look complete. Event Sheet references must continue to point to the same script/graph behavior after save and reload.

Before accepting a migrated gameplay project, run graph→Rhai→graph and Rhai→graph→Rhai checks, compile generated Rhai, compare semantic behavior IDs, execute the same deterministic input trace and inspect the semantic diff.

## Packages and workspaces

Plugin API 1 declarations may normalize to Plugin API 2 only through an explicit permission review. Package trust is never inherited from legacy metadata. Hash, compatibility, revocation and vulnerability policy must pass before replacing the lockfile.

Workspace document 2 may import additively into document 3. Unknown panels can be ignored for layout recovery but must never mutate project data. Resetting an invalid layout is a workspace operation, not a project migration.

## Recovery

If validation, serialization, save/reload, Preview/Play or the development build differs unexpectedly:

1. stop runtime execution and preserve diagnostics;
2. use the migration rollback or restore the complete downloaded source copy;
3. reopen the restored project and confirm its hash;
4. isolate the first semantic difference and package/contract responsible;
5. attach the source, dry-run, diff and failure report to a minimal regression fixture before retrying.

Do not repeatedly apply a failed migration over the same destination. Never downgrade a future schema by editing its version number.

## Qualification fixtures

The release audit covers the oldest supported schema, intermediate histories, schema 29 across historical product boundaries, current 26.10 documents, malformed inputs, reversed/empty engine ranges, unknown compatible fields, future formats/schemas, package failures, deterministic double runs, canonical round trips, semantic diffs and rollback checksums. TypeScript and Rust format authorities must agree.
