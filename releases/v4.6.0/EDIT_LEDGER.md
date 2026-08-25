# Nova_A 4.6.0 exhaustive edit ledger

This ledger records every v4.6 edit group. No existing user feature, animation, renderer path, physics behavior, project schema, or release format was removed.

## Version and compatibility authorities

- Set package, Rust workspace/crates, Tauri, project format, build/package metadata, runtime reports and visible editor labels to 4.6.0.
- Raised the current Rhai API to v2 while retaining minimum API v1 and per-asset adapter selection.
- Advanced script metadata to version 2; old/missing script metadata loads as API v1, while newly created scripts use API v2.

## API and sandbox

- Added typed API v2 manifest/result/lifetime/thread/determinism/permission/deprecation metadata, v1 migration mapping and current/minimum query bindings.
- Updated Rust script context to carry the selected API version and expanded compatibility/registration tests.
- Replaced the API-doc generator with v2 manifest, Markdown reference, migration map, metadata stubs, contract fixture and coverage report output.

## Language services and indexing

- Expanded analysis with API/revision/latency data, compatibility and unused-symbol lint, configurable formatting and module assistance.
- Added protocol completion, signature help, hover, code actions, rename, definition, references, formatting, workspace symbols and module requests.
- Added incremental document reuse, worker cancellation, stale-result protection, snapshots/restores and a checksum-validated temporary/committed browser index with API-change rebuild state.
- Updated the external JSON-line server to protocol v2, optional index restore/save, cancellation and graceful persistence.

## Debugger and hot reload

- Added exception policy, selected stack frames, task/thread state, object inspection and remote peer/audit state.
- Added authenticated loopback-only debug protocol initialization, stack/scopes/evaluation/stepping and bounded audit records.
- Added grouped persistent function/conditional/hit/log breakpoints and source navigation in Script Studio.
- Added a transactional hot-reload planner/classifier, exported-state transfer policy, history, commit/reject/restart state and rollback source retention.
- Changed runtime reload application to validate first, classify exports, reject restart/incompatible changes, commit at the safe boundary and expose rollback.

## Testing and coverage

- Expanded project tests to unit, integration, scene, UI, physics, animation and regression with tags, fixtures, setup/teardown metadata, timeouts, cancellation, seeds and infrastructure-only retries.
- Added tag/changed filtering, deterministic sharding and cancellation to the editor runner.
- Added genuine current-file/project/tag/prior-failure/headless split actions.
- Upgraded the Rust headless runner and `nova script-test` CLI route with JSON/JUnit, coverage, changed selection, shards and stable 0/1/2 exits.
- Added function, executable-line and stable API-binding coverage state, JSON report and LCOV generation.

## Script Studio, settings and health

- Reorganized Script Studio into Explorer, Editor and configurable right/bottom detail roles while retaining all previous editing/debug/test/signal/API tools.
- Added API selector/version/latency/index status, code actions, formatter, reload history/rollback, selected frames, exception/tasks/remote state, breakpoint groups, test tags and coverage summary.
- Added project settings for API, debugger, exceptions, hot reload, format, lint, index, tests/coverage and authenticated local remote debug.
- Added Project Health API version, script/deprecation/v1/error/restart/index metrics.
- Preserved exported script-field Inspector validation and runtime application.

## Documentation, references and evidence

- Added API v2, debug protocol, hot reload, testing/coverage, external-tool and known-issue documents.
- Updated English/Chinese READMEs and the interactive English/German/Chinese manual with bookmarkable v4.6 sections.
- Added six version-pinned scripting reference projects, expected output and control maps.
- Added v4.6 static audit, 5,000-script performance test, parser/formatter/protocol fuzz, debugger security, hot-reload fixtures, coverage and v1 migration verification.
- Added v4.6 release notes, this ledger, structured evidence, layout/native qualification hooks and exact-artifact packaging inputs.

## Consequence audit

- Project schema remains 29; no migration is required.
- API v1 source continues to run and is never silently rewritten.
- Failed reload candidates leave the running program intact.
- Remote debug adds no non-loopback or unauthenticated listener path.
- Persisted indexes contain bounded symbol/dependency metadata rather than executable editor state.
- Shared-world tests remain serial to avoid nondeterministic state races; parallel CI uses independent shards.
- All existing renderer, physics, authoring, asset, animation, UI, build and release workflows remain present.
