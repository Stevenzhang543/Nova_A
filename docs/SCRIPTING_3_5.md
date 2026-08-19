# Nova_A 3.5 scripting workflow

Nova_A 3.5 freezes **Nova Rhai API v1** as the supported scripting contract through the 3.x line and as the migration baseline for 4.0. The generated symbol reference is [RHAI_API_V1.md](./RHAI_API_V1.md); Project Format 2 schema 25 is described in [PROJECT_FORMAT_2_SCHEMA_25.md](./PROJECT_FORMAT_2_SCHEMA_25.md).

## Runtime and security contract

- A script runs in a bounded Rhai sandbox. Filesystem, network, processes, DOM, dynamic evaluation, raw host imports, and unsafe editor objects are unavailable.
- Calls that mutate the game enqueue typed commands for a safe runtime boundary. Invalid, empty, non-finite, or out-of-range arguments are reported; they never silently write corrupt state.
- Object, component, animator, audio, and resource references use values with `valid`, `kind`, `id`, `error`, `api_version`, and deterministic `generation`. UUID-returning legacy helpers remain deprecated compatibility shims through API v1.
- Each execution receives copied transform/body/input/time/event snapshots. One script cannot mutate another instance’s context by retaining a host object.
- The runtime caps operations and collection/data sizes. Compile or runtime failures are source-linked, bounded in diagnostics, counted once per useful context, and do not replace the last valid compiled program.

## API domains

The public domains are lifecycle, scene, object, component, transform, input, physics, UI, audio, animation, navigation, save data, timing, logging, resources, signals, tasks, and testing. Rhai call names remain flat `snake_case`; the stable domain is attached to every catalog entry for documentation, completion, audit, and future capability policy. `api_version()` returns `1`; `api_namespace(symbol)` reports the catalog domain.

Deprecated v1 aliases produce `NOVA-COMPAT-001` in the editor and one `NOVA-SCRIPT-DEPRECATED` runtime warning, with their API-v2 replacement. Current deprecated aliases are `find_entity`, `get_component`, `is_down`, `was_pressed`, `was_released`, `axis`, `vector`, `character_can_coyote_jump`, `animator`, and `audio_source`.

## Export metadata and Inspector

```rhai
@export(type="float", min=0, max=20, step=0.1,
  group="Movement", tooltip="Acceleration in N", serialize=true)
let acceleration = 5.0;
```

Metadata includes explicit/inferred type, default, minimum, maximum, step, enum choices, resource type, group, tooltip, and serialization. Schema 25 persists the normalized metadata. The Inspector uses it for grouping, help, number bounds, enum choice, Boolean control, asset-type filtering, and whether the property enters a saved project/runtime property map. Existing `@export let value = ...;` remains valid.

## Modules, signals, timers, and tasks

`use "Movement.rhai"` adds a project module. Resolution uses script asset path/name under Assets/Scripts, rejects `..`, URL schemes, missing assets, and cycles, and validates the complete graph before execution. Script metadata records package name and dependencies for the Modules pane.

`signal_emit` broadcasts and `signal_emit_to` targets one entity. Payloads cross the sandbox only if serializable and bounded. Script metadata contains editor-visible signal/source/target/callback connections; enabled matching connections invoke their named callback at a safe boundary. Timers are entity-owned, may repeat, pause, resume, or cancel, and complete through `on_timer`. `task_wait` is a cancellable deferred continuation completed through `on_task`; invalid scheduling reports an error. Entity destruction and session end cancel their remaining work.

## Code intelligence and external editors

The in-editor language service produces coded/ranged parser, semantic, compatibility, runtime, and test diagnostics; document/workspace symbols; semantic completion; signatures and parameter hints; hover docs; definition; references; project rename; formatting; and code actions. It indexes open project scripts and provides generated API examples and links. Five templates cover Component, UI behavior, Physics behavior, Animation event, and Script test.

Run `pnpm script:lsp` for a dependency-free JSON-lines stdio process. Protocol 1 supports analyze, completion, hover, definition, references, workspace symbols, whole-document formatting, and shutdown. Clients should follow [RHAI_LANGUAGE_PROTOCOL.md](./RHAI_LANGUAGE_PROTOCOL.md); this is language-server-compatible transport with a documented Nova payload, not a claim of full Microsoft LSP wire compatibility.

## Debugger

Breakpoint metadata persists line, optional callback/function, condition, hit threshold/count, log message, enabled state, and stable ID. Logpoints interpolate bounded `{path.to.value}` expressions without pausing. A runtime error may pause when Break on runtime error is enabled.

Pause/Continue, Step into, Step over, Step out, and Restart operate at the next safe callback boundary. Frames include script asset/path, function, entity, line, and depth. The Debug pane shows bounded stack, copied locals/context, watches, scalar/path comparisons, and nested object inspection. Update, fixed update, input-driven logic, collision/trigger, UI callbacks, signals, timers, tasks, late update, and destruction use the same pause path.

Known limitation: Rhai/WASM API v1 does not yet pause at every arbitrary statement inside one callback. Line breakpoints map a source line to its owning callback, and stepping advances between safe callback boundaries. Function breakpoints are exact. This avoids stopping while Rust physics or editor state is half-mutated.

## Atomic hot reload

Every script selects:

- **Preserve:** retain old exported values only when compatible with the new declared type/range; add new defaults and discard incompatible/removed state.
- **Recreate:** discard instance properties and enter lifecycle using new defaults.
- **Disabled:** do not replace the running source for this script.

The runtime resolves the complete module bundle, compiles into a temporary cached AST, validates exports, and only then commits source/revision/state. Any parse, module, or metadata error produces Rejected status and leaves the previous AST and instance state active. This rollback is covered by the native atomic-cache test.

## Tests and CI

Tests use a `test_` prefix and optional metadata:

```rhai
fn before_each() { }
// @test tags=unit,fast timeout=1000 seed=42 cases=keyboard|gamepad
fn test_movement() { expect(true, "movement remains valid"); }
fn after_each() { }
```

The runner discovers tests and `before_all`, `before_each`, `after_each`, `after_all`; expands cases; filters tags; records deterministic seeds; honors skip and timeout metadata; isolates property state; and reports assertion/runtime failure without crashing the editor. Script Studio displays results. The Console receives source-linked errors. For headless CI:

```powershell
pnpm test:scripts:headless -- Assets/Scripts --format json --output reports/scripts.json
pnpm test:scripts:headless -- Assets/Scripts --format junit --output reports/scripts.xml
```

Exit codes are `0` for all runnable tests passed, `1` for failed/timed-out tests, and `2` for invalid runner options, paths, or output errors.

## Profiling

Debug → Profiler → Scripts records script UUID/name, function/callback, calls, last/total/maximum wall time, and an allocation estimate based on source/context boundary data. Capture stores up to sixteen bounded snapshots. Export writes `nova-script-profile` JSON. A/B comparison reports call, total-time, and allocation deltas per script/function. Estimates describe data crossing the scripting boundary, not native allocator-exact heap bytes.

## Migration and compatibility

Schema 25 gives every script API version 1, detailed breakpoints, test metadata, module/package dependencies, hot-reload policy, signal connections, recovery source, and saved hash while retaining numeric breakpoints and old exports. Old aliases continue to run and warn. Unknown future metadata is preserved by the project format where supported. `tests/fixtures/scripting/api-v1-contract.json` is the archived contract used to reject removed or signature/namespace-changed v1 symbols.

Release acceptance covers all 93 host call bindings and 15 native sandbox tests; 108/108 documented/example symbols; 10,000 deterministic parser/semantic fuzz cases; 5,000-error responsiveness; thirteen debugger callback paths; hot-reload rollback; JSON/JUnit pass/fail exit codes; the external process; schemas 5–25; three locales and responsive layouts. Machine-readable reports are in `release-audits/`.
