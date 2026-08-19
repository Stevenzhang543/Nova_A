# Nova_A 3.5.0 release notes

Nova_A 3.5.0 turns scripting into a documented, versioned programming workflow without removing existing editor, rendering, animation, physics, or authoring behavior. The release freezes Nova Rhai API v1 for the 4.0 compatibility window and connects authoring, runtime diagnostics, debugging, testing, profiling, documentation, and CI around the same contract.

## Stable Nova Rhai API v1

- 108 documented symbols cover lifecycle, scenes, objects, components, transforms, input, physics, UI, audio, animation, navigation, save data, time, logging, and resources.
- Stable scene, entity, component, and resource handles carry an explicit API version and deterministic identity. Invalid or stale handles fail with structured runtime diagnostics instead of becoming unchecked host references.
- Lifecycle callbacks include create/start, fixed/update/late update, enable/disable/destroy, collision and trigger enter/stay/exit, UI events, animation events, signals, timers, and tasks.
- Export metadata supports type, default, range, step, enum, resource filter, group, tooltip, and serialization. Runtime values are synchronized and constrained by the same metadata shown in the Inspector.
- Script signals and editor-authored connections are visible and serialized. Timers, deferred calls, cancellable tasks, project-local modules, packages, and deterministic module resolution are integrated.
- Deprecated aliases and undocumented globals produce actionable diagnostics. Removed callback templates are no longer offered to new scripts; archived v1 symbols are checked for accidental breaking changes.

## Script Studio and language tooling

- The editor provides ranged, coded, phase-aware diagnostics; semantic highlighting; API-aware completion and parameter help; hover documentation; definition/reference navigation; workspace symbols; safe rename; formatting; quick fixes; outline; Problems; API browser; examples; and deprecation guidance.
- The same language service is available through the `nova-rhai-language/1` JSON-lines stdio protocol for external editors and automation.
- Component, UI, Physics, Animation Event, and Test templates use only supported lifecycle callbacks.
- Script workspace layout now separates code, outline/problems/debug/tests/API surfaces at desktop widths and stacks them at smaller widths. Three-language, five-resolution layout qualification covered all workspaces, inspector tabs, profiler tabs, settings, bottom panels, and side panels.

## Debugging, reload, tests, and profiling

- The debugger supports line/function/conditional/hit-count/log breakpoints, pause/continue, callback-boundary step into/over/out, restart, stack frames, scopes, locals, watches, expression evaluation, object inspection, and break-on-error with source frames.
- Hot reload validates and compiles before activation, preserves compatible state or recreates instances according to policy, and rolls back atomically to the last valid program after failure.
- The headless Rhai test runner supports discovery, setup/teardown, parameterized cases, timeout, skip, tags, deterministic seeds, JSON and JUnit output, captured output, and CI exit codes 0/1/2.
- Per-script and per-callback profiling records calls, last/total/maximum duration, bounded captures, and capture comparisons. Allocation values are explicitly estimates.

## Project format and compatibility

Nova_A 3.5.0 writes Project Format 2 schema 25 and accepts schemas 5 through 25. The schema adds additive scripting metadata: API version, detailed breakpoints, test definitions, dependencies/package identity, reload policy, signal connections, recovery source, and saved-source hash. Migration preserves existing scripts and project data; older Nova_A versions must use the pre-upgrade backup.

No API v1 symbol was removed. Existing undocumented aliases continue to run where compatibility requires it but now warn. See `MIGRATION.md`, `DEPRECATIONS.md`, and `docs/RHAI_API_V1.md` for exact examples and signatures.

## Verification and release files

- Rust formatting and warning-free Clippy pass across all targets.
- 123 Rust tests pass: 33 format, 67 physics, 15 script, 2 math, and 6 runtime tests.
- Production Web/WASM and native Tauri builds pass.
- 10,000 generated script inputs complete without a language-service crash; a 5,000-line error storm returns deterministic ranged diagnostics in 64.84 ms on the recorded Windows x64 host.
- API documentation coverage is 108/108 symbols with 108/108 examples and 93 verified host bindings.
- Layout qualification passes 261 multilingual/responsive editor states.

The release directory contains portable EXE, MSI, NSIS installer, Web, source, reference-project, and evidence archives; checksums; license; release notes; this release's edit ledger; migration/deprecation/known-issue documents; third-party notices; and SPDX SBOM.

## Disclosed limits

Statement-level suspension inside the embedded Rhai VM is not exposed, so stepping pauses at safe callback boundaries. Allocation telemetry is an estimate. Windows artifacts are locally qualified but unsigned; Linux/macOS clean-machine installer qualification and a 24-hour wall-clock soak remain external gates. These boundaries are published rather than reported as passes.
