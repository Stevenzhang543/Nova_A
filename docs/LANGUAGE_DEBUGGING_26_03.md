# Nova_A 26.03 language, debugger, and visual compiler contract

Nova_A 26.03 is additive. Project Format 2/schema 29, Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, Build CLI 1, and Workspace Document 3 do not change.

## Optional types and data

Rhai remains dynamically typed at runtime. Script Studio recognizes safe documentation comments that older Nova_A versions and Rhai itself ignore:

```rhai
/// @struct Damage amount:Number, source:Entity?, tags:Array
/// @type speed: Number
let speed = 6.0;

/// @generic T: Entity|Resource
fn identity(value) { return value; }
```

`@type` declares an editor expectation. Literals, arrays, maps, common vectors, known API results, assignments, arithmetic, and comparisons are inferred when no declaration exists. `@struct` describes a bounded map-backed data resource; a `?` field is optional. `@generic` documents constrained helper parameters without pretending Rhai has a different runtime type system. Contradictions, malformed fields, invalid inline type syntax, and annotations without a target are diagnostics; source is never discarded.

## Modules

`use "movement"` resolves inside `Assets/Scripts`, or by an explicit safe `Assets/...` path. Resolution strips the editor directive, orders dependencies before the owning script, includes each module once, rejects missing modules, rejects `..`/URL escapes, and fails on cycles. Script Studio and the Language Server show workspace cycle diagnostics before runtime validation. Rhai filesystem `import` remains disabled.

## Statements, breakpoints, and values

Each executable declaration, assignment, branch, loop, return, throw, call, or expression receives a stable identity derived from its function, normalized source, and occurrence. Adding lines remaps breakpoints by identity; a changed statement falls back to the nearest statement in the same function. Runtime breakpoints bind only to actual mapped statements—not every line inside a function.

The debugger preserves conditional breakpoints, hit counts, logpoints, function names, exception policy, call stack, locals, expression watches, nested object inspection, hot reload, and authenticated local remote sessions. Script tasks show queued/running/waiting/completed/cancelled/failed state. Cancelling from Script Studio removes the exact `RuntimeTime` task and records the frame. Visual Graph trace events show current nodes/wires, timings, coverage, errors, call stack, watches, and the most recent bounded values directly on each block.

Rhai executes synchronously inside the bounded WASM sandbox. Text stepping therefore stops and resumes at safe mapped callback/statement boundaries; Visual Graph stepping can pause between emitted host commands because those commands are already an ordered host batch. The UI never claims arbitrary native-thread suspension.

## Code and Visual Graph

The graph Code view reports structural conversion coverage: native editable blocks, explicit escape blocks, percentage, owning scope, and preserved source. Unsupported top-level code, statements, and expressions are named **Execute Rhai Module**, **Execute Rhai Statement**, and **Execute Rhai Expression**. These blocks run through the same sandbox, remain visible/editable, and round-trip losslessly.

Identity-based structural diff covers variables, nodes, edges, routines, interfaces, libraries, debug metadata, and configuration. Three-way semantic merge starts from a captured base and keeps every conflict unresolved until the user chooses ours or theirs. Applying is disabled while a conflict remains. Saving either Rhai or Graph still validates and atomically updates its exact linked companion.

## External editor protocol

Run `pnpm language-server:v26.03`. The default transport is JSON-RPC 2.0 over standard LSP `Content-Length` frames on stdio. It implements LSP 3.17 initialize/shutdown/exit, full document synchronization, pushed and pulled diagnostics, completion, hover, signature help, definitions, references, document/workspace symbols, project rename, formatting, code actions, request cancellation, and bounded index persistence. `nova/typeAnalysis` and `nova/moduleDiagnostics` expose Nova-specific analysis. `--legacy-jsonl` retains the previous adapter. The in-app Web Worker language service remains the fast default for Script Studio.

## Limits and security

- Source: 2,000,000 characters per document.
- Workspace index: 10,000 documents.
- Module dependencies: 256 per document.
- Statements: 100,000 per document.
- Type values: 50,000; structures/helpers: 2,000 each.
- Structure fields: 128; generic parameters: 16.
- LSP frame: 16 MB.
- Debug trace: 5,000 entries; task list: 512.
- No new filesystem, network, process, clock, or unrestricted evaluation authority is granted to game scripts.

## Qualification

26.03 tests the parser/type corpus, malformed and hostile input, stable statements, edit remapping, module cycles, deterministic task cancellation, nested watches, graph source mapping/live values, conversion coverage, unsupported-source round trips, structural diff/merge, actual Content-Length LSP sessions, protocol shutdown/cancellation, performance ceilings, EN/DE/ZH layouts, full builds, Rust/WASM tests, templates, historical migrations, evidence, and the exact eleven-file package. Signing, independent observation, matching-host targets, real assistive hardware, and real-duration soak remain external gates.
