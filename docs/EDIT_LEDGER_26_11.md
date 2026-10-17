# Nova_A 26.11 development edit ledger

Every authored file changed in this task is listed below. No source files or existing template IDs were removed. This is development work on the 26.10.0 compatibility baseline; version/schema constants, Rust dependencies and release artifacts were not promoted. Before edits, the corresponding defect, reproduction and data/runtime consequence were reviewed. Independent review supplied additional regressions before integration.

## Rust and native behavior

| File | Added / changed / removed behavior | Consequences and verification |
|---|---|---|
| `crates/nova_script/src/lib.rs` | Use CallFnOptions to prevent re-evaluating globals in every callback branch; add direct/cached command/state regression | Globals execute once per prepared invocation; exported state is retained; removes duplicate command execution, not an API |
| `crates/nova_runtime/src/lib.rs` | Serialize event payload fields in camelCase | Matches existing frontend event consumers; generated WASM must be rebuilt |
| `crates/nova_wasm/src/lib.rs` | Add real serialized contact/joint bridge regression | Checks collider identity, velocity, impulse and joint fields |
| `crates/nova_physics/src/query/mod.rs` | Query retained collider children, deduplicate owner hits, exclude sensors from character blocking; add compound/sweep tests | Point/ray/overlap and movement queries use authored geometry; shape work can increase query cost |
| `crates/nova_format/src/lib.rs` | Checked major/schema integer decoding and malformed/future version tests | Rejects values that previously wrapped/defaulted; preserves legacy documents with absent metadata |
| `src-tauri/src/lib.rs` | Portable safe-relative-path checks and tests; replace two lint-failing conditional-string expressions | Rejects traversal, streams, reserved names and ambiguous paths across hosts; stricter invalid-path rejection is intentional |

## Scripting

| File | Added / changed / removed behavior | Consequences and verification |
|---|---|---|
| `src/visual/graphCodeSync.ts` | Token-aware comments/strings/functions/calls; preserve else-if, loop names, integer spellings, exports, global order, helper/implicit returns and callback parameter names; repair marker/no-op sync; arrange imported scopes; reject oversized source before truncation | Preserves semantics or explicit source fallback; structural edits may reimport identities, while unchanged saves retain positions/identity; see full scripting report |
| `src/visual/graphCompiler.ts` | Preserve imported signatures and loop indices, map callback data pins to authored names, preserve integer source and complete source lines | Removes hidden argument changes and silent line truncation; graph-authored execution budgets remain explicit; lexical marker placement/suppression is in graphCodeSync.ts |
| `src/visual/graphTypes.ts` | Preserve positional routine/event/interface parameter arrays instead of sorting by UUID; add and normalize optional GraphVariable.sourceLiteral | Serialized parameter order preserves calling semantics and integer/float spelling survives round trips; no schema version change |
| `src/editor/scriptLanguage.ts` | Recognize runtime-verified sin/cos and exclude quoted call-looking text | Removes false diagnostics; does not claim unsupported clamp API support |
| `src/components/ScriptWorkspace.vue` | Run dirty-save guard for every mode destination, including Event Sheets | A failed or missing save keeps the current editor/draft mounted |
| `scripts/verify-v26.11-visual-roundtrip.mjs` | New conversion, layout, identity and optional real-Rhai differential regression suite | Explicitly reports whether native execution was requested; final run uses a freshly rebuilt native example |
| `scripts/verify-v26.01-visual-roundtrip.mjs` | Update generated helper/loop expectation to preserved author names | Keeps historical regression useful after the intentional signature correction |

## UI, library and runtime prompts

| File | Added / changed / removed behavior | Consequences and verification |
|---|---|---|
| `src/projects/templateCatalog26_11.ts` | Add descriptors for six games, seven physics fixtures and seven rendering scenes with EN/DE/ZH names/descriptions | Twenty new stable IDs; names/mechanics listed individually in template catalog |
| `src/projects/templateDiscovery.ts` | Shared pure localized multiword search, category/difficulty filtering and catalog/name/time/newest sorting | Testable discovery semantics independent of the Vue presentation |
| `src/projects/templates.ts` | Add actual scenes/assets/scripts/input/tutorial/build metadata for new IDs; correct inherited/new particle field names, opacity units, rain sorting and game-script scope | Forty total recipes; six games have movement/scoring/win/restart and applicable failure rules; particle hydration now affects runtime |
| `src/components/ProjectManager.vue` | All category, localized discovery, sort/reset/count, visible selected template, empty-result disabling, busy Enter guard, stable test attributes, readable container-driven cards | Filtering cannot create a hidden choice; cards scroll without compressing the form; no prior ID removed |
| `src/components/ConfigPanel.vue` | Narrow-dock stacked rows, wrapped actions and visible category scrolling; named property groups/slot controls; explicit labels on both NumberRange inputs | More vertical scrolling, readable labels and values; cloned VNodes retain model handlers |
| `src/panels/SettingsPanel.vue` | Provide translated row labels to the local switch helper as contextual accessible names | Explicit names retain precedence; values, IDs, model handlers and preference persistence are unchanged |
| `src/components/EditorBottomPanel.vue` | Container-driven Asset Inspector rows, wrapped labels and actions | Import controls remain readable in a narrow bottom-pane inspector |
| `src/components/BuildSettingsPanel.vue` | Keep startup-scene radio controls visible on a separate narrow row | Restores an operation previously hidden by CSS |
| `src/components/ManageWorkspace.vue` | Wrap navigation titles/descriptions; follow-up sizing repairs based on rendered scale failures | Text must occupy its natural height; all destinations remain available |
| `src/layout/TopBar.vue` | Keep translated menu triggers/status labels at intrinsic widths; scroll the menu row; measure and clamp dropdown positioning outside its scroll clip; close stale positioning on scroll/resize; repair overlay stacking | Long menu labels remain readable at large scale; dropdowns must overlay the workspace toolbar and stay reachable in a narrow window; command handlers are retained |
| `src/assets/main.css` | Shared actual-dock containment for child Inspector fields | Narrow controls stack consistently across runtime/world/gameplay inspector children |
| `src/runtime/inputModality.ts` | Base fallback prompt device on the actual binding; missing-binding and axis-specific labels | Display-only correction; input bindings, control mapping and gameplay commands unchanged |
| `src/runtime/controlRegistry.ts` | Track/remove only generated disabled tooltips and metadata when enabled | Enabled buttons no longer announce stale unavailability; authored titles retained |
| `src/runtime/teamWorkflow.ts` | Track the project whose lease is held; release only its exact token on normal pagehide; retain BFCache ownership and foreign/replacement leases; prevent unrelated release clearing ownership | Normal reload/close no longer strands its own two-hour write lock. Crashes and pre-existing orphan leases retain expiry-based protection; no other editor lock is stolen |
| `src/runtime/creatorLearning.ts` | Display count-independent Template library label while retaining old manual/progress ID | Library growth no longer makes the visible title false; existing learning anchors/progress stay compatible |
| `src/i18n.ts` | Add English/German/Chinese Template library label | Localizes the updated learning title |
| `scripts/verify-v26.11-input-prompts.mjs` | Add device fallback, unbound, axes, pen and controller-glyph regressions | Runs against bundled production module |
| `scripts/verify-v26.11-project-locks.mjs` | Add thirteen production-module lifecycle/ownership regressions with shared storage and separate document event targets | Covers reload, BFCache, other writers, stale tokens, unrelated releases, project switching, unreadable storage and expiry; actual browser reload checked separately |
| `scripts/verify-v26.11-templates.mjs` | Add discovery, all-template hydration, particle update/draw and actual WASM gameplay checks | Separates a small working starter from a fully played/exported production game |
| `scripts/verify-template-catalog.mjs` | Replace fixed legacy counts with original-catalog minimums and validate all registered templates | Existing categories/templates remain required; all forty receive schema/API/build/package checks |

## Build configuration and audit tooling

| File | Exact edit | Consequences |
|---|---|---|
| `.github/workflows/ci.yml` | One setup-node step reads `.node-version` | Uses shared tested Node version |
| `.github/workflows/nova-validation.yml` | One setup-node step reads `.node-version` | Same pin |
| `.github/workflows/release-matrix.yml` | Three setup-node steps read `.node-version` | Same pin across matrix jobs |
| `.github/workflows/stability-24h.yml` | One setup-node step reads `.node-version` | Same pin for stability runs |
| `tsconfig.node.json` | ES2020 target/library and Node types | Vite config is checked against its actual host environment |
| `vite.config.ts` | Remove obsolete process suppression and unnecessary outer async | Config gains contextual typechecking; async manual-copy hook remains |
| `package.json` | Pin development-only @types/node 22.20.1; include config in check; add named 26.11 inventory/graph/input/lock/template/interaction/layout commands | No shipped runtime dependency added; version stays 26.10.0 |
| `pnpm-lock.yaml` | Record Node declarations, undici-types and Vite's optional type-peer resolution | Existing runtime dependency versions stay unchanged |
| `scripts/inventory-v26.11.mjs` | New reproducible source/config/fixture symbol/import/hash index and registered feature catalogs | Does not label source indexing as a semantic or runtime pass |
| `scripts/audit-v26.11-ui-source.mjs` | Enumerate all Vue SFC controls/imports/layout patterns | Explicit source-only coverage |
| `scripts/verify-v6.0.2-interactions.mjs` | Select category/template by stable identity rather than ordinal position | Shared interaction harness still opens Mouse Knockout after All category addition |
| `scripts/verify-v26.11-interactions.mjs` | New development wrapper using actual engine metadata and separate evidence filename | Does not overwrite a 26.10 interaction result |
| `scripts/qualify-layout-v26.11.mjs` | New development layout wrapper with 1024/1366/1920 widths and 100/150/200% required scale matrix | Retains shared broad panel traversal; no release promotion |
| `scripts/qualify-layout-v3.3.mjs` | Include failing required-matrix/text states in thrown diagnostics | Layout failures no longer produce an empty error summary |

## Documentation

- `README.md`: add development links and distinguish the current audit from stable release claims.
- `docs/AUDIT_26_11.md`: architecture, findings, binding assessment, sourced Godot/GameMaker comparison, actual checks and remaining limits.
- `docs/ROADMAP_26_11_TO_26_20.md`: ten-version implementation manual with consequences, programmer/user gates and handoff discipline.
- `docs/SOURCE_MAP_26_11.md`: generated file-by-file roles and active/generated distinction.
- `docs/SOURCE_INVENTORY_26_11.json`: generated declarations, imports, source hashes and coverage disclaimer.
- `docs/FEATURE_INVENTORY_26_11.md`: every registered operation/component/API/core graph node with route-versus-evidence distinction.
- `docs/BACKEND_ENVIRONMENT_AUDIT_26_11.md`: reviewed Rust/configuration scope, reproducible defects, checks, risks and its exact ledger.
- `docs/VISUAL_SCRIPTING_26_11.md`: conversion cases, structural/source fallback, compatibility, regressions and user checks.
- `docs/TEMPLATE_LIBRARY_26_11.md`: all twenty new recipes, requirements, controls, verification and remaining play/export limits.
- `docs/UI_LAYOUT_AUDIT_26_11.md`: seventy-file Vue coverage register, focused repairs, rendered findings and pending checks.
- `docs/EDIT_LEDGER_26_11.md`: this consolidated ledger.

## Generated and local effects

Rebuilt ignored `nova_core/pkg/` WASM/bindings, optimized `dist/` editor/player/manual output and local Rust test/example artifacts. Installed pinned pnpm 10.30.0 into its package-manager cache and installed development type declarations into `node_modules/`; no global package-manager version was changed. Generated test reports/logs/screenshots in ignored `release-audits/`, including refreshed historical verifier reports against current source (not evidence of historical binaries). Browser workflows used an isolated localhost origin and disposable audit projects, and automated Edge tests use temporary profiles. No project was published, committed, packaged as a release or externally messaged.
