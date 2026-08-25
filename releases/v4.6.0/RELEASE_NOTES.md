# Nova_A 4.6.0 release notes

Nova_A 4.6 completes the engine's programming workflow without changing Project Format 2 schema 29. New scripts default to Rhai API v2; imported API v1 scripts keep their selected adapter and source unchanged.

## Added

- Generated API v2 manifest/reference/stubs with 110 stable entries and explicit module, signature, result, lifetime, thread, determinism, permission, example and deprecation metadata.
- Semantic Script Studio completion, signature help, hover, diagnostics, symbols, definition, references, rename, code actions, formatting, module assistance, cancellation/stale protection and crash-safe persisted workspace index.
- Project-owned format, lint, indexing, debugger, exception, hot-reload, test/coverage and authenticated local exported-player settings.
- Persistent grouped line/function/conditional/hit/log breakpoints; stack/frame navigation, locals, watches/evaluation, exception policy, tasks and source-aware protocol v2.
- Compile/analyze-first hot reload with compatibility classification, exported-state transfer plan, frame-boundary transaction, restart-required state, bounded history and rollback.
- Unit, integration, scene, UI, physics, animation and regression metadata; filters, tags, fixtures, setup/teardown, cases, timeout, cancellation, deterministic seeds, prior-failure rerun, changed selection and deterministic sharding.
- Headless Rhai runner with JSON and JUnit reports, JSON/LCOV coverage and stable exit codes; external language/debug integration documentation.
- Six v4.6 reference projects and deterministic contract, migration, language-performance, fuzz, debugger, hot-reload, test/coverage and security evidence.

## Compatibility and deprecations

- API v2 is current; API v1 is the minimum supported script API throughout Nova_A 4.x.
- `find_entity`, `get_component`, `is_down`, `was_pressed`, `was_released`, `axis`, `vector`, `animator`, `audio_source`, and `character_can_coyote_jump` remain callable through the v1 adapter. API v2 diagnostics recommend typed/canonical replacements. Removal is scheduled no earlier than API v3.
- A v1 script is never automatically rewritten. Migration code actions require an explicit edit/save.
- API v2 keeps flat snake_case runtime callable names. Manifest modules/namespaces are stable documentation, completion, permission and compatibility domains.
- Serialized export removal or type/lifetime change requires restart; syntax/semantic failure is rejected. A failed/incompatible candidate cannot silently replace the last valid running program.
- Remote exported-player debugging is disabled by default, restricted to loopback and requires explicit project permission plus a minimum 32-hex authentication token.
- Shared mutable editor-world tests run serially. Deterministic CLI shards provide supported process-level parallelism. Retries are restricted to explicitly infrastructure-flaky tests.

## Fixed

- The Run tests split action now reruns only prior failed tests rather than the complete project.
- Script API changes invalidate/rebuild the persisted index instead of returning stale symbols.
- Cancelled or older language-service work cannot overwrite the current revision.

## Qualification

Local Rust, WASM, TypeScript, production web, Chromium layout and Windows native checks are included in release evidence when executed. Clean disposable-machine installer lifecycle, real exported-player remote debugging, Firefox/WebKit/Linux/macOS, publisher signing, independent security review and 24-hour wall-clock soak remain honestly marked external gates until their matching evidence exists.
