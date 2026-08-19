# Nova_A 4.0 production-stable contracts

Nova_A 4.0.0 locks the contracts frozen in 3.9 for production-compatible 4.0.x patches. Product SemVer and persisted-format versions are independent; schema 29 remains unchanged.

| Contract | Frozen version | Compatibility rule |
| --- | ---: | --- |
| Project format | Format 2 / schema 29 | Schemas 5–29 validate or migrate to 29. A future major/schema opens only in the read-only viewer without changing the session. Unknown compatible fields round-trip. |
| Runtime API | 1 | Rhai lifecycle, typed handles, input, physics, animation, audio, scene, task, signal, save, and testing calls remain source compatible throughout 4.0.x. |
| Plugin API | 2 | Sandboxed WASM API 2 remains supported throughout 4.0.x; API 1 remains readable with its original restricted capabilities. |
| Package manifest | 1 | Manifest and lockfile fields are stable. SemVer ranges, content hashes, permissions, sources, and optional project enablement remain readable. |
| Build CLI | 1 | Existing commands, flags, JSONL shape, exit behavior, and deterministic output remain compatible throughout 4.0.x; new flags must be additive. |

Breaking changes require a new contract version, a migration/compatibility adapter, tests, documentation, and a release-note entry. Security or correctness exceptions must be narrowly scoped and documented; data is never silently discarded.

The live values are centralized in `src/runtime/stableContracts.ts`, `src/projects/projectFormat.ts`, and `crates/nova_format/src/lib.rs`. **Help → Studio Status** displays the active values and copies a diagnostic snapshot.

Stable patches permit backward-compatible defect fixes, security corrections, migration-correctness repairs, documentation, and newly qualified platform evidence. Public schema/API expansion waits for a later contract cycle.

## Build CLI 1

`pnpm nova <validate|import|test|build|export|package|version>` is the non-interactive Build CLI 1 surface. Export accepts Windows, Linux, macOS and Web target profiles, validates through schema 29, writes deterministic archives and machine-readable reports, and exits non-zero for invalid input. Stable platform claims remain limited by the published tier matrix.

## Plugin API 2 safety

Plugins are explicit project dependencies, permission reviewed, hash verified when a hash is supplied, limited to 16 MiB of WASM memory input, and fault isolated per plugin. Native extensions are never downloaded or executed by the package browser. Safe Mode skips third-party plugin startup.
