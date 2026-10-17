# Nova_A 26.12 language core

The shared language model is `nova-rhai-ir`, version 1. It is implemented in `src/visual/rhaiSyntax.ts` and described by exported TypeScript interfaces in `rhaiSyntaxTypes.ts`. Source conversion and editor diagnostics can use one typed representation instead of independently recognizing fragments with regular expressions.

## Consequences reviewed before implementation

The previous importer cannot safely express all enabled Rhai syntax as editable structure. Replacing only its recognizer would still risk altering implicit returns, numeric overloads, lexical scope, comments, or initialization order. The new core therefore retains the complete original source and trivia, represents semantic children explicitly, preserves statement terminators, and verifies independent structural emission against the actual shipped WASM runtime. Existing graph and project formats are integrated separately by the graph owner; these new files do not migrate assets by themselves.

Two emission operations have deliberately different contracts:

- `emitRhai(program, edits = [])` returns the exact source. Each optional edit replaces a half-open UTF-16 range, retains everything outside it, and can require an expected old value. Overlap, out-of-range offsets, and stale expected values throw. The caller must parse and compile the proposed result before committing an edit.
- `emitRhaiNode(node)` generates syntax from typed children. It preserves semantics represented in the IR, including tails and integer/float spelling; it normalizes formatting and does not carry detached comments into a rebuilt region. Graph integration should use source-span patches for unchanged regions and explicit previews for structural regeneration.

No successful parse is a substitute for sandbox compilation or execution. Rhai has dynamic overload resolution: for example, `set_position(1, 2)` parses but fails at runtime because the registered overload takes floats. Diagnostics from the actual VM remain necessary.

## Public contract

`parseRhai(source, options?)` returns source, exact tokens including trivia, typed statements, lexical scopes, bindings, references, diagnostics, configured limits, and a source hash. `valid` means there are no error diagnostics from this language pass. `walkRhai(programOrNode)` enumerates AST nodes; `sourceSlice(program, nodeOrSpan)` reads their exact original source.

Each node has an ID, kind, scope ID, and span. Spans use JavaScript/Monaco UTF-16 offsets with an exclusive end, plus 1-based start/end lines and columns. A CRLF occupies two offsets; astral Unicode characters occupy two offsets. The token stream partitions every source character, including malformed or over-limit input. It never silently truncates the document.

The optional `previous` program reconciles identities. Unique unchanged siblings match first; edited nodes occupying corresponding structural slots then retain their IDs. Scope and binding IDs follow those matches, and new nodes receive collision-free IDs. Formatting changes, declaration renames, and inserted sibling blocks are regression tested. Identical duplicate blocks may be ambiguous; identity is an editor continuity mechanism, not a proof that two arbitrary program revisions are equivalent.

References distinguish reads, writes, compound writes and calls. Local and parameter shadowing, function overload arity, recursive calls, loop variables/counters, catch variables, typed receiver methods, implicit `this`, and closure captures have distinct bindings. Unknown dynamic names are optionally reported as warnings with `reportUnresolved`; callers can provide `knownFunctions` and `knownGlobals`. Assigning to a resolved constant is an error.

## Represented syntax

| Family | Typed representation and preserved distinctions |
|---|---|
| Values | Integer and float spellings, booleans, unit, characters, quoted strings, hash-delimited raw strings, backtick strings, arrays, maps and their keys |
| Strings | Nested interpolation blocks, multiline text, doubled delimiters, Unicode/hex escapes, escaped interpolation and continuation indentation |
| Expressions | Calls, namespace/member access, optional member/index access, indexes, unary/binary operators, ranges, short-circuit operators and null coalescing |
| Writes | Assignment and compound assignment to identifiers, properties and indexes; assignment is diagnosed when incorrectly used as a value expression |
| Bindings | `let`, `const`, parameters, loop counters, catch variables and closure captures |
| Functions | Named/private functions, overloads, recursive calls, typed receiver functions such as `fn int.twice()`, closures, and ordinary calls to `Fn`, `call`, and `curry` |
| Flow | Blocks, nested `if`/`else if`/`else`, switch patterns/ranges/guards/defaults, `for` including `(value, counter)`, while, loop, do-while/do-until, break values, continue, return, throw and try/catch |
| Result semantics | A terminated expression differs from an unterminated tail; final declarations and assignments remain unit-valued statements |
| Modules | Typed native import/export syntax for inspection, native exported declarations, and Nova project `use` dependencies in the explicit host mode |
| Editor properties | Bare and metadata-bearing `@export`, plus the runtime's legacy `// @export` annotation |
| Recovery | Invalid nodes and precise error spans; incomplete source remains available without pretending malformed regions are supported executable structure |

Operator precedence follows the installed Rhai 1.25.1 tokenizer, including shift operators binding more tightly than exponentiation and the shared bitwise/logical precedence levels. Structural generation parenthesizes operators to preserve that interpretation. It retains `7` versus `7.0`, `+7`, and hexadecimal/octal/binary literals rather than passing values through JavaScript number serialization.

## Host modules and disabled syntax

Default parsing targets the native sandbox: `eval` and blocking `sleep` are disabled and `import`/`use` receive module diagnostics. Use `timer_start` or `task_wait` for deferred work. `moduleMode: 'host'` enables Nova's project dependency syntax only: a standalone `use "path";` line, optionally without the semicolon, using the established double/single/backtick path wrappers. It forbids aliases, interpolated paths and embedded use statements. Host paths retain literal backslashes for path normalization. The host resolver must load and deduplicate those dependencies, reject cycles/missing assets, and execute the resulting shared module. This option does not enable native imports, eval or sleep.

`sandbox: false` is an inspection mode for structurally representing native module declarations, not permission to execute them in Nova. Reserved language names and symbols still receive diagnostics. Native `export` and Nova `@export` have different AST forms: native exports concern module visibility; Nova exports are editable runtime properties.

## Explicit bounds

| Resource | Maximum default |
|---|---:|
| Source | 1,000,000 UTF-16 code units |
| Tokens | 200,000 |
| AST nodes | 100,000 |
| Parser/lexer nesting | 128 |
| Diagnostics | 200 |
| Nested block comments | 64 |

Callers may lower these values; non-finite settings fall back to defaults and cannot remove the bounds. An `AbortSignal` cancels work. Limit/cancellation errors retain the original source. The native runtime additionally enforces its own UTF-8 byte, operation, call-depth, expression-depth, string and collection limits; the language-core limits do not override those. Identity matching uses bounded sibling matching rather than quadratic longest-common-subsequence allocation.

## Verification and programmer audit

Run `node scripts/verify-v26.12-language.mjs`. Add `--report=path.json` to write reproducible evidence. `scripts/fixtures/v26.12-rhai-corpus.mjs` exports `rhaiCorpus` for graph integration tests.

The verifier currently includes 34 runtime fixtures and 60 deterministic generated operator pairs. For valid fixtures it parses typed structure, independently emits a new program, executes original and generated source in `WasmScriptRuntime.execute_json`, and compares commands, logs and exported properties. Deliberate runtime failures check their failure categories. It separately changes an AST literal and checks the changed runtime result, so this is not just an identity-source test.

Coverage includes closure captures and unsupported closure persistence, exported property writes and position commands, integer/float overload failure, switch ranges, typed methods, control-character map keys, normal-string indentation continuation, implicit returns, malformed/truncated prefixes, UTF-16 spans, stale patches, cancellation, resource limits, shadowing and identity preservation. Module inspection/host acceptance is validated without claiming native imports execute. VM function return values are exposed by corpus scripts through assertions/logs; the public runtime result does not provide an independent general return-value channel.

Actual user interaction, graph rewiring, node layout and linked asset persistence require the graph/UI integration verifiers. A parser corpus by itself does not certify those editor behaviors.

## Shared editor diagnostics and safe authoring

The editor analyzer now consumes this token/AST/binding model for syntax diagnostics, declarations, references, overloads, shadowing and call classification. The actual WASM signature inventory supplies standard and engine names for diagnostics, completion, hover and parameter help. Resolved project dependency functions still propagate through both synchronous and worker analysis. An unresolved direct-call typo remains an error. Dynamic member calls can resolve through receiver types or map-held closures, so their runtime resolution is left to the actual VM instead of being mislabeled as missing global functions. The existing comment type/structure/generic annotation and debugger statement adapter remains additive; it does not replace the AST's syntax or binding decisions.

`renameScriptSymbol(source, name, replacement, selection?)` accepts a UTF-16 `offset` or `bindingId` and optional `externalSources`. It patches exactly one declaration and the references bound to it, then reparses and verifies that all reference identities still resolve to the same bindings. Name-only selection must be unambiguous. Capture collisions, syntax errors, exported properties/native export aliases and unprovable method/function-pointer references throw a precise error before producing edits. Shared declarations also reject unresolved references or possible function-pointer/method uses in other project scripts. Cross-script analysis is bounded to 256 scripts and 16,000,000 UTF-16 code units; larger or malformed contexts require an explicit module migration. The operation does not promise arbitrary project-wide symbol migration.

The Script Studio and LSP callers pass the selected document and exact source offset. Studio preserves unrelated shadowed variables, comments and strings, and continues through its validation and linked-asset save transaction. The workspace index rejects ambiguous document selection. Both callers supply other open/project source documents to the shared cross-script guard.

The pure validator lives in `src/visual/rhaiRename.ts`. A visual bound-name edit resolves its node against the **currently emitted** module, runs the same capture/duplicate check, and compares a proposed graph's normalized AST with the validated source rename before changing any real field or title. A failed rename leaves the original graph byte-identical. Stale/incomplete graph binding metadata is reported instead of silently applying a partial rename. Newly created nodes without parsed binding identity retain their normal field-editing workflow. The graph verifier includes actual-WASM nested-capture and duplicate-overload regressions, including edits made after the original source projection.

`formatScript` changes safe indentation whitespace and the requested final newline. It protects multiline literal/interpolation ranges, retains non-whitespace token and comment lexemes, and reparses the result before returning it. Malformed source remains unchanged with its diagnostics visible. The retained `lineWidth` option does not authorize rewrapping comment/literal text; this formatter deliberately avoids those semantic risks. The old formatter's global line trimming and comment rewrapping are removed.

Run `node scripts/verify-v26.12-language-editor.mjs` (optional `--report=path.json`). Its 46 checks include all 34 shared real-WASM fixtures, original/formatted observable results, selected and captured renames, collision/external-reference rejection, the old diagnostic codes and module completion contract, UTF-16/CRLF selection, actual framed LSP rename, and the legacy JSONL protocol. The LSP now starts an isolated TypeScript transformation service without browser HTML discovery, HMR or workspace file watching; loading the full editor Vite configuration had stalled startup in this workspace.

## Exact edit ledger

1. **Added `src/visual/rhaiSyntaxTypes.ts`:** versioned public AST, tokens, UTF-16 spans, diagnostics, source-edit, scope/binding/reference and resource-limit contracts. Includes receiver functions and native exported declarations as real children.
2. **Added `src/visual/rhaiSyntaxLexer.ts`:** exact trivia-preserving lexing, enabled Rhai operators/reserved symbols, numeric and string forms, nested comments/templates, string decoding and bounded diagnostics. It reports malformed input instead of dropping it.
3. **Added `src/visual/rhaiSyntax.ts`:** typed Pratt parser, statements/control flow, binding/capture analysis, identity reconciliation, host-module validation, guarded source patches and structural emission. It keeps assignment/tail distinctions and source positions needed by the visual editor.
4. **Added `scripts/fixtures/v26.12-rhai-corpus.mjs`:** shared actual-runtime sources and observable expectations for independent parser and graph tests.
5. **Added `scripts/verify-v26.12-language.mjs`:** source/AST/span/scope/limit checks, malformed-prefix corpus, mutation checks and actual WASM differential execution; optional JSON evidence output.
6. **Added this document:** contract, supported syntax, runtime boundaries, validation method and complete file-level edit ledger.

The initial six-file language core did not change existing runtime, graph, Vue component, package/version metadata or release output. The later authorized editor integration adds these exact edits:

7. **Added `src/editor/scriptLanguageSyntax.ts`:** typed editor analysis, actual callable-name authority, exact lexical references, shared rename exports and whitespace-only formatting.
8. **Changed `src/editor/scriptLanguage.ts`:** replaces the line/regex analyzer and rename/format mutation paths with the shared helper, supplies actual overload details in completion/hover/parameter help, adds optional reference identity/access fields, and preserves external module/worker contracts.
9. **Changed `scripts/nova-rhai-language-server.mjs`:** passes URI and exact UTF-16 position for rename, returns the actual selected identifier range, and isolates the transformation service from browser build/discovery/watch behavior.
10. **Added `scripts/verify-v26.12-language-editor.mjs`:** actual-WASM editor corpus, safe authoring regressions and both real LSP transports, with JSON evidence output.
11. **Changed `scripts/release-milestone-gates.mjs`:** makes the new editor verifier and its report mandatory in the 26.12 focused gate.
12. **Updated this document and `docs/EDIT_LEDGER_26_12.md`:** records the authoring contracts, limits, new checks and exact file consequences. Studio/button/presentation/localization edits are recorded by the UI owner.
13. **Changed `scripts/verify-v26.01-visual-roundtrip.mjs`:** selects the retained legacy factory for its historical node-model assertions and records the current executing version/scope. It does not present the old model's expectations as a test of the new AST projection.
14. **Added `src/visual/rhaiRename.ts`:** pure source-span/binding rename validator shared by text and visual authoring; preserves exact unrelated source, rejects capture/duplicate or unprovable migrations, and bounds external-source analysis.
15. **Changed `src/visual/graphSyntaxSchema.ts`:** validates bound-name edits against current emitted source and an unmodified graph proposal before committing fields/titles; retains unbound new-node creation.
16. **Extended `scripts/verify-v26.12-typed-graphs.mjs`:** adds atomic graph/source/title retention and actual VM capture/duplicate/current-edit regressions; the full typed graph suite now has 81 checks.
