# Nova_A 26.10 frozen creator-platform contracts

Nova_A 26.10 (machine version 26.10.0) retains the same authoritative contract set: Project Format 2/schema 29, Rhai API 2, Visual Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1 and Workspace Document 3. Platform input, large-world performance, semantic collaboration, readiness and documentation work is additive and introduces no contract-version change. See `STABLE_CREATOR_PLATFORM_26_10.md` for the current decision, readiness model, support matrix and completion rules.

The reviewed historical-project compatibility ceiling is `<27.0.0`. Widening that ceiling is a metadata-only migration performed through preview, complete backup, deterministic in-memory conversion, semantic diff, validation, canonical reparse and rollback. No authored field is removed because the product version changed.

The next contract decision remains deferred until a demonstrated need, the observation window, migration/ecosystem review and independent external evidence exist.

## Historical 7.0 freeze record

Nova_A 7.0 certified the seven additive contracts without changing Project Format 2/schema 29. At that release, reviewed 6.x projects advanced from the `<7.0.0` ceiling to `<8.0.0`; `STABLE_CREATOR_PLATFORM_7_0.md` records that historical decision. It is not the current 26.10 authority.

## Historical 5.0 freeze record

Nova_A 5.0.0 freezes these contracts for the 5.x line. Product SemVer and persisted-format versions are independent; schema 29 remains unchanged. The freeze opened on 25 August 2026 and cannot receive final production certification before 8 September 2026 or before all named external gates have evidence.

| Contract | Frozen version | Compatibility rule |
| --- | ---: | --- |
| Project format | Format 2 / schema 29 | Schemas 5–29 validate or migrate to 29. A future major/schema opens only in the read-only viewer without changing the session. Unknown compatible fields round-trip. |
| Runtime API | Rhai v2 | Rhai lifecycle, typed handles, input, physics, animation, audio, scene, task, signal, save, and testing calls are frozen for 5.x. API v1 is read-only migration compatibility. |
| Plugin API | 2 | Sandboxed WASM API 2 is frozen for 5.x; API 1 remains readable with its original restricted capabilities. |
| Package manifest | 1 | Manifest and lockfile fields are stable. SemVer ranges, content hashes, permissions, sources, and optional project enablement remain readable. |
| Build CLI | 1 | Existing commands, flags, JSONL shape, exit behavior, and deterministic output are frozen for 5.x; new flags must be additive. |

Breaking changes require a new contract version, a migration/compatibility adapter, tests, documentation, and a release-note entry. Security or correctness exceptions must be narrowly scoped and documented; data is never silently discarded.

The live values are centralized in `src/runtime/stableContracts.ts`, `src/projects/projectFormat.ts`, and `crates/nova_format/src/lib.rs`. **Help → Studio Status** displays the active values and copies a diagnostic snapshot.

During the RC freeze, accepted changes are limited to release blockers, security or migration corrections, documentation/evidence fixes, and approved compatibility polish. No new stable feature is admitted.

## Build CLI 1

`pnpm nova <validate|import|test|build|export|package|version>` is the non-interactive Build CLI 1 surface. Export accepts Windows, Linux, macOS and Web target profiles, validates through schema 29, writes deterministic archives and machine-readable reports, and exits non-zero for invalid input. Stable platform claims remain limited by the published tier matrix.

## Plugin API 2 safety

Plugins are explicit project dependencies, permission reviewed, hash verified when a hash is supplied, limited to 16 MiB of WASM memory input, and fault isolated per plugin. Native extensions are never downloaded or executed by the package browser. Safe Mode skips third-party plugin startup.
