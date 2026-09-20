# Nova_A 26.23 supported scripting contract

Implementation contract for the 26.23 work. Final qualification reports identify the tested engine build and executed cases.

## Values and functions

The runtime is Rhai. Variables can change runtime type. Arrays and maps can be mutated, closures capture values according to Rhai semantics, function pointers support callbacks, and functions may overload by arity. A receiver method uses `this`; the receiver is not an extra ordinary argument. Lexical scopes can shadow names. Catchable script errors and uncaught invocation failures have different outcomes: an uncaught failure rejects that invocation rather than granting extra host capabilities.

Editor annotations describe expected usage and exported state. They are not a static type system and do not make arbitrary casts safe. Export metadata and host argument checks remain authoritative at their respective boundaries. The language regression must run identical examples in the native and WASM engines, comparing logs and returned state, not merely parser acceptance.

## Project modules

`use "helper";` at module scope resolves a project script asset under `Assets/Scripts`; explicit `Assets/` paths are accepted. Resolution is deterministic, dependencies are included once, and cycles, missing assets and limits reject the complete bundle. These modules share a compiled program namespace. They are not native Rhai imports with independent namespaces or import aliases. Native `import`, unrestricted `eval`, and blocking `sleep` are disabled. Unsupported alias syntax must produce an actionable diagnostic rather than silently flattening conflicting symbols.

Current resolver limits: 256 modules, depth 32, 1,000,000 UTF-16 units per source and assembled bundle, and 16,777,216 units for an input visual document. The source limits are resource ceilings, not promised interactive performance targets.

## Runtime boundaries

A script invocation sees the supplied serialized host context and emits validated commands. It has no direct editor DOM, filesystem, network, process or Tauri access. Resource/entity/component handles remain data validated by their consuming host operation; constructing a map does not grant permission. API discovery and completion must derive from the registered runtime signatures and show the current API version.

The VM currently limits operations to 100,000, call depth to 32, expression depth to 64/32, strings to 262,144, arrays to 8,192 entries, maps to 4,096 entries, commands to 4,096 and logs to 512 per invocation. Direct and function-pointer attempts to sleep are both rejected. These are VM limits; browser scheduling and native host command validation are additional boundaries.

## Safe hot reload

The currently running generation remains authoritative until the entire affected candidate bundle compiles and compatible state transfers have been prepared. Changing an imported module invalidates its dependent roots. An error in one root retains every old program and instance in the transaction. Preserve only exported properties whose type and serialization lifetime remain compatible; a changed persistent layout requires restart. Explicit recreation initializes instance state according to policy.

A newer request supersedes an earlier queued request for the same script, including when the newer request is invalid or disabled. Independent scripts keep their own pending requests. Reload history uses unique request identities and metadata; it must not unnecessarily retain every full source document. An empty previous source is a valid rollback value. Rollback is marked completed only after its candidate commits. Project/runtime lifetime disposal must clear stale rollback ownership.

Unchanged compiled programs may be shared read-only by a candidate runtime. Replacing or removing a candidate entry must not affect the live runtime; a failed compilation must change neither cache. Sharing compiled code must never share mutable invocation scopes or host output.

## Cooperative tasks

Timers and tasks are owned by an entity and runtime session; kind and name distinguish timer/task keys. Replacing, cancelling, removing the owner or ending the runtime invalidates pending callback generations. Task completion dispatches a callback. It does not resume an arbitrary suspended VM stack. Existing event-sheet routing remains compatible and must not silently gain different callback ownership semantics.

## Value inspection and diagnostics

Inspection is of supplied snapshot context, not an unrestricted expression evaluator or a claim that every VM local is available while paused. Own data properties, array indices and quoted map keys are useful supported paths. Prototype traversal, getters and executable syntax must not run during inspection. Bound depth, item count and output size before serializing. Mark truncation and unavailable values clearly. JavaScript Proxy objects are not an untrusted-code sandbox boundary; the host must provide authorized snapshot data.

Show dynamic value types, exact module paths, dependency status, pending/applied/rejected results and whether the old program was retained. Long paths and signatures need a dedicated readable detail area. Keep keyboard navigation, localized labels and existing code/graph document bindings.

## Required user scenario

Create an inventory with mutable maps and arrays, a reusable helper module, a function-pointer callback and a runtime-created entity. Inspect changed values, deliberately break a helper dependency, request a reload and verify the old program continues. Repair the helper, reload and verify compatible state is preserved. Export the project and repeat its observable gameplay. Keep native/WASM semantic checks, graph/source conversion regressions, task cancellation and command permission tests alongside the user scenario.

Exported defaults accept constant nested arrays/maps, quoted map keys, and null/unit values. Normal Rhai map syntax (`#{ ... }`) is supported at each nesting level; this data conversion does not evaluate function calls. Runtime nulls round-trip through the JSON host boundary.

Ordinary Rhai helper functions do not inherit the caller's local scope. Pass inventory/state explicitly as a parameter; exported values injected into a lifecycle invocation are not implicit globals for nested helper calls.
