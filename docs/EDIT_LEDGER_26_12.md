# Nova_A 26.12 edit ledger

This ledger lists the 26.12 / engine 26.12.0 authored edits on top of the complete retained 26.11 ledger. The 26.11 changes remain present; they were not reverted or relabeled as new 26.12 implementation. No existing starter IDs or source files were deleted. Every finalized source path and byte hash is additionally recorded by the immutable release snapshot's deterministic path-level manifest.

## Files changed and files added

The following tables identify each edit and its consequence. The four reference directories at the end enumerate all sixteen added reference files.

## Language, projection and runtime

| File | Change and consequence |
| --- | --- |
| `src/visual/rhaiSyntaxTypes.ts` | New span-bearing typed IR, scopes, bindings, references, diagnostics and explicit parser options/limits. |
| `src/visual/rhaiSyntaxLexer.ts` | New exact token/trivia lexer, Rhai string decoding, source positions and bounded malformed-input recovery. |
| `src/visual/rhaiSyntax.ts` | New parser/binder and source/structural emitters; distinguishes tails, shadowing, closures, receiver methods, exports and host module syntax. |
| `src/visual/rhaiRename.ts` | New pure validator for source-span lexical renames, capture/duplicate rejection, unchanged unrelated bindings and bounded external-reference checks; shared by code and graph authoring. |
| `src/visual/graphSyntax.ts` | New AST-to-node projection and source-preserving emission; full typed regeneration, precise current ranges, initial non-overlap, preserved manual identity, comments, continued strings, required children and cycle/limit rejection. |
| `src/visual/graphSyntaxSchema.ts` | New syntax node schemas/field setters, binding-aware rename with refreshed derived titles, ordered/optional child mutation and stable wire ownership. Bound-name changes validate current emitted lexical identity and a proposed graph before mutation, rejecting capture or duplicate overloads atomically. Output `result` avoids input `value` collisions. |
| `src/visual/graphSyntaxApi.ts` | New overload palette adapters; actual parameter order/default spelling, required opaque inputs, callbacks and ordinary typed node persistence. Verifies project/plugin aliases against actual WASM names/arity and preserves only type-correct bounded authored defaults. |
| `src/visual/rhaiApiSignatures.ts` | New typed inventory API and callable-template helper. |
| `src/visual/rhaiApiSignatures.generated.json` | Generated source dependency containing actual Rust/Rhai overload and package metadata; retained in the authored source snapshot because the frontend imports it. |
| `src/visual/graphCatalog.ts` | Integrates typed syntax and verified overload discovery/creation while retaining the legacy catalog. |
| `src/visual/graphCodeSync.ts` | New default typed companion factory, retained explicit legacy factory, exact typed no-op/source sync, preserved identity/viewport on edits, and legacy rebuild compatibility. |
| `src/visual/graphCompiler.ts` | Validates typed ownership/root/source, rejects mixed legacy declaration tables, emits typed source and current node mappings; retains old execution compilation. |
| `src/visual/graphTypes.ts` | Validates additive language metadata and strict syntax config without stripping control characters or silently truncating source; leaves legacy value normalization intact. |
| `src/runtime/scriptModules.ts` | New pure, bounded, token-aware project dependency bundler with ordered initialization and exact dependency errors. |
| `src/runtime/GameplayRuntime.ts` | Routes text/visual scripts and Inspector exports through the common bundle; path-aware production asset adapter; successful-compilation-only debug registration and contract/cache ordering; read-only bundled-source access for editor diagnostics. |
| `crates/nova_script/src/lib.rs` | Rejects blocking sleep both directly and through indirect function-pointer calls, with native regression; existing timer/task APIs remain available. |

The full language/parser consequences and tests are in VERSION_26_12_LANGUAGE.md. UI-specific consequences and every helper/component behavior are in VERSION_26_12_UI.md. Runtime/release consequences and exact gate contexts are in VERSION_26_12_RELEASE_PLAN.md.

Final rename audit: `graphSyntaxSchema.ts` also accepts the other project scripts for the same bounded external-consumer guard used by Studio/LSP; `verify-v26.12-typed-graphs.mjs` verifies that a shared function rename leaves the entire graph unchanged when another script still calls its old name. Renaming an exported property or an externally referenced shared function requires an explicit project migration rather than a partial local edit.

## Editor controls and source recovery

| File | Change and consequence |
| --- | --- |
| `src/editor/scriptConversionPresentation.ts` | Shared localized conversion messages, current-source review identity, UTF16/textarea range mapping and awaited dirty-save guards. |
| `src/editor/scriptLanguage.ts` | Uses the shared AST/binding analyzer and actual WASM overload completion/hover/hints; preserves resolved module symbols and worker behavior. Replaces regex rename/format mutation with selected lexical identity and safe whitespace helpers; workspace rename passes document/position and external sources. |
| `src/editor/scriptLanguageSyntax.ts` | New typed diagnostic/symbol/token adapter, scope-aware shadow/overload handling, shared pure rename exports, and literal/trivia-preserving formatter. Malformed source remains intact; ambiguous method/export/project migrations are explicitly refused by the shared validator. |
| `src/editor/scriptLanguage.worker.ts` | Carries resolved module symbols through background analysis, preserving the same diagnostics as the synchronous fallback. |
| `src/components/ScriptConversionPanel.vue` | New region classifications, bounded source previews and exact source/node navigation. |
| `src/components/ScriptStudio.vue` | Conversion inspector, draft/range interface, precise diagnostics, failed-save metadata rollback, visible save errors and validity status that includes live syntax errors. |
| `src/components/ScriptWorkspace.vue` | Pre-switch review/reentrancy guards; cancellation or failed save retains the active draft; maps navigation between code and graph. |
| `src/components/VisualGraphEditor.vue` | Typed creation/fields/declaration index, ordered and optional children, shared coverage/navigation, VM validation before persistence and visible pending/failure states. Legacy graph controls remain available for their own representation. |

## Version authorities

`scripts/set-calendar-release.mjs --release=26.12` preflights and updates these exact authorities to 26.12/26.12.0 without changing schema/API versions: `package.json`, `Cargo.toml`, `Cargo.lock`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `src/projects/projectFormat.ts`, `crates/nova_format/src/lib.rs`, `tests/fixtures/migrations/public-schema-expected.json`, and `src/i18n.ts`. It also updates generated `nova_core/pkg/package.json`; the actual WASM is rebuilt and its runtime-reported version is independently checked. Third-party Cargo package versions are retained.

## Verification and delivery scripts

| File | Change and consequence |
| --- | --- |
| `scripts/fixtures/v26.12-rhai-corpus.mjs` | Shared semantic/error corpus for independent parser and graph regeneration. |
| `scripts/verify-v26.12-language.mjs` | Actual VM differential, malformed/truncated/generated input, scope/identity and syntax-limit checks. |
| `scripts/verify-v26.12-language-editor.mjs` | Actual WASM corpus through editor analysis and formatting, lexical rename/capture/external-reference tests, UTF16/CRLF selection and both real LSP transports; emits focused JSON evidence. |
| `scripts/verify-v26.01-visual-roundtrip.mjs` | Selects the retained legacy factory explicitly for historical node/routine/fallback assertions; records the actual executing engine version and scope. The new default AST graph has separate current tests. |
| `scripts/generate-rhai-api-signatures.mjs` | Builds temporary native/WASM copies of actual Rust host with metadata enabled only for inspection, validates pinned binding tooling, caches evidence and generates the complete overload inventory. |
| `scripts/lib/rhaiApiInventory.mjs` | Matches explicit Rust closure parameters to compiler-inferred returns, reconciles profiles/packages, records intrinsic/callback contracts and compares the legacy manifest without guessing types from callable names. |
| `scripts/verify-v26.12-api-signatures.mjs` | Executes all174 public host overloads and15callbacks, isolates platform-sensitive standard calls, checks source/profile freshness, and verifies typed package defaults in actual WASM. |
| `scripts/nova-rhai-language-server.mjs` | Selects rename by URI and UTF16 source offset, returns correct prepare-rename ranges, and uses isolated TypeScript transformation without browser dependency discovery/watchers/HMR that had stalled startup. |
| `scripts/verify-v26.12-typed-graphs.mjs` | Exact/structural graph execution, visual construction with the actual numeric-coordinate factory, rewires, all overload pins/defaults, persistence and diagnostics; selects both shadowed declarations by source position instead of random UUID order and rejects stale WASM identity. Actual VM regressions verify nested capture/duplicate refusal and atomic graph/title/source retention after current edits. |
| `scripts/verify-v26.12-syntax-slots.mjs` | Production slot/optional mutation, real compiler/WASM and save/reload tests. |
| `scripts/verify-v26.12-script-ui.mjs` | Production presentation/save helpers plus mounted Vue component event checks. |
| `scripts/verify-v26.12-authoring.mjs` | Fresh Edge/CDP profile with actual authoring, switching, editing, errors, cancellation, undo, modules and captures. |
| `scripts/verify-v26.12-code-game.mjs` | Adds seven real mouse/keyboard game checks: blank Rectangle creation, Kinematic body selection, exact Rhai editing/saving, Script2D attachment, Play/Space movement, repeated Stop restoration, actual `.nova` download and file-input reopening through the compatibility review. Decodes the downloaded script for exact source equality and records positions, file hash and screenshots. Uses a browser capability flag for the existing download fallback; does not inject engine state or claim native file-picker coverage. |
| `scripts/qualify-layout-v3.3.mjs` | Extends the retained layout harness to execute current calendar versions and requested viewport/scale combinations, with fresh reports and captures. |
| `scripts/verify-v6.0.2-interactions.mjs` | Extends the retained interaction harness to current calendar versions while retaining its actual navigation/settings/drag scope. |
| `scripts/verify-v26.12-script-modules.mjs` | Actual bundler/runtime adapter, graph compiler and WASM parity; missing/cycle/override/bounds and debug-state preservation. |
| `scripts/verify-v26.11-visual-roundtrip.mjs` | Explicitly selects the retained legacy factory so the existing suite continues to qualify that representation. |
| `scripts/generate-rhai-api-signatures.mjs` | Compiler metadata extraction in isolated temporary native/WASM helper builds; production Cargo features are not expanded for introspection. |
| `scripts/lib/rhaiApiInventory.mjs` | Converts real metadata to explicit runtime profiles, parameter/return types, insertion values and disabled/internal distinctions. |
| `scripts/verify-v26.12-api-signatures.mjs` | Checks native/WASM registration metadata, runs public host overloads in the real VM and probes standard-package platform behavior and extension aliases. |
| `scripts/release-source-snapshot.mjs` | Freezes dirty/untracked authored bytes with hashes and explicit generated/private-path exclusions. |
| `scripts/release-qualification.mjs` | Executes explicit fresh gates, preserves failures, verifies source identity and report/log/artifact lineage. |
| `scripts/release-policy.ps1` | Shared sequential-version and embedded Windows product-version policy. |
| `scripts/set-calendar-release.mjs` | Transactional sequential authorities, lockfile package scoping and idempotence. |
| `scripts/prepare-calendar-release.ps1` | Preflight and explicit frozen-candidate qualification entry point. |
| `scripts/generate-calendar-release-evidence.mjs` | Keeps historical evidence generation and routes new releases to their actual executed runs. |
| `scripts/generate-sequential-release-evidence.mjs` | New immutable aggregation of executed source/build/runtime/layout/manual evidence and external limits. |
| `scripts/package-release.ps1` | Exact current binaries/full web inventory/source/evidence verification and atomic eleven-artifact publication; refuses existing final releases. |
| `scripts/verify-release-package.ps1` | Independent package content, versions, checksums and source/execution lineage validation. |
| `scripts/verify-v26.12-release-tooling.mjs` | Temporary-fixture transaction, snapshot, tampering, command/report and package-policy tests. |
| `scripts/generate-release-plan.mjs` | Produces an explicit per-version plan with real contexts and missing-milestone blockers. |
| `scripts/release-milestone-gates.mjs` | Runs fresh existing/focused harnesses, including recorded API overloads, the shared editor/LSP suite and current-source native legacy graph execution. The 26.12 user gate also executes both blank-code and blank-visual game harnesses and retains their fresh reports. Product aggregation lists evaluated gate reports and leaves global defect counts explicitly unknown; does not relabel historical results or claim that all errors are absent. |
| `scripts/verify-calendar-history.mjs` | Generalizes valid sequential version input while retaining historical baseline checks. |
| `scripts/audit-manual.mjs` | Generalizes public labels and cumulative lessons while retaining content/anchor checks. |
| `scripts/generate-v26.12-reference-projects.mjs` | Deterministic three-mode game/authority generation and exact conversion of all shipped Rhai scripts; verify-only mode detects drift. Candidate2 headless repair explicitly assigns the current authority's networking session name and adds `--server-only` for bounded regeneration without rewriting the three game references. |
| `scripts/verify-v26.07-headless.mjs` | Reads the actual decoded package's session identity instead of deriving it from the executable display name. A fourth ephemeral UDP port exercises deliberate wrong-session rejection between successful first connection and reconnect. Writes bounded peer settings from the decoded package and requires zero schema rejections, restored authority baseline, changed replica positions and180 actual local exercise steps. Records configured identities, expected admission and observed baseline/replica state separately from imported authority ticks. Native runtime admission rules remain unchanged. |
| `scripts/network-peer-v6.6.0.mjs` | Optional decoded-package schema/channel/RPC/replication settings argument; initializes real BoxEntity replicas at distinct sentinel positions so baseline application is observable, and suppresses unrelated soak RPCs for that fixture. Existing no-argument soak defaults remain intact. Reports actual local exercise count and replica positions in addition to networking/runtime state. |
| `scripts/generate-v26.12-teaching.mjs` | Adds the same concrete task lesson to English/German/Chinese Markdown and the offline HTML manual. |

## Documentation and references

The first complete native qualification stopped at the rendered-layout gate: the new coverage tab's text exceeded its 31–47px allocated height in all three languages. The failed candidate and reports are retained. `src/components/ScriptStudio.vue` now prevents the tab strip from shrinking and lets tab buttons take their natural wrapped height. The consequence is a slightly taller tab strip when labels need extra lines; no editor state or action changes. `scripts/verify-v26.12-authoring.mjs` adds an eighteenth actual browser scenario measuring tab text at 800×720, 1024×640 and 1600×900. The full three-language layout gate must rerun against candidate 2; this record does not assert its result in advance.

| File | Added or changed content |
| --- | --- |
| `README.md` | Current 26.12 behavior/version and links to current evidence contracts, retaining the historical feature baseline. |
| `docs/IMPLEMENTATION_TRACKER_26_12_TO_26_16.md` | Complete separate milestone requirements and qualification/change discipline. |
| `docs/VERSION_26_12_LANGUAGE.md` | Exact syntax, identity, emitter, sandbox and corpus contracts. |
| `docs/SCRIPT_SUPPORT_MATRIX_26_12.md` | Generated actual overload/package support and remaining boundaries. |
| `docs/VERSION_26_12_UI.md` | UI changes, consequences and actual versus isolated verification scope. |
| `docs/VERSION_26_12_RELEASE_PLAN.md` | Eleven-artifact contract, source isolation, actual gate schema, native prerequisites and runtime findings. |
| `docs/RELEASE_NOTES_26_12.md` | Release behavior, compatibility, qualification meaning and limits. |
| `docs/EDIT_LEDGER_26_12.md` | This exhaustive edit record. |
| `manual/MANUAL.en.md` | English code/visual task, concrete outcomes, recovery, modules and limitations; current heading. |
| `manual/MANUAL.de.md` | Equivalent German lesson and current heading. |
| `manual/MANUAL.zh-CN.md` | Equivalent Chinese lesson and current heading. |
| `manual/index.html` | Equivalent localized lesson integrated with navigation/search, plus current page title. |
| `reference-projects/README.md` | Links and actual scope of the four new references. |

Each of `reference-projects/projects/creator-v2612-code-game/`, `creator-v2612-blocks-game/`, `creator-v2612-mixed-game/` and `server-v2612-headless-authority/` adds exactly four files: `project.nova` (complete authored project), `README.md` (workflow/scope), `expected-output.json` (concrete behavior oracle) and `test-controls.json` (actions and expected outcomes). No historical reference is overwritten. The code/blocks/mixed variants retain the same game logic and differ in the attached source representation.

Candidate2's headless repair changes only `reference-projects/projects/server-v2612-headless-authority/project.nova` content: its inherited `Nova 26.10 Headless Authority` session name becomes `Nova 26.12 Headless Authority`. The server-only generator rewrites that reference's four deterministic files; its README/oracles remain byte-identical. The three current game references and every historical reference remain byte-identical. `docs/VERSION_26_12_RELEASE_PLAN.md` records the observed cause, checks and remaining fixture limitation; this paragraph records that documentation edit and the precise reference change.

Generated outputs are separate: rebuilt `nova_core/pkg`, frontend `dist`, native target/bundle files, fresh `release-audits` reports/logs/captures, immutable `.cache/release-snapshots` and the eleven finalized `releases/v26.12` artifacts. Their existence and qualification must be read from the executed results; listing an output here is not a claim that it already passed.

### Candidate 4: packaging parameter regression

- `scripts/package-release.ps1`: renamed the parsed manifest variable and its source-inventory/evidence references to `frozenSourceManifest`. PowerShell's case-insensitive variable binding collided with the typed string `SourceSnapshot` parameter, converting the parsed object back to a string and rejecting the correct candidate. The path parameter, frozen identity policy and immutable publishing rules remain intact; no output had been published.
- `scripts/verify-v26.12-release-tooling.mjs`: executes the packager's actual parameter block, manifest-read statement and identity assertion against a temporary frozen snapshot, also checking that the string parameter remains unchanged. This reproduces the failed packaging path without substituting a source-only string assertion.
- This ledger records the late failure. Candidate 3's21passing gate results remain retained, but packaging source changes require a new immutable snapshot and full candidate4qualification before publication.

### Candidate 5: release documentation contracts

The independent archive verifier rejected missing spaces in the three game-reference READMEs. `scripts/generate-v26.12-reference-projects.mjs` and each code/blocks/mixed README now emit `Project Format 2/schema 29`; project/oracle/control bytes remain unchanged. `scripts/verify-v26.12-release-tooling.mjs` now exercises the actual independent verifier’s ledger/reference validation fragment against all current authored references before release freezing. This ledger also includes a deduplicated bullet index required by that verifier. The previous generated-only index and failed package attempts remain recorded; no final release was published. No engine, user project, UI or schema behavior changes.

## Deterministic path-level edit index

These unique paths expand the tables, authority list and reference directories above. Descriptions above record each edit and its consequence; the immutable source manifest supplies exact byte hashes, including this ledger without circular self-hashing.

- `Cargo.lock` — Edit and consequence recorded above.
- `Cargo.toml` — Edit and consequence recorded above.
- `README.md` — Edit and consequence recorded above.
- `crates/nova_format/src/lib.rs` — Edit and consequence recorded above.
- `crates/nova_script/src/lib.rs` — Edit and consequence recorded above.
- `docs/EDIT_LEDGER_26_12.md` — Edit and consequence recorded above.
- `docs/IMPLEMENTATION_TRACKER_26_12_TO_26_16.md` — Edit and consequence recorded above.
- `docs/RELEASE_NOTES_26_12.md` — Edit and consequence recorded above.
- `docs/SCRIPT_SUPPORT_MATRIX_26_12.md` — Edit and consequence recorded above.
- `docs/VERSION_26_12_LANGUAGE.md` — Edit and consequence recorded above.
- `docs/VERSION_26_12_RELEASE_PLAN.md` — Edit and consequence recorded above.
- `docs/VERSION_26_12_UI.md` — Edit and consequence recorded above.
- `manual/MANUAL.de.md` — Edit and consequence recorded above.
- `manual/MANUAL.en.md` — Edit and consequence recorded above.
- `manual/MANUAL.zh-CN.md` — Edit and consequence recorded above.
- `manual/index.html` — Edit and consequence recorded above.
- `package.json` — Edit and consequence recorded above.
- `reference-projects/README.md` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-blocks-game/README.md` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-blocks-game/expected-output.json` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-blocks-game/project.nova` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-blocks-game/test-controls.json` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-code-game/README.md` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-code-game/expected-output.json` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-code-game/project.nova` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-code-game/test-controls.json` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-mixed-game/README.md` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-mixed-game/expected-output.json` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-mixed-game/project.nova` — Edit and consequence recorded above.
- `reference-projects/projects/creator-v2612-mixed-game/test-controls.json` — Edit and consequence recorded above.
- `reference-projects/projects/server-v2612-headless-authority/README.md` — Edit and consequence recorded above.
- `reference-projects/projects/server-v2612-headless-authority/expected-output.json` — Edit and consequence recorded above.
- `reference-projects/projects/server-v2612-headless-authority/project.nova` — Edit and consequence recorded above.
- `reference-projects/projects/server-v2612-headless-authority/test-controls.json` — Edit and consequence recorded above.
- `scripts/audit-manual.mjs` — Edit and consequence recorded above.
- `scripts/fixtures/v26.12-rhai-corpus.mjs` — Edit and consequence recorded above.
- `scripts/generate-calendar-release-evidence.mjs` — Edit and consequence recorded above.
- `scripts/generate-release-plan.mjs` — Edit and consequence recorded above.
- `scripts/generate-rhai-api-signatures.mjs` — Edit and consequence recorded above.
- `scripts/generate-sequential-release-evidence.mjs` — Edit and consequence recorded above.
- `scripts/generate-v26.12-reference-projects.mjs` — Edit and consequence recorded above.
- `scripts/generate-v26.12-teaching.mjs` — Edit and consequence recorded above.
- `scripts/lib/rhaiApiInventory.mjs` — Edit and consequence recorded above.
- `scripts/network-peer-v6.6.0.mjs` — Edit and consequence recorded above.
- `scripts/nova-rhai-language-server.mjs` — Edit and consequence recorded above.
- `scripts/package-release.ps1` — Edit and consequence recorded above.
- `scripts/prepare-calendar-release.ps1` — Edit and consequence recorded above.
- `scripts/qualify-layout-v3.3.mjs` — Edit and consequence recorded above.
- `scripts/release-milestone-gates.mjs` — Edit and consequence recorded above.
- `scripts/release-policy.ps1` — Edit and consequence recorded above.
- `scripts/release-qualification.mjs` — Edit and consequence recorded above.
- `scripts/release-source-snapshot.mjs` — Edit and consequence recorded above.
- `scripts/set-calendar-release.mjs` — Edit and consequence recorded above.
- `scripts/verify-calendar-history.mjs` — Edit and consequence recorded above.
- `scripts/verify-release-package.ps1` — Edit and consequence recorded above.
- `scripts/verify-v26.01-visual-roundtrip.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.07-headless.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.11-visual-roundtrip.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-api-signatures.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-authoring.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-code-game.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-language-editor.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-language.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-release-tooling.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-script-modules.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-script-ui.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-syntax-slots.mjs` — Edit and consequence recorded above.
- `scripts/verify-v26.12-typed-graphs.mjs` — Edit and consequence recorded above.
- `scripts/verify-v6.0.2-interactions.mjs` — Edit and consequence recorded above.
- `src-tauri/Cargo.lock` — Edit and consequence recorded above.
- `src-tauri/Cargo.toml` — Edit and consequence recorded above.
- `src-tauri/tauri.conf.json` — Edit and consequence recorded above.
- `src/components/ScriptConversionPanel.vue` — Edit and consequence recorded above.
- `src/components/ScriptStudio.vue` — Edit and consequence recorded above.
- `src/components/ScriptWorkspace.vue` — Edit and consequence recorded above.
- `src/components/VisualGraphEditor.vue` — Edit and consequence recorded above.
- `src/editor/scriptConversionPresentation.ts` — Edit and consequence recorded above.
- `src/editor/scriptLanguage.ts` — Edit and consequence recorded above.
- `src/editor/scriptLanguage.worker.ts` — Edit and consequence recorded above.
- `src/editor/scriptLanguageSyntax.ts` — Edit and consequence recorded above.
- `src/i18n.ts` — Edit and consequence recorded above.
- `src/projects/projectFormat.ts` — Edit and consequence recorded above.
- `src/runtime/GameplayRuntime.ts` — Edit and consequence recorded above.
- `src/runtime/scriptModules.ts` — Edit and consequence recorded above.
- `src/visual/graphCatalog.ts` — Edit and consequence recorded above.
- `src/visual/graphCodeSync.ts` — Edit and consequence recorded above.
- `src/visual/graphCompiler.ts` — Edit and consequence recorded above.
- `src/visual/graphSyntax.ts` — Edit and consequence recorded above.
- `src/visual/graphSyntaxApi.ts` — Edit and consequence recorded above.
- `src/visual/graphSyntaxSchema.ts` — Edit and consequence recorded above.
- `src/visual/graphTypes.ts` — Edit and consequence recorded above.
- `src/visual/rhaiApiSignatures.generated.json` — Edit and consequence recorded above.
- `src/visual/rhaiApiSignatures.ts` — Edit and consequence recorded above.
- `src/visual/rhaiRename.ts` — Edit and consequence recorded above.
- `src/visual/rhaiSyntax.ts` — Edit and consequence recorded above.
- `src/visual/rhaiSyntaxLexer.ts` — Edit and consequence recorded above.
- `src/visual/rhaiSyntaxTypes.ts` — Edit and consequence recorded above.
- `tests/fixtures/migrations/public-schema-expected.json` — Edit and consequence recorded above.
