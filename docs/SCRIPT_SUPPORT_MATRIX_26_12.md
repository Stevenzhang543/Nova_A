# Nova_A 26.12 scripting support matrix

The complete overload matrix is [rhaiApiSignatures.generated.json](../src/visual/rhaiApiSignatures.generated.json). It records every discovered signature, exact Rust parameter and return types, parameter names, insertion literals, native/WASM profiles, availability, callback/callable role, source location, and package. The editor consumes this same data through [rhaiApiSignatures.ts](../src/visual/rhaiApiSignatures.ts); this document explains its authority and limits.

## Authority and counts

The audited runtime is the locked Rhai **1.25.1**, with default features disabled and `std` enabled. Host registrations come from [nova_script](../crates/nova_script/src/lib.rs). A temporary inspection crate compiles a copy of that source for both native and `wasm32-unknown-unknown`, additionally enabling Rhai's `metadata` feature to inspect inferred Rust closure return types and installed standard packages. It does not change the production crate or its feature set.

Metadata inspection cannot certify runtime behavior. In particular, enabling `metadata` changes some reflection/JSON implementation paths. Execution tests therefore use the actual production `nova_core/pkg` WASM build, independently of the inspection crate.

| Inventory category | Count | Meaning |
|---|---:|---|
| Registered host overloads | 177 | Includes two explicit disabled `sleep` guards and the internal graph trace function |
| Public available host overloads | 174 | Every overload is invoked by the focused WASM verifier |
| Host-dispatched callbacks | 15 | Function declarations whose arguments come from the host |
| Standard-package overloads | 789 | Includes operators, getters/setters, widths requiring opaque values, and profile restrictions |
| Language intrinsics | 7 | Parser-intercepted calls requiring explicit contracts beyond registry metadata |
| Total signature records | 988 | Deduplicated by callable name and actual parameter types, with host dispatch precedence |
| Native-only signatures | 66 | Primarily `i128`/`u128`; omitted from the WASM editor palette |
| WASM-only signatures | 0 | For this locked configuration |
| Current WASM palette definitions | 658 | Available named calls and callbacks; excludes internal symbols and operators |

The existing [script API manifest](../src/editor/scriptApi.ts) contains 169 names, including callbacks. All have a corresponding actual runtime or callback entry. Name counts differ from overload counts. The audit also finds 16 available host names absent from that older manifest: `character_floor_normal_x`, `character_floor_normal_y`, `character_platform_velocity_x`, `character_platform_velocity_y`, `editor_automation`, `editor_create_box`, `editor_create_circle`, `editor_create_text_asset`, `editor_create_triangle`, `editor_rename`, `editor_select`, `editor_selected`, `editor_selected_count`, `export_value`, `vector_x`, and `vector_y`. Their signatures are included in the generated matrix and typed palette.

## Parameters, overloads, defaults and results

`parameters[].type` is a semantic category; `rustType` retains the exact dispatch type. The public categories are `int`, `float`, `bool`, `string`, `char`, `array`, `map`, `dynamic`, `unit`, `fn`, `range`, `timestamp`, `blob`, and `opaque`. An opaque `i32`, `f32`, or `u128` registration is not interchangeable with an ordinary Rhai integer or float. Profile membership is explicit; `available: true` alone does not assert availability in every target.

| Example | Actual contract | Consequence for authoring |
|---|---|---|
| `set_position(x, y)` | `FLOAT, FLOAT -> ()` | `set_position(1.0, 2.0)` executes; integer `1, 2` fails overload lookup |
| `sin(value)`, `cos(value)` | Floating-point package overloads | Recognized and executable with floats; no `clamp` registration exists |
| `export_value(name, value)` | Five separate value overloads | Keep the selected type and literal spelling |
| Entity/component handle calls | A host `Map` carrying a validated handle | A JSON object is not a replacement for a live handle producer |
| `Fn`, closures, `call`, `curry` | Function-pointer values and dynamic dispatch | Callable values are supported; they are not JSON-persistable data |
| `save_set` and similar `Dynamic` inputs | Dynamic input followed by host serialization rules | A closure can pass Rhai dispatch but emit an unsupported-value error log and no command |
| `print`, `debug` | Script-facing result is unit | Registry metadata exposes an internal string formatter; the matrix records unit and preserves the original Rust return metadata |
| Callback declarations | Host arguments; returned value discarded | A callback belongs in a function declaration, not a call to a registered host function |

`defaultLiteral` is an **editor insertion placeholder**, never a claim that a parameter may be omitted at runtime. Ordinary registered overload parameters remain required by arity. Floats use `0.0`; integers use `0`; strings, booleans, arrays and ordinary standard maps have typed literals. Host handle maps, function pointers, timestamps, blobs and opaque values have `null` defaults and require a connected producer. Only ordinary `Range<i64>` and `RangeInclusive<i64>` have integer range placeholders. Other range widths remain required.

`returnType: dynamic` intentionally permits runtime variation. `throws` describes a Rust `Result` or intrinsic failure capability; it is not a complete effect system. Host operations can also record errors in output logs. A queued engine command still requires the game/editor host to apply it.

The seven intrinsic contracts are `Fn`, `type_of`, `is_def_var`, `is_def_fn`, `is_shared`, `call`, and `curry`. `call` and `curry` are variadic after the function-pointer argument. The matrix marks that fact; their initial palette template supplies one editable extra argument. Ordinary typed Call nodes can represent other valid argument counts.

## Standard packages and platform-sensitive operations

The generator inventories the following installed package modules individually and resolves their entries against actual engine dispatch. Exact per-package counts and parameter records remain in the generated JSON; operators and property dispatch names are included there even when they are not standalone palette calls.

| Package | Actual source module | Function families |
|---|---|---|
| LanguageCorePackage | `lang_core.rs` | Core language utility registrations |
| ArithmeticPackage | `arithmetic.rs` | Arithmetic across registered numeric widths |
| BasicFnPackage | `fn_basic.rs` | Function-pointer utilities |
| BasicStringPackage | `string_basic.rs` | Basic strings, formatting and conversion |
| BasicIteratorPackage | `iter_basic.rs` | Iterator and range operations |
| BitFieldPackage | `bit_field.rs` | Integer bit fields |
| LogicPackage | `logic.rs` | Comparisons and logical operators |
| BasicMathPackage | `math_basic.rs` | Floating-point mathematics |
| BasicArrayPackage | `array_basic.rs` | Array mutation, queries and higher-order operations |
| BasicBlobPackage | `blob_basic.rs` | Byte buffers and conversions |
| BasicMapPackage | `map_basic.rs` | Map keys, values and mutation |
| BasicTimePackage | `time_basic.rs` | Timestamps, elapsed time and checked timestamp arithmetic |
| MoreStringPackage | `string_more.rs` | Additional string operations and JSON parsing |

Registry source locations for these packages identify the module, not an individual macro-expanded Rust registration line. Host registrations have their actual source line. Package availability is not a claim that every arbitrary argument combination succeeds; argument validation, bounds, overload types and sandbox limits still apply.

The audit reproduced a WASM panic in standard `sleep` and a blocking native call outside the operation budget. Nova 26.12 disables the symbol and registers explicit integer/float error guards so `Fn("sleep").call(...)` cannot bypass the direct-call prohibition. The parser diagnoses direct use, the palette hides it, and the production verifier rejects direct and indirect calls with both numeric types. Use `task_wait` and `timer_start` for deferred engine work.

`BasicTimePackage` uses the WASM-compatible `web_time` implementation. Fresh, isolated production WASM instances verify `timestamp()`, `elapsed(timestamp)`, the `.elapsed` property, comparisons and future timestamp arithmetic. Subtracting time before the clock's origin can produce a checked runtime overflow; that is an ordinary error, not evidence that timestamps are unavailable. Timestamp values require producer nodes and are not invented as serialized defaults.

`eval` and native `import` remain disabled. Nova's standalone `use "path";` project dependencies are handled by [scriptModules.ts](../src/runtime/scriptModules.ts) in the shared scope, with bounded loading, path validation, cycle detection and dependency deduplication. Their language contract is described in [VERSION_26_12_LANGUAGE.md](VERSION_26_12_LANGUAGE.md). They do not enable native module namespaces or arbitrary dynamic evaluation.

## Lifecycle declarations

All 15 callback names below are dispatched by the actual host and tested with their argument types. A missing optional callback is allowed; a declared callback must use its host-provided parameter contract. These are declarations whose body the author supplies.

| Callback names | Parameters |
|---|---|
| `awake`, `start`, `on_destroy` | None |
| `fixed_update`, `update`, `late_update` | `dt: float` |
| `on_timer`, `on_task` | `name: string` |
| `on_signal` | `name: string, payload: dynamic, source: string` |
| `on_collision_enter`, `on_collision_stay`, `on_collision_exit` | `other: string, px: float, py: float, nx: float, ny: float, rvx: float, rvy: float` |
| `on_trigger_enter`, `on_trigger_stay`, `on_trigger_exit` | `other: string, px: float, py: float, nx: float, ny: float, rvx: float, rvy: float` |

## Project packages and plugins

[packages.ts](../src/runtime/packages.ts) and [plugins.ts](../src/runtime/plugins.ts) deliver graph contributions through [graphCatalog.ts](../src/visual/graphCatalog.ts). Enabled project packages and selected library versions determine the available package contributions; plugin activation and permissions determine plugin contributions.

These contribution manifests describe aliases of existing API callables. They do not register new functions in the Rhai host. WASM plugin callbacks run in their separate plugin instance; an exported plugin callback does not automatically become a callable Rhai symbol. Project Rhai functions can instead be supplied by resolved `use` dependencies and called through ordinary typed Call nodes.

`syntaxExtensionDefinitions(contributions)` matches `api.callable` and the exact number of data inputs against available WASM callable signatures. A verified alias is produced for each matching overload, preserving its package ID, authored description/category and overload identity. Unknown symbols, incompatible arity and disabled calls produce no alias. A `syntaxApiType` points to the actual signature, while `syntaxApiDefaults` contains verified authored insertion literals. The initializer persists ordinary typed Call structure, not an opaque package execution node.

Authored defaults are validated against the selected overload: safe integral numbers for integer pins, finite floating numbers with float spelling, exact booleans, and properly escaped Rhai strings. Dynamic JSON and arrays retain nested values using Rhai array/map syntax. Rendering is bounded to 16 nested levels, 4,096 visited values and 8,192 characters; oversized or incompatible values remain required pins. A serialized object is never accepted as proof of a live handle. These rules may expose an invalid old package default as a required input; they prevent silently emitting the wrong overload or inventing a handle.

## Reproduction and validation boundaries

Regenerate after changes to host registrations, the locked Rhai engine, or its enabled packages:

```powershell
node scripts/generate-rhai-api-signatures.mjs --wasm-bindgen=C:/path/to/wasm-bindgen.exe
```

The supplied executable must match the `wasm-bindgen` version in `Cargo.lock` (currently 0.2.126). The generator also requires the installed Rust native/WASM targets and cached Cargo dependencies; it runs Cargo offline and does not install tools. It writes the generated matrix and a local inspection cache under `target/rhai-api-metadata`. Its temporary copied crate is removed after completion.

```powershell
node scripts/verify-v26.12-language.mjs
node scripts/verify-v26.12-api-signatures.mjs --report=release-audits/v26.12-api-signatures.json
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

The focused API verifier currently passes **204 checks**: every one of the 174 public host overloads executes against the production WASM engine, all 15 callbacks are dispatched, and six fresh module instances test platform-sensitive and representative standard-package behavior. Checks cover source-hash/locked-engine freshness, profile membership, exact numeric overloads, handle requirements, disabled direct/indirect sleep, intrinsic calls, valid insertion literals, and actual delivery of package string/bool/float/nested-data defaults. It also rejects invalid integer, handle and excessive defaults.

Host execution checks establish dispatch and reported return type with controlled arguments. They do not apply queued commands to a live scene or certify every behavioral use of every API. Graph rewiring, saved asset synchronization, editor interactions, representative games and release artifacts have their separate integration and release checks. The language verifier independently executes both original and structurally regenerated source and compares commands, logs and properties; its shared corpus is documented in the language contract.

## Exact edit ledger for this API subtask

1. **Added `scripts/generate-rhai-api-signatures.mjs`:** reproducible native and WASM metadata inspection against a temporary copy of the actual Rust host, pinned binding-tool validation, local evidence cache and generated JSON output. Production Rust features are unchanged by this generator.
2. **Added `scripts/lib/rhaiApiInventory.mjs`:** actual Rust closure parameter extraction, compiler-return matching, native/WASM profile reconciliation, standard package attribution, explicit intrinsic/callback contracts, typed insertion literals and comparison against the older API manifest.
3. **Added `src/visual/rhaiApiSignatures.generated.json`:** complete generated 988-record overload inventory with source provenance and explicit availability/defaults.
4. **Added `src/visual/rhaiApiSignatures.ts`:** public typed matrix contract, signature lookup and safe insertion-template helper.
5. **Added `scripts/verify-v26.12-api-signatures.mjs`:** actual production WASM dispatch/type tests, callback tests, isolated platform probes, source freshness and package alias/default checks, with optional JSON evidence output.
6. **Extended `src/visual/graphSyntaxApi.ts`:** added verified extension alias matching and bounded literal conversion; extended initialization to apply validated authored defaults and retain required pins for invalid values. The underlying typed API palette and graph integration were implemented by the coordinating task.
7. **Added this document:** machine-matrix reference, audit authority, execution boundaries, overload/default/package guidance, reproduction commands and file-level ledger.

The language-core subtask's six-file ledger is in [VERSION_26_12_LANGUAGE.md](VERSION_26_12_LANGUAGE.md). Runtime sleep guards, host module resolution, graph/compiler/catalog integration, Vue panels, version metadata and release artifacts are recorded by their respective owners in the overall 26.12 ledger.
