# Nova_A 26.12–26.16 release preparation and runtime findings

Status on 2026-09-05: release tooling implemented and tested against temporary fixtures. **No real 26.12–26.16 release has been frozen, completely qualified or packaged by this tooling work.** The current source authority is **26.12 / 26.12.0**, advanced by the integration owner, with actual WASM rebuilt to 26.12.0; targeted runtime verification is recorded below. Later milestones must be implemented in sequence, as specified in `ROADMAP_26_11_TO_26_20.md`.

## Release contract and current prerequisites

The existing `instructions.txt`, package script and independent verifier agree on eleven files directly inside `releases/v26.12` (substitute each later public label):

1. `EDIT_LEDGER.md`
2. `LICENSE.md`
3. `Nova_A-v26.12-reference-projects.zip`
4. `Nova_A-v26.12-release-evidence.zip`
5. `Nova_A-v26.12-source.zip`
6. `Nova_A-v26.12-web.zip`
7. `Nova_A-v26.12-windows-x64.msi`
8. `Nova_A-v26.12-windows-x64-portable.exe`
9. `Nova_A-v26.12-windows-x64-setup.exe`
10. `RELEASE_NOTES.md`
11. `SHA256SUMS.txt`

The eleven-file contract remains provisional pending the user's missing reference image. It contains a portable executable, not a portable ZIP. The multilingual offline manual is included in the web/evidence payloads; there is no twelfth root manual artifact. Checksums cover the ten non-circular payloads. Archive entry ordering is ordinal and ZIP timestamps are fixed; native builds are not claimed reproducible across machines.

Read-only inspection found `releases/` empty. The available `src-tauri/target/release/nova_a.exe` has ProductVersion **26.6.0**, and the installed MSI database reader independently returned **26.6.0** for its corresponding historical installer. Historical bundle files are unsuitable for a new release even if renamed. No new installer was built or launched during this tooling task.

Real packaging requires the current portable editor, exact-version NSIS setup and MSI, built `dist/index.html` and `dist/player.html` plus their complete assets, current reference projects, four manual files, release notes/ledger, benchmarks/stability reports, structured evidence, project/license/config files and the three installed font license files. `package-release.ps1` packages verified existing builds; it does not build the engine.

The native build uses `scripts/run-tauri.mjs`, which directs Cargo to a managed `.cache/tauri-target` cache and copies successful outputs into `src-tauri/target/release`. Tauri's before-build command invokes the frontend/WASM build. Existing native output directories retain old installers, so exact file names and embedded product versions must both agree. Build only one candidate at a time against shared `dist`, WASM and Cargo outputs. MSVC, Windows SDK, WiX/NSIS and WebView2 availability must be demonstrated by an actual build and smoke run, not inferred from old files.

Use the repository pins: Node **22.22.2**, pnpm **10.30.0**, Rust/Cargo **1.92.0** as currently installed/configured. This desktop shell exposes a different Node/pnpm by default; the integration owner has a pinned invocation. Set the intended tool executables/PATH before running the release commands. A missing or incompatible local tool remains a failed/blocked gate. The helper accepts explicit command files and argument arrays and never installs dependencies automatically.

## Source and release isolation

Public labels are ordered `YY.SS` sequences, with years 26–99 and sequences 01–99. Therefore 26.13–26.16 are valid and map to 26.13.0–26.16.0; these are not Gregorian months. Legacy three-part release labels and 26.08–26.10 generation paths remain supported.

The new source inventory reads the filesystem, including uncommitted modifications and untracked authored files. It does not use `git archive HEAD`, which would discard the ongoing audit changes. Its explicit policy excludes dependency/build/cache folders, release output and qualification reports, staging, local instructions, common credentials/private-key files, private `.env` files and symbolic links. `.env.example`, documentation, authored references and CI configuration are retained. The policy implements the relevant current repository exclusions; it does not interpret arbitrary future `.gitignore` extensions. Review new ignore rules when adding a new generated or private path.

From 26.12 onward, `nova_core/pkg` is a generated build product and is excluded from the authored snapshot/source archive. A clean source snapshot can be versioned without that folder; `wasm-pack` recreates it. Its packaged WASM bytes are bound through the full web build inventory, while the source and lockfiles establish compiler inputs. Earlier evidence/source inventories retain their existing policy.

Every snapshot contains a sorted list of paths, byte counts and SHA-256 hashes. The digest hashes those exact entries. Creation verifies both the copied files and the working source before promoting the snapshot directory. Existing snapshots and final releases are never replaced. Failed candidates can be retained and a new candidate name selected, rather than deleting evidence of the prior source.

## Per-version sequence

For each milestone, finish its implementation, focused programmer and user review, translations, manual, references, release notes and exhaustive edit ledger. Select the version only after integration is ready to build a release candidate. Do not start editing the next milestone until the current candidate is packaged and independently verified, or preserve/rebuild from its isolated source directory with separate build outputs and dependencies.

These are invocation templates, not recorded passes:

```powershell
# Only at the coordinated version-selection gate:
node scripts/set-calendar-release.mjs --release=26.12

# Complete manual/reference/documentation generation before this step.
node scripts/release-source-snapshot.mjs --release=26.12

# The JSON plan must describe real, currently executable gates and reports.
node scripts/release-qualification.mjs --plan=release-audits/v26.12-qualification-plan.json

# Use the exact runRoot printed by the previous command.
node scripts/release-qualification.mjs --verify=release-audits/qualification-v26.12-RUN-ID
node scripts/generate-calendar-release-evidence.mjs --release=26.12 --engine=26.12.0 --run=release-audits/qualification-v26.12-RUN-ID

# This builds no binaries: all inputs must have passed the recorded build/smoke gates.
pwsh -File scripts/package-release.ps1 -Version 26.12.0 -ReleaseLabel 26.12
pwsh -File scripts/verify-release-package.ps1 -Version 26.12 -MachineVersion 26.12.0
```

`prepare-calendar-release.ps1 -Release 26.12 -QualificationPlan <path>` is an alternate runner entry point after the version and snapshot steps. It performs no implicit version selection for new releases. Legacy preparation now preflights all required package commands before any setter/generator runs.

If a gate finds a source defect, retain the old snapshot and run directory, fix/review the defect, and freeze `--candidate=candidate-2`. Set the next plan's `sourceSnapshot` to `.cache/release-snapshots/v26.12-candidate-2/snapshot.json`; pass the same path to package `-SourceSnapshot`. Never reuse old qualification results after authored source changes. Existing successful evidence and `releases/v26.12` deliberately refuse overwrite; a published version is immutable.

## Explicit qualification plan

The plan schema is exported/validated by `scripts/release-qualification.mjs`:

```json
{
  "format": "nova-release-qualification-plan",
  "version": 1,
  "release": "26.12",
  "machineVersion": "26.12.0",
  "releaseNotes": "docs/RELEASE_NOTES_26_12.md",
  "editLedger": "docs/EDIT_LEDGER_26_12.md",
  "documentation": ["docs/VERSION_26_12_RELEASE_PLAN.md"],
  "gates": []
}
```

An empty list intentionally fails validation. Required IDs are `focus`, `typescript`, `rust`, `rust-lint`, `native-rust`, `wasm`, `web`, `native-build`, `history`, `templates`, `product`, `browser-layout`, `layout-contract`, `user-interactions`, `windows`, `headless`, `performance`, `stability`, `security`, `hygiene`, `manual`. Additional gates are allowed. Commands execute sequentially with the project root as working directory and no shell interpolation. On Windows, invoke Node with the pinned pnpm JavaScript entry point, or invoke an explicit PowerShell script; a `.cmd` file is not a portable executable for `spawn` with `shell: false`.

Each gate needs:

- `id`, `category` (`programmer`, `user`, `environment`) and a specific `context` stating what host, behavior and scope is actually exercised. Browser layout, user interactions, Windows and headless smoke require the `user` category. This categorization does not itself prove coverage.
- `command: {"file": "absolute-or-PATH-executable", "args": ["separate", "arguments"]}`. A missing environment can instead use `blockedReason`; that produces `context-blocked`, stops the run and prevents qualification.
- `reports` with `path` relative to the project, evidence `target`, exact actual `format` and numeric `version`, and explicit `requireRelease`/`requireEngine` booleans. `reportTargets` defines mandatory baseline targets. Reports must say `status: passed`, must be generated during their own recorded command, and must match the requested release/engine whenever those fields exist or are required. Merely copying an old report fails freshness/authority checks. Command-only compiler/build checks retain their actual logs; the baseline verification target still needs a real report writer.
- `artifacts` where produced, with stable `name` and project-relative `path`. The six exact names are `web-editor`, `web-player`, `windows-editor`, `windows-nsis`, `windows-msi`, `windows-headless-authority`. Record them after the last build that produces those bytes. The web editor artifact also records every `dist` file, so stale JavaScript/WASM cannot hide behind unchanged HTML.

Windows smoke reports must hash the actually exercised native files as `artifacts` entries named `editor`, `setup`, `msi`; headless smoke must hash its actual `artifact`. These hashes and byte counts must agree with the executed build gates. Do not mark installed/interactive lifecycle coverage passed solely because a binary exists.

The runner records source identity before/after each gate, command, exit code, log bytes/hash, copied reports, artifact bytes/hash and context. Failure stops the run while retaining previous results; unrun gates remain unclaimed. Aggregation verifies the exact run, retains raw reports/logs and copies the authored ledger rather than inventing a cumulative list. Source generators that mutate documentation/references after freezing invalidate the candidate. Newly added version-specific report writers, reference generators and focused checks must be implemented; the tooling does not manufacture them by relabeling old schemas.

Aggregation keeps signing, clean-machine lifecycle, second-machine reproducibility, Linux/macOS matching hosts, Android hardware/store, Firefox/WebKit, assistive technology, independent usability, low-end hardware, hostile public networking, independent security review, adoption and 72-hour soak explicitly pending. Local completion is not external certification.

## Actual Rhai runtime baseline

This matrix comes from installed Cargo sources, Nova_A registration/context code and direct executions in the current WASM VM, not from generic Rhai documentation. Cargo declares Rhai 1.25.0-compatible with default features disabled and `std` enabled; the lockfile resolves 1.25.1. Disabling default features here does not disable arrays, maps, functions or closures.

| Construct/behavior | Observed runtime behavior and limits |
| --- | --- |
| Arrays/maps | Indexed assignment and dot-property compound assignment execute; a probe produced `11` after mutating both containers. |
| Functions/pointers | Normal helper functions and `Fn("name").call(...)` execute; a doubled value probe logged `6`. |
| Closures | Local capture and `.call` execute; captured `4` plus argument `3` logged `7`. Closures cannot be serialized into persistence/export data. |
| Switch and loops | Switch expression, `do … until`, and existing supported control flow execute; probes produced `20` and `2`. |
| Errors | `try`/`throw`/`catch` execute; a caught string logged `bad`. VM exceptions are distinct from host error logs. |
| Interpolation | Backtick interpolation executed and logged `value 4`. |
| Numeric overloads | `set_position(1, 2)` fails because that registered overload expects floats; `set_position(1.0, 2.0)` is the applicable spelling. Generic “Number” API descriptors do not prove both integer and floating overloads. |
| Persistence | `save_set` of a closure can return an execution envelope containing an error log and no command; comparing only thrown errors misses it. |
| Modules | Native VM `import` is disabled. The frontend currently provides project-local `use` concatenation; see the module finding below. |
| Dynamic evaluation/sleep | `eval` is disabled. Blocking `sleep` was found to trap in WASM and block native execution; the repair below disables direct calls and rejects both integer/floating indirect function-pointer calls. `await` is reserved/unavailable. No direct filesystem, network or process access is registered. |
| Exports/state | Export properties are serialized across callbacks. Raw function return values are discarded by the execution envelope. JSON cannot preserve function/closure identities. |
| Context mutations | Host commands are queued. Context queries refer to the supplied callback snapshot, not necessarily a read-after-write application of earlier queued commands. |

Configured limits: 100,000 operations, 32 call levels, expression depth 64 globally/32 inside functions, 262,144 string bytes, 8,192 array items, 4,096 map entries, 4,096 queued host commands and 512 logs. These are actual sandbox bounds, not a claim that arbitrary user programs terminate within a wall-clock deadline.

Differential tests should compare the execution envelope's commands, logs, serialized exported properties and success/error channel. Remove nondeterministic `graphTrace.durationMicros` from value comparisons while independently checking trace identities. Whitespace/source-span movement may legitimately change reported error positions; error kind/behavior must still agree. Test float/integer boundaries, declaration/assignment unit tails, short-circuit side effects, shadowed scopes, function/closure captures, array/map/property writes, control flow and intentional host failures. Exact original-source emission alone is not a semantic test.

The native test CLI discovers `test_*` functions, reads metadata/fixtures, supports filters/shards/retry policy and JSON/JUnit output. It is not currently a complete differential channel recorder: raw returns and ordinary command/log output are discarded, exported properties are carried through fixture callbacks, error logs fail, hooks currently run per test, teardown after failure is incomplete, wall timeout is checked after callbacks and coverage is based on discovered functions. A zero-selected-test success is insufficient coverage. Use actual VM envelope execution for parser/emitter equivalence.

## Host module finding before repair

The original `GameplayRuntime.resolveScriptBundle` recognized only standalone `use "path";` lines (also single quotes/backticks and an optional semicolon). It resolved `Assets/...` or `Assets/Scripts/...`, optionally appended `.rhai`, recursively concatenated dependencies before the root into one scope and rejected missing modules/cycles. There were no alias or namespace semantics. Its regex could mistake comment contents for directives; traversal lacked explicit count/depth/combined-size bounds. The visual-script branch returned compiled graph source before dependency resolution, creating a text/visual runtime difference. The follow-up below repairs these findings; native `import` remains unavailable.

## Tooling edit ledger and consequences

| File | Every change in this release-tooling task | Consequence |
| --- | --- | --- |
| `scripts/release-policy.ps1` (new) | Shared sequence parsing/canonical labels; exact PE product-version validation; read-only MSI ProductVersion reader; combined Windows checks. | 26.13–26.16 work; version-prefix impostors and stale renamed binaries fail. MSI validation needs Windows Installer COM on Windows. |
| `scripts/set-calendar-release.mjs` | Generalized supported version values; restricted Cargo lock updates to Nova packages; optional absent generated WASM metadata; retained preflight/idempotent transaction. | Third-party packages sharing an old version are not rewritten. Clean source without `pkg` can be prepared. Setter was tested only in temporary fixtures. |
| `scripts/prepare-calendar-release.ps1` | Explicit sequence validation/focus override; preflight legacy command set; new-release explicit qualification-plan branch. | Missing version gates fail before authority mutation. New release preparation requires a frozen candidate and explicit plan. |
| `scripts/release-source-snapshot.mjs` (new) | Version/source authority validation, explicit source selection, hash inventory/digest, verified immutable copy, candidate IDs, CLI create/verify. | Dirty and untracked authored files are preserved; changed source cannot reuse old qualification. Adds ignored snapshot disk usage. |
| `scripts/release-qualification.mjs` (new) | Required gate/report/artifact plan validation, sequential execution/logging, blocked/failure retention, immutable source checks, copied reports, full web output hashes, local and packaged revalidation. | No old relabeled or unrun gate becomes a pass. A real complete plan and environment are still required. |
| `scripts/generate-sequential-release-evidence.mjs` (new) | Aggregates verified new-release runs, native smoke/build hash binding, raw logs/reports, snapshot, authored notes/ledger/manual/docs, honest external pending gates; refuses previous successful evidence replacement. | A malformed/incomplete run cannot produce a qualified evidence archive. Failed staging is retained for diagnosis under ignored audits. |
| `scripts/generate-calendar-release-evidence.mjs` | Routes 26.12+ through the explicit run-based generator after matching request/plan identity; retains historical 26.08–26.10 logic. | New milestones cannot be produced by substituting version strings in historical reports. |
| `scripts/package-release.ps1` | Uses shared policy; exact native versions; frozen authored inventory/source digest from 26.12; full qualification recheck before/after packaging; optional candidate snapshot; refuses existing releases; atomic final directory move. | No stale native/web/source mixing and no automatic replacement of an existing final version. Still produces the existing eleven real payloads. |
| `scripts/verify-release-package.ps1` | Uses shared sequence/native policy; checks portable, setup and MSI; verifies packaged snapshot, execution/report/log lineage and every qualified web asset for 26.12+. | A self-consistent ZIP checksum alone cannot hide a mismatch with the executed candidate. Requires Node and PowerShell/Windows native metadata support. |
| `scripts/verify-v26.12-release-tooling.mjs` (new) | Temporary source/version/command/evidence fixtures and negative regressions. | Exercises the new pipeline's invariants without changing actual authorities, source snapshots or releases. |
| `docs/VERSION_26_12_RELEASE_PLAN.md` (new) | This factual release/runtime review, command/schema instructions and per-file ledger. | Documents limits and remaining real release work; does not certify future versions. |

Validation: the focused tooling verifier passed **76 checks** on 2026-09-05, including five later-version setter transitions, source exclusions/untracked retention, immutable candidates, 21 actual fixture child commands, changed log/native/web output rejection, packaged lineage and context-blocked behavior. Node syntax checks passed for the new helpers. PowerShell parser reported zero errors for the four changed/added PS1 scripts. A read-only MSI metadata lookup returned the historical 26.6.0 version. An initial fixture run stopped at the Windows PowerShell execution-policy restriction; the final fixture uses the already available `pwsh` host and passed. These are tooling regressions, not 76 real user flows or a real release qualification.

## Host module repair: additional edits and validation

Consequences were assessed before editing: one resolver must supply identical executable source to text, visual graph, Inspector property synchronization and candidate validation; unsupported aliases/imports remain rejected; overlarge dependency trees need an explicit bounded failure. Reading/validating a candidate must not replace the debug mappings or cached VM program used by a currently running graph.

| Additional file | Every module-repair edit | Consequence |
| --- | --- | --- |
| `src/runtime/scriptModules.ts` (new) | Shared pure resolver; uses production lexer tokens to recognize actual whole-line `use` declarations while ignoring comments/string text; retains literal paths/slash normalization/extension lookup/shared scope/order/dedup; adds module-scope/noalias/nointerpolation/import errors with asset/line/column; bounded count/depth/source/combined text/visual document; strips directives without removing line breaks; neutralizes newlines in diagnostic source headers. | Both authoring modes resolve the same project-local text modules. Default limits: 256 total modules, depth 32, one million UTF-16 units per executable module and bundle, 16,777,216 units per visual document. Existing unbounded extreme bundles now fail explicitly. No VM/asset/debug state is changed by resolution. |
| `src/runtime/GameplayRuntime.ts` | Delegates text and visual bundle paths to the shared resolver; routes Inspector export synchronization through that same bundle; registers graph debug documents only after successful cached compilation (including successful unchanged-source reuse); validates script contracts before replacing compiled cache state. | Visual `use` now executes and module exports appear consistently in Inspector. Failed candidate validation, missing modules, VM compile errors or rejected contracts preserve previously active debug/cache state. Existing frame-boundary hot-reload, play/stop and rollback entry points remain responsible for their lifecycle; no source is persisted by the resolver. |
| `scripts/verify-v26.12-script-modules.mjs` (new) | Invokes the actual production GameplayRuntime resolver/compile/export methods with fixture asset IO and unrelated scene/audio/network dependencies isolated; retains real lexer, graph importer/compiler and current WASM VM. Covers text/visual envelope equality, path forms, inert comments/strings, initialization dedup/order, cycles/missing/imports/aliases, overrides, failed overrides/debug preservation, cached contract rejection, export synchronization and bounds. | Tests runtime behavior instead of an extracted duplicate method. Reports are fresh under `release-audits`; browser play/stop and persisted edit workflows remain separate user gates. |
| `docs/VERSION_26_12_RELEASE_PLAN.md` | Adds the module findings, exact new-file/edit ledger and qualification limits. | Keeps the initial finding distinguishable from its implemented repair. |

The module verifier writes format `nova-v26.12-script-module-verification`, version 1, current package engineVersion, actual runtimeEngineVersion and a fresh generatedAt. Its initial development run used the existing 26.10.0 WASM. After the owner's 26.12.0 rebuild, the strengthened suite passed **20 checks**, including exact VM/package identity and the real AssetDatabase boundary. Vue/TypeScript typecheck passed after resolver/debug/export integration; the final path-lookup change is also covered by the integration owner's checks. Browser play/stop remains a separate user gate.

Independent UI review found that the original AssetDatabase `resolveAsset` accepts UUID/asset references only, although the old module implementation passed it project paths. The first fixture host supported both and therefore failed to expose this integration defect. The production adapter now explicitly falls back to `assetState.records` by exact path. The verifier now imports the real AssetDatabase, inserts fixture records and proves both the UUID-only database behavior and successful runtime dependency-path resolution. This distinction is retained in its coverage statement; unrelated scene/audio/network subsystems remain isolated.

## Blocking sleep repair

`crates/nova_script/src/lib.rs` adds `disable_symbol("sleep")` to the base engine and registers rejecting integer/floating overloads so `Fn("sleep").call(...)` cannot bypass the syntax restriction. Existing timer/task scheduling remains available. A focused native regression runs four direct/indirect calls with zero arguments and confirms errors mentioning sleep; it passed one test (four call paths), and `cargo fmt --all -- --check` passed. The owner's WASM rebuild was then exercised by the new WASM gate: actual command/log execution, exact 26.12.0 identity and all four nonblocking sleep rejections passed. These errors are expected runtime limits, not WebAssembly traps. The first test invocation used an over-specific filter and selected zero tests; it was rerun with the correct filter and actually executed the regression.

## Executable per-milestone plans and fresh report writers

Two new files, `scripts/generate-release-plan.mjs` and `scripts/release-milestone-gates.mjs`, turn the plan schema into concrete commands. The generator writes a plan under ignored `release-audits` and performs no version change, snapshot or build. The writer validates current source authorities and executes the real existing harnesses for history, template catalog, layout contract, rendered layout, mouse/keyboard interactions, native Windows export/launch smoke, loopback headless authority, performance, bounded stability, dependency lock hygiene and manual coverage. It wraps actual compiler/focused results with their commands and preserves raw child report contents and schema identities; it never changes an old report's release field to make it current.

Plan order is native build → actual WASM/web checks → compiler/Rust/focused checks → history/templates/layout/browser/native behavior/performance/stability/security/hygiene/manual → product aggregation. Native artifact capture and the complete web inventory bind subsequent behavior and packaging to the final build. Additional current authoring checks run alongside the common user-interaction harness. For 26.13–26.16, absent new focused or browser-authoring suites are explicitly `context-blocked` until that milestone implements them; supply the authored paths through `--focus`, `--authoring` and `--authoring-report`.

The actual prepared plan is `release-audits/v26.12-qualification-plan.json`. It uses `C:/nvm4w/nodejs/node.exe` (22.22.2), the verified cached pnpm 10.30 JavaScript entry, and its `.bin` wrapper directory. The native writer verifies the exact Node/pnpm pins and prepends both directories to the child PATH so Tauri's `pnpm build` also uses those pins. That host requires the integration owner's normal escalated execution environment; this plan does not bypass the environment's approval controls.

To regenerate with another verified installation:

```powershell
node scripts/generate-release-plan.mjs --release=26.12 --node=C:/path/to/node.exe --pnpm-entry=C:/path/to/pnpm/bin/pnpm.cjs --pnpm-bin=C:/path/to/node_modules/.bin
```

The prepared 26.12 plan has 21 gates and no missing-command configuration blocks, but has not run as a frozen release qualification. It expects the current mixed game and `server-v2612-headless-authority` reference. The native smoke helper hashes NSIS/MSI and checks editor/exported-game process liveness; it does **not** perform installer installation/uninstallation or prove all game behavior. The current bounded stability helper exercises cloned project data, hashing/corrupt JSON and isolated WASM plugin faults; its `playStopCycles` field is not a count of actual editor play/stop button presses. Both limitations are explicit in plan contexts. History's JSON round-trip checks are structural; actual interactive migrations remain separate. Performance retains explicit unavailable interactive native/GPU metrics. No named limitation was silently converted to a pass.

Additional exact edits:

- `scripts/verify-calendar-history.mjs`: replaces the 26.08–26.10 input allowlist with shared exact sequence/machine validation. Every retained history/document/schema/authority/transaction/current-reference check remains intact.
- `scripts/audit-manual.mjs`: derives canonical public labels for later sequence versions and requires all cumulative 26.08/26.09/26.10 lessons for 26.10 and later. Existing component/concept/task-size/anchor/HTML checks remain intact.
- `scripts/release-milestone-gates.mjs` (new): implements the concrete sequential gate commands, pinned native tool selection, actual WASM guard probe, fresh child report capture, common plus current authoring workflows and honest product aggregation.
- `scripts/generate-release-plan.mjs` (new): emits the 21-gate plan in dependency order with exact schemas, native/web/headless artifacts, explicit observed scopes and future-suite blocks.
- `scripts/verify-v26.12-release-tooling.mjs`: adds generated plan/order/future-block/pinned-command/scope and standard SSH/cloud credential exclusion regressions; the focused fixture total is now **90 passed checks**.
- `scripts/verify-v26.12-script-modules.mjs`: adds VM version identity and real AssetDatabase path-boundary regressions; total **20 passed checks** on rebuilt 26.12.0.
- `src/runtime/GameplayRuntime.ts`: adds the exact project-path fallback described above; general AssetDatabase lookup semantics are preserved.
- `crates/nova_script/src/lib.rs`: adds the direct/indirect blocking sleep guard and its actual native regression.
- `docs/VERSION_26_12_RELEASE_PLAN.md`: records these implementation changes, accurate executed checks, invocation details and remaining user/environment limits.

Ignored outputs added/refreshed by these checks: the executable 26.12 qualification plan, a fresh targeted `v26.12-wasm.json` gate report, and the focused module/history reports. The generalized history check passed 237 projects and 596 structured fixtures. A targeted manual invocation initially failed because the new manual did not yet contain the retained canonical `Engine: **26.12.0**` marker. **Resolved:** the integration owner corrected the generator/HTML label and confirmed that the same complete manual audit passes, with no audit requirement removed. The owner also corrected the ledger's retained version and deterministic path-manifest packaging markers. No source snapshot, native release build, complete executed-gate certificate or final release directory was produced by these preparation steps.

Final focus-gate refinement changes `scripts/release-milestone-gates.mjs` to require the current API signature/actual-overload verifier with its explicit report, and the retained 26.11 graph suite with mandatory native execution. The latter first builds the current `nova_script_test` example into the explicitly selected workspace target directory, avoiding reuse of an old executable. Its raw report keeps its 26.11 coverage label inside the fresh 26.12 focus wrapper. `scripts/verify-v26.12-release-tooling.mjs` adds two regressions that require these recorded suites; the standalone legacy verifier's optional native argument does not make native execution optional for the default 26.12 release gate. This paragraph records the corresponding documentation edit. The final focused tooling verifier passed **92 checks**, both release writer/generator Node syntax checks passed, and the final Vue typecheck after the production module path repair passed. These targeted results do not substitute for executing the complete frozen qualification plan.

Product-report correction before freezing: `scripts/release-milestone-gates.mjs` no longer emits hardcoded zero severity counts. It lists the actual evaluated reports, sets `globalDefectCount: null`, and states that the global defect count is unknown without an exhaustive issue inventory. A failed/missing prerequisite remains an error. `scripts/verify-v26.12-release-tooling.mjs` verifies this distinction, rejects failed evidence, and exercises the unchanged release report validator with the scoped product schema; the resulting suite passed **95 checks**. `docs/EDIT_LEDGER_26_12.md` records both this correction and the required API/native focus suites. The existing packagers do not require zero severity fields; their actual source/build/report lineage and declared-finding rejection remain unchanged.

Actual code-game user audit: the new `scripts/verify-v26.12-code-game.mjs` passed **seven browser checks** against the current development web build. It creates a blank project and Rectangle using visible controls, chooses Kinematic through the native select keyboard interface, writes `fn update(dt) { if input_pressed("Jump") { set_position(2.0, 0.0); } }`, saves and attaches that Rhai asset, then verifies Inspector coordinates `(0, 0) → (2, 0)` after actual Space input. Two Stop/Play cycles restore the authored position. The audit next clicks Save Project, downloads a real `.nova`, decodes its embedded script and requires exact authored-source equality, reloads the tab, selects that downloaded file through Open Project, accepts the displayed compatibility review with no write-lease conflict, and repeats Play/Space/Stop successfully. It neither constructs a project document nor injects application/VM state.

The report is `release-audits/v26.12-code-game.json`, format `nova-v26.12-code-game-user-audit`, schema version 1, with `status`, named `checks`, observed coordinates, downloaded-file SHA-256/size, screenshot paths and console errors. The original downloaded artifact is retained as `release-audits/v26.12-code-game.nova`; PNG captures use the `v26.12-code-game-` prefix. These outputs are generated evidence, excluded from authored-source snapshots. Microsoft Edge starts with `--disable-blink-features=FileSystemAccessLocal`, and the verifier asserts that local open/save picker APIs are absent before exercising Nova_A's existing download/file-input fallback; OPFS remains available. This is actual browser fallback persistence coverage, **not native OS file-picker or installer coverage**. The runtime feature split is documented in [Chromium's primary runtime feature source](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/platform/runtime_enabled_features.json5). `docs/EDIT_LEDGER_26_12.md` records the new verifier, and this paragraph records both documentation edits. Node syntax validation also passed. The integration owner will invoke this suite and the separately authored visual microgame within the fresh user-interactions release gate; the seven development checks do not by themselves qualify frozen release artifacts.

## Candidate2 headless session finding and repair

The actual frozen candidate2 headless gate failed: both clients sent229 packets and received zero. Inspection of its decoded reference showed that the copied authority retained networking session name `Nova 26.10 Headless Authority`, while the verifier used executable name `Nova 26.12 Headless Authority` for client membership. The runtime derives session IDs from the configured name and schema, so rejecting this traffic was correct. A diagnostic using the unchanged candidate2 native export and its actual configured name received99 packets/71 snapshots. No network runtime rule or native binary was changed to repair this mismatch.

`scripts/generate-v26.12-reference-projects.mjs` now explicitly sets the current authority's network session name and provides `--server-only`. Bounded regeneration changes only the authority project content; its other three files and all three game references are unchanged. The default complete `--verify-only` invocation passed the four references and50 shipped script conversions. `scripts/verify-v26.07-headless.mjs` reads session identity from the decoded, hash-verified package and tests a deliberately different session on a fourth ephemeral port. Its fresh development rerun passed all11 existing policy rejections, first connection (98 received packets/69 snapshots), wrong-session rejection (229 sent/zero received/zero snapshots/no authority), and reconnect (98 received packets/68 snapshots), with the server alive throughout. The failed candidate report is retained in its qualification run and copied to `.cache/headless-candidate2-failure.json`; no previous failure was relabeled passed.

The first traffic rerun exposed one schema rejection for each admitted client: the retained shared peer helper declared no replicated entities, so the server's late-join ownership baseline did not match that test fixture. **Resolved:** `scripts/network-peer-v6.6.0.mjs` accepts an optional settings file carrying the decoded package's schema, channel, RPC and replication declarations. Existing standalone soak invocations keep their defaults. The headless path creates real BoxEntity fixtures with those two identities at sentinel positions, so the normal baseline handler must restore their transforms and ownership. It does not inject a received packet, call the baseline restore function directly, or modify the native server. The unrelated `soak.ready` RPC is suppressed for this packaged fixture.

The strengthened native rerun passed first and reconnect admission with zero schema rejections, one late join each and two entities restored by the actual baseline handler. The deliberate wrong-session peer remained unadmitted with zero snapshots and no restored baseline. The verifier now additionally requires observed finite positions to change from the sentinel and an explicit180 local exercise-step count; imported authoritative ticks are recorded separately and cannot satisfy that local-step requirement. The report retains actual runtime `lastError` values, including a duplicate-packet replay rejection if observed, rather than claiming that all defensive network events are absent. These are production networking/schema/baseline tests with controlled client replica objects; full client gameplay rendering, hostile public networks and windowless service deployment remain separate qualifications.

Exact candidate2 repair edits are the three scripts above, `reference-projects/projects/server-v2612-headless-authority/project.nova`, this release-plan explanation and `docs/EDIT_LEDGER_26_12.md`. The server-only generator's other three reference files are byte-identical. Ignored diagnostic outputs include `.cache/headless-session-diagnostic.mjs`/JSON, the retained original failure copy, the exported native package and decoded peer settings, and fresh headless gate reports. These changes require a new frozen candidate because the reference and harness are authored sources; a successful development rerun is not a substitute for that candidate's full qualification.
