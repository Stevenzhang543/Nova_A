# Nova_A 5.0 source-control and team workflow

Nova_A projects are local-first and deterministic. Commit project documents, authored assets, scripts, package manifest/lockfile, shared build presets, and team metadata. Ignore caches, local build output, recovery/checkpoint files, editor-local preferences, and credentials. Canonical serialization uses stable ordering and identities so semantic comparison is meaningful even when textual key order differs.

External file and branch changes never silently replace dirty editor state. Use Compare, Reload/Keep disk, or Keep editor. A project lock conflict offers read-only open. Binary locks are advisory local metadata unless the source-control host enforces them; publish the team’s locking policy and do not describe advisory state as enforcement.

Ownership rules can generate CODEOWNERS guidance. Task links and change notes remain local metadata unless the user explicitly activates and invokes a network operation. Nova_A has no mandatory cloud service and does not upload project, diagnostics, package, or team data automatically.

For merges, prefer identity-aware scene/resource comparison, resolve package lock conflicts through deterministic resolution, reopen Project Health, validate all references, run tests, and perform a canonical re-save. Never hand-edit UUID/GUID relationships without validation. Large imported binary sources should use the team’s chosen large-file storage and locking mechanism. Release builds must use the exact committed source and pinned lockfile; an uncommitted source archive can be a local candidate but cannot satisfy exact-tag final sign-off.
