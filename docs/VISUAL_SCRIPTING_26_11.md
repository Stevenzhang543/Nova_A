# Visual scripting correctness work in 26.11

26.11 repairs concrete source conversion and save defects found during the Nova_A audit. This is a tested improvement to the existing graph compiler and importer. It is not a claim that every Rhai construct has an equivalent editable visual node.

## What was reproduced before editing

| Input/action | Previous observed result | 26.11 behavior |
| --- | --- | --- |
| `for index in 0..3 { score_add(index); }` | The generated loop declared a UUID-derived index while its body still read undefined `index`. | The original index identifier survives. |
| `if false { ... } else if false { ... } else { ... }` | The second condition and final `else` were discarded. | Nested branch nodes retain both conditions and all branches. |
| `mouse_world_x() + mouse_world_y()` | The greedy API-call matcher discarded the second operand. | Both API reporters feed a math node. |
| A commented-out `fn fake() { ... }` | The comment became a real graph routine. | Comments and quoted text are masked before structural function discovery. |
| A custom helper used in an expression | Its declaration gained a hidden depth argument but its call retained the original argument list. | Imported helper signatures retain the author's argument list. |
| A final expression in a helper | A generated unit return replaced the implicit return value. | Explicit return source preserves the value, including final conditional expressions. |
| Saving parameters with UUIDs in a different order | Canonical serialization reordered positional arguments by UUID. | Input/output/event/interface parameter order is preserved. |
| Saving ordinary generated multi-line Rhai | End-anchored marker detection missed most node markers and recreated the graph. | Marker detection runs per line; unchanged saves preserve the whole graph document. |
| Deleting or inserting code inside a marked callback | Old nodes could reappear or inserted code could land outside its callback. | The complete regenerated source must account for the edit; otherwise the importer rebuilds from the edited source. |
| Importing graphs with conditions and reporters | Generated coordinates overlapped. | Every imported scope runs through the existing rendered-size-aware layout. |
| Long Execute Rhai blocks | The compiler silently emitted only 512 statement lines or 2,048 module lines. | All source lines within the explicit character budget are emitted. |
| Multi-line strings and source markers | Marker comments or indentation could become string contents. | Marker insertion respects lexical boundaries; interpolated strings use exact-source module fallback. |
| Switching Code/Graph to Event Sheet with a dirty document | The active editor unmounted before the save guard. | Every mode change waits for the active save; failed/missing saves retain the current mode. |
| `sin(float)` / `cos(float)` in templates | Static diagnostics rejected functions supported by the actual WASM runtime. | Those two verified standard functions are recognized; unsupported `clamp` remains diagnosed. |
| `log_info("imaginary_call()")` | The analyzer treated text as a function call. | Quoted text is excluded from call discovery. |

## Conversion coverage and exact limits

The existing Conversion Coverage panel reports structural versus Execute Rhai blocks. Read that panel before assuming every element can be edited through typed pins.

| Language/graph feature | Current conversion |
| --- | --- |
| Lifecycle callbacks | Event nodes and execution paths; imported parameter names are retained. |
| Supported API commands and value reporters | Typed blocks when the complete call and arity are recognized. |
| Simple graph variables and literal initializers | Graph variables; imported literal spelling retains integer versus floating-point behavior while its value remains unchanged. |
| Variable assignments and reads | Set/Get nodes where an extracted variable is available. |
| `if`, `else if`, `else` | Connected branch nodes; implicit tail returns become explicit source within their branches. |
| `for name in 0..N`, integer constant `0 <= N <= 1024` | Bounded Repeat with the original index name. |
| Dynamic ranges, inclusive ranges, nonzero starts, or ranges above 1,024 | Execute Rhai statement; the source range is not silently clamped. |
| Boolean, comparison, supported arithmetic expressions | Connected operator/reporting blocks where their pin contracts hold. Imported arithmetic uses original Rhai division/modulo behavior. |
| Custom functions, ordered parameters and statement calls | My Blocks routines retain original signatures. Function expression calls and explicit returns may remain Execute Rhai source. |
| Local declarations, result declarations, compound assignments, `try/catch`, other unsupported statements | Execute Rhai statement blocks. |
| Interpolated strings and `private fn` | Whole-source module fallback until a complete Rhai AST is available. |
| Arbitrary module initialization | Kept in module source order instead of hoisting extracted variables across executable statements. |
| Projection that violates typed graph constraints | Whole-source module fallback. The original Rhai still requires runtime/language validation. |
| More than 64,000 source characters | Conversion fails with an explicit message before writing a companion; split the script. |
| More than 2,048 statements in a converted execution scope | Conversion fails with an explicit message; statements are not silently dropped. |

The source budget is currently a conversion limit, not a claim about the maximum script accepted by the Rhai runtime. Existing Code modules and statement blocks remain bounded by Graph Format 1's 64,000-character source field. Source fallback means executable source is retained; it does not mean that the partial TypeScript language analyzer proves every dynamic Rhai program correct.

## Save behavior and compatibility consequences

An unchanged linked save retains graph UUIDs, node UUIDs, wires, layout and debugger settings. A source edit that can be accounted for by the existing node regions uses the existing graph. Insertions, deletions or more complex edits trigger a fresh structural projection if the region-based result does not reproduce the edited program.

Rebuilding keeps the graph UUID, same-name variable UUIDs, same-name routine/parameter UUIDs, matching unchanged node UUIDs, and breakpoints attached to those retained nodes. New or changed nodes receive new identities and the graph is automatically arranged. Renaming or replacing source-backed symbols is not a complete semantic refactor: comments, custom visual metadata and debugger information attached to replaced structures can need review. This remains work for the later source-AST and identity-reconciliation milestone.

Graph Format 1 and API 2 remain in use. The optional `sourceLiteral` variable field and existing node `config` metadata preserve source semantics in 26.11. Older editors may discard these additive fields when resaving; saving 26.11 imports in older versions is not qualified as a semantics-preserving downgrade. Existing graph-authored routines retain their established hidden-depth calling convention; only imported source routines opt into the original author signature. Consequently imported helper debugger trace depths currently show lexical depth rather than a fully reconstructed native call depth.

The inherited bounded Repeat node still has its 1,024-iteration cap for graph-authored content. The importer only chooses it when that cap preserves the source range. Graph-authored safe division behavior also remains intact; imported operator nodes explicitly request Rhai arithmetic semantics.

## Source-level subsystem inventory

| Working source | Responsibility/features |
| --- | --- |
| `src/visual/graphTypes.ts` | Graph Format 1 types; size/count/value limits; UUIDs; graph/routine/variable/event/interface/library/debug metadata; parsing, normalization and deterministic serialization. |
| `src/visual/graphCatalog.ts` | API-v2-derived node palette; events, constants, math/logic/comparison, conversions, branch/sequence/repeat, reroutes, variables, functions, custom events, package and plugin nodes. |
| `src/visual/graphCompiler.ts` | UUID/pin/wire/type/required-value/cycle/signature validation; Rhai generation; routine/local/custom event execution; debugger trace insertion and source mappings. |
| `src/visual/graphCodeSync.ts` | Graph/Rhai linking; code import; source markers; region edits; complete-source reconciliation; conversion coverage; creation and synchronization of companion assets. |
| `src/visual/graphInteraction.ts` | Focal zoom; wheel unit handling; pan/drag transforms; rendered bounds; non-overlapping insertion; execution layout; low-detail thresholds. |
| `src/visual/graphProduction.ts` | Routines, parameters, custom events and interfaces; signature synchronization; references; rename/replacement/deprecation; extraction; semantic diff/merge; graph hot reload planning. |
| `src/visual/graphDebugger.ts` | Traces, active nodes/wires, bounded capture, step modes, conditional/hit/log breakpoints, watches, timing, coverage and errors. |
| `src/visual/graphStudioState.ts` | Code/graph/events mode, Blocks/Nodes presentation, active asset, panel toggles and active-save handoff. |
| `src/components/ScriptWorkspace.vue` | Mode tabs; selected linked asset routing; save-before-unmount for dirty code and graph drafts. |
| `src/components/VisualGraphEditor.vue` | Palette, Blocks/Nodes canvas, wiring, selection, drag/pan/zoom, scope selection, history, save/hot reload, variables, diagnostics, source preview, minimap and details. |
| `src/components/GraphProductionPanel.vue` | Function/event/interface/library authoring, debugger and coverage production controls. |
| `src/editor/scriptLanguage.ts` | Lightweight parser/semantic checks, symbols/references, tests, API usage, completion/hover/signatures, formatting/actions, workspace index, protocol and worker coordination. It remains a partial analyzer. |
| `src/editor/scriptLanguage26.ts` | Comment-based optional type/structure/generic declarations, inference hints, statement IDs and remapping, module dependency/cycle analysis. |
| `src/editor/scriptApi.ts` | Shared Rhai API inventory, signatures, categories, documentation and capability contracts used by the graph catalog and language service. |
| `crates/nova_script/src/lib.rs` | Native/WASM Rhai runtime, sandbox/context snapshots, registered host API and script execution. No Rust runtime code changed in this work. |

These are active sources, not starter scaffolding. `reference-projects/**/ProductionGraph.nova-graph`, `.rhai` fixtures and `scripts/verify-*` provide teaching/test evidence. Their existence does not prove every user workflow is correct.

## Panel audit observations

The Script Workspace has Code, Visual Graph and Event Sheet mode tabs. The mode handoff is now common to every destination. Visual Graph has palette, canvas, scope selector, graph details/variables and production details; graph inspectors already contain narrow-width container rules. The existing graph editor measures its canvas, culls large graphs, supports compact overlays and accounts for code editors when calculating node bounds.

The repaired importer uses that same node-size model, so branch/reporter placement no longer bypasses the layout machinery. This does not yet provide a complete semantic tree layout: execution branches use separated stack placement and loose data reporters occupy additional columns. Reducing wire crossings, nesting branch containers and preserving hand-arranged positions during arbitrary source edits are follow-up layout work.

The broader UI audit and template library work are documented separately by the 26.11 release audit. This document does not claim that reading the Vue files substitutes for checking every visible panel at every locale, scale and viewport.

## Verification

Run the focused verifier using the native Rhai test runner:

```powershell
cargo build -p nova_script --example nova_script_test
node scripts/verify-v26.11-visual-roundtrip.mjs --runtime=target/debug/examples/nova_script_test.exe
node scripts/verify-v26.01-visual-roundtrip.mjs
node scripts/verify-v5.3.0-graphs.mjs
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

The 26.11 script creates a private temporary directory, Vite-bundles the real modules, checks the real asset-link APIs, writes original and regenerated Rhai fixtures, and runs both through the native runner when `--runtime` is supplied. It reports native execution as **not requested** if that argument is omitted. Results are written to `release-audits/v26.11-visual-roundtrip.json`.

At the implementation checkpoint, 81 focused checks passed, including 47 native executions: 23 original/generated pairs and a graph whose event parameter was rewired visually. These cover loop variables, else-if, ordered helper arguments, explicit/implicit/conditional returns, comments and strings, integer division, dynamic loop fallback above 1,024, try/catch, result declarations, module initialization, multiline string contents, string addition and runtime-verified trigonometry. Independent review also added trailing-comment returns, tail declarations/assignments, commented-out globals, bare/metadata exports, signed integer/array literals, bounded-value fallback and event-pin rebinding. The retained 26.01 suite passed six checks after its expected helper/index spellings were updated. The retained production graph suite passed nine checks, including repository graph assets, debugging, merge, refactoring and package nodes.

The existing graph DOM verifier was attempted but could not connect to its spawned Edge DevTools endpoint before its timeout; no interaction pass is claimed from that run. The broader UI audit may provide separate browser evidence.

The final integrated check rebuilt `target/debug/examples/nova_script_test.exe` from the changed Rust source using `cargo build -p nova_script --example nova_script_test --locked --offline`, then passed all 81 focused checks including 47 native executions again. Release metadata still identifies the development checkout as 26.10; this does not mean the runtime source was unchanged. The backend audit repaired duplicate global evaluation and validated that separately.

An independent live-browser check used a disposable project in the optimized editor: type an unsaved callback with a declaration, `for index in 0..3`, assignment and an `if/else`; switch directly to Visual Graph; inspect the generated nine-node graph and its connections; change a LogInfo text pin; switch back to Rhai and confirm valid regenerated code with the original loop index and edited value. Adding an unsaved source comment, switching through Event Sheet, and returning to Code retained both the comment and prior block edit. Framing showed separated nodes, but the complete chain required zooming out to 27% in the small center pane; that is not proof of readable fit for every graph size. This user flow supplements the automated checks and does not certify every failure/cancellation/undo path.

For actual user checks, edit a Rhai callback, switch to Visual Graph, inspect its branches and wires, change a pin, save, return to code, and execute it. Then edit a graph, switch to Event Sheet, and reopen the graph; repeat from a dirty code draft. Introduce a graph validation failure and confirm that switching mode stays in the current editor. Repeat at narrow panel widths, in each supported locale, and after undo/redo. These checks belong alongside the automated graph DOM and all-panel release audit, not in place of it.

## Every edited file in this work

1. `src/visual/graphCodeSync.ts`: adds lexical masking and full-call recognition; repairs else-if and loop identifiers; preserves literal spelling and export bounds; keeps arbitrary module initialization ordered; handles implicit returns; retains imported signatures; arranges imported scopes; introduces explicit limits and source fallback; checks complete edited-source reconciliation; preserves unchanged identities; detects multiline markers; prevents markers inside multiline strings or runtime-preprocessed export declarations; keeps commented-out globals inert and final declaration/assignment behavior intact.
2. `src/visual/graphCompiler.ts`: respects imported signatures, parameter names, literal spellings and arithmetic; retains original repeat identifiers and event-pin aliases; preserves source line contents/count; stops blank-line compression from shifting source mappings. Existing graph-authored calling/loop/arithmetic contracts remain available.
3. `src/visual/graphTypes.ts`: adds optional normalized literal-spelling metadata and preserves positional parameter arrays during canonical serialization.
4. `src/components/ScriptWorkspace.vue`: moves dirty code/graph save checks before all mode transitions and retains the current editor if its save cannot complete.
5. `src/editor/scriptLanguage.ts`: recognizes verified `sin` and `cos`; masks quoted text before identifying calls. It does not add unsupported `clamp`.
6. `scripts/verify-v26.11-visual-roundtrip.mjs`: adds focused module/asset/layout/source and original/generated native runtime regressions with an explicit runtime-execution status.
7. `scripts/verify-v26.01-visual-roundtrip.mjs`: updates the historical generated-source expectation to original helper and loop-index names while retaining its structural and validation assertions.
8. `docs/VISUAL_SCRIPTING_26_11.md`: adds this implementation contract, feature map, audit observations, exact limits and verification instructions.
9. `release-audits/v26.11-visual-roundtrip.json`: records the new focused verification results. Retained verification runs also refresh their existing report JSON files; they are test evidence, not new runtime features.

No features were intentionally removed. Unsupported transformations now use explicit source or fail before truncation. Full structural conversion of all supported Rhai syntax, scope-aware semantic refactoring, complete routine output dataflow and independent qualification of all editor workflows remain in the 26.11–26.20 implementation plan.
