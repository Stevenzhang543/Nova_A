# Nova_A 3.x stable contracts

Nova_A 3.0.0 freezes the contracts below. Product SemVer and persisted-format versions are independent: a 3.x engine update does not rewrite project data unless the project schema itself changes.

| Contract | Frozen version | Compatibility rule |
| --- | ---: | --- |
| Project format | Format 2 / schema 22 | Schemas 5–22 migrate to 22. A future major/schema is rejected without changing the open session. Unknown compatible fields round-trip. |
| Runtime API | 1 | Rhai lifecycle, typed handles, input, physics, animation, audio, scene, task, signal, save, and testing calls remain source compatible throughout 3.x. |
| Plugin API | 2 | Sandboxed WASM API 2 remains supported throughout 3.x; API 1 remains readable with its original restricted capabilities. |
| Package manifest | 1 | Manifest and lockfile fields are stable. SemVer ranges, content hashes, permissions, sources, and optional project enablement remain readable. |
| Build CLI | 1 | Existing flags and deterministic output remain compatible throughout 3.x. New 3.x flags must be additive. |

Breaking changes require a new contract version, a migration/compatibility adapter, tests, documentation, and a release-note entry. Security or correctness exceptions must be narrowly scoped and documented; data is never silently discarded.

The live values are centralized in `src/runtime/stableContracts.ts`, `src/projects/projectFormat.ts`, and `crates/nova_format/src/lib.rs`. **Help → Studio Status** displays the active values and copies a diagnostic snapshot.

## Build CLI 1

`pnpm export -- --project <file.nova> --target <windows|linux|macos|web> --output <directory>` accepts the documented profile, architecture, runtime, compression, incremental, patch, dist, and native-player options. It validates format 22, writes deterministic archives when configured, and exits non-zero for invalid input. Headless server mode is native-only.

## Plugin API 2 safety

Plugins are explicit project dependencies, permission reviewed, hash verified when a hash is supplied, limited to 16 MiB of WASM memory input, and fault isolated per plugin. Native extensions are never downloaded or executed by the package browser. Safe Mode skips third-party plugin startup.
