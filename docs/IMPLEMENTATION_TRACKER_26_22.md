# Nova_A 26.22 implementation tracker

Baseline: committed 26.21 (`bc7f2a8`). Contract: ROADMAP_26_21_TO_26_30.md, 26.22. Development only; no 26.22 release is qualified yet. Preserve releases/v26.21 and all earlier packages. Project Format 2/schema 29 remains the baseline until compatibility evidence requires otherwise.

## Required work and evidence

- Field-by-field lifecycle matrix for scene/entity/component/material/input/animation/UI/script/package/build data; named owner, validation, history, persistence, runtime/export and tested case or explicit unsupported disposition.
- Explicit resource/field-scoped transactions, continuous drag grouping, independent edits, nested commit/cancel and atomic rollback; pending edit boundaries before save/history/project replacement/playback.
- Selection, prefab overrides, conflict identity and asset references preserved across rollback.
- Finite number and enum validation at UI/API/load boundaries; rejected drafts remain visible and cancellable.
- Readable property provenance, defaults, units, mixed values and override/pin state; searchable keyboard-reachable groups.
- Canonical property corpus plus owner mutation/save/load/export comparisons and runtime-effect tests per executable family.
- Actual-input rapid independent edits, continuous drag, selection switch, mixed multi-edit, prefab apply/revert, malformed cancellation, immediate save, reopen/export/play, cross-scene and external merge.
- Retained feature/layout/platform/performance checks; frozen source; exactly eleven independently verified release files under releases/v26.22. External platform/human/assistive-technology qualification stays explicitly external.

## Completed development steps

- Four history-core tests pass: resource/scope/state/time merge identity, failed redo cursor preservation, nested group boundaries, redo invalidation.
- Fixed single-command groups losing their named boundary by merging with a preceding command.
- Extracted numeric-expression drafts to a component with resource ownership, retained errors, finite/range rejection, Escape cancellation and EN/DE/ZH messages. Type and actual-input verification pending.

## Every edit so far

- `src/editor/commands.ts` — Require resource/scope/continuous document/time identity to merge; protect open groups from Undo/Redo; advance Redo cursor only after successful application; retain explicit single-command groups.
- `scripts/verify-v26.22-history-core.mjs` — Add executable history regressions against the actual transpiled command module; emit a development report.
- `src/components/NumericExpressionInput.vue` — Add resource-owned numeric drafts and visible localized validation without silently replacing rejected text.
- `src/components/ConfigPanel.vue` — Replace inline numeric draft implementation with the owned component and pass stable selection UUID identity.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Record the full required scope, completed evidence and remaining checks; do not claim a qualified release.

## Additional completed development work

- Six command-history regressions pass, including compensation after a grouped Undo fails and recovery after failed group cancellation.
- Four independent draft-registry checks pass: validate all before commit, owner disposal/cancellation, nested settlement and recovery after an exception.
- Six real-store/WASM integration checks pass: immediate typed-draft Undo/Redo, invalid-draft playback blocking, nested transaction cancellation, UUID selection restoration, malformed-load rejection without document changes, and external scene conflict preservation.
- Actual Edge input passed malformed expression retention/Escape, independent two-control Undo/Redo, and immediate expression save with downloaded-file assertion. Long slider gesture test is being diagnosed; do not claim it passes.
- Retained 26.21 foundations suite passes on development source. Retained world component field/enum, WASM and NovaPak corpus passes (`reports/v26.22-world-roundtrip.json`, development only).
- Vue type check and Web build passed before the latest slider boundary changes; rerun for final source.

## Additional edit ledger

- `src/editor/commands.ts` — Modified grouped execution/Undo/Redo to compensate completed commands when a later command fails; report rollback failures; retain a failed cancelled group for retry. Preserve the configured browser target's Error support.
- `src/editor/pendingDrafts.ts` — Added an engine-independent live-owner registry with validate-before-commit ordering, cancellation, disposal and reentrant-boundary protection.
- `src/components/NumericExpressionInput.vue` — Modified draft registration and owner-aware DOM identity; boundary commits dispatch change through the Inspector's normalization, prefab and history owner.
- `src/components/ConfigPanel.vue` — Modified all existing multi-selection/reset/revert/paste merge keys to include selection UUIDs. Added localized shared-value versus selection-center position editing, mixed-axis placeholders, expandable property defaults/destination/override details, resource identity on the Inspector, and explicit slider pointer transactions with cleanup. Replaced slider numeric inputs with recoverable expression drafts without imposing slider display limits on previously unrestricted numeric entry.
- `src/runtime/projectMutationRouter.ts` — Modified delayed callbacks to capture/recheck resource identity; added explicit cancellation of queued and importing work at document boundaries.
- `src/store/physics.ts` — Modified Save/Undo/Redo/Play/Step to settle valid drafts and implicit edits, then cancel stale callbacks. Preserve outer transactions on inner cancellation, reject failed history loads, use the hydrated canonical history baseline, preserve selected UUIDs and external conflict/navigation state through history restoration, and preflight structural/non-finite/unsupported-shape values before hydration. Begin a transaction only after preceding pending edits settle. Cancel live gesture owners before successful replacement selection changes.
- `src/projects/projectPreflight.ts` — Added non-finite and malformed scene/entity/component rejection before project owners mutate, with field paths in diagnostics.
- `scripts/verify-v26.22-history-core.mjs` — Modified development regressions to cover compensating grouped Undo and retryable failed group cancellation.
- `scripts/verify-v26.22-pending-drafts.mjs` — Added four executable registry lifecycle/order/recovery checks.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added six integration cases against real editor modules and the WASM project loader, including unchanged document assertions on rejected input and conflict preservation.
- `scripts/verify-v26.22-property-user.mjs` — Added actual Edge keyboard/mouse and downloaded-project checks; development-only expected version remains 26.21 until the release version changes.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Modified this exhaustive progress/ledger record. No release qualification claim.

## Remaining before freeze (not optional)

1. Complete the long-drag actual-input check, shared/mixed value and selection-during-draft checks, prefab apply/revert, cross-scene/external-merge, reopen/export/player checks.
2. Complete field-by-field lifecycle inventory/corpus across every authored family; trace every public operation to an executed case or explicit exclusion. Current retained world corpus alone is insufficient.
3. Finish consistent finite/enum UI/API/load validation and audit all missing explicit mutation routes. Preflight rejects demonstrated structural failures; it does not establish arbitrary normalization-failure atomicity.
4. Audit transaction rollback failures, partial normalization effects and resource/conflict/prefab/reference retention beyond the executed cases. Audit slider boundaries and all inherited layout/interaction regressions after the NumericExpressionInput extraction.
5. Publish property/migration/runtime-effect evidence and visible unsupported-effect gaps. Refresh documentation, reference/teaching material, version authorities, current-version audit routes and release plan.
6. Run final type/Rust/retained/runtime/layout/performance gates on a frozen candidate, generate immutable 26.22 evidence, package exactly eleven files, independently verify source/binary/evidence hashes, and compare all eleven preserved 26.21 hashes. No 26.22 package has been produced yet.

## Latest verified results and edits

- Long native slider drag now passes with multiple input changes separated by >900 ms and exactly one Undo/Redo. The root cause was ancestor docking drag initiation cancelling slider input, not a failed numeric expression.
- All six actual Edge property checks pass: invalid draft retention/Escape, independent controls, long slider drag, immediate save, entity switch, mixed multi-edit with both saved/reopened owners.
- The retained layout workflow passes focus/resize/maximize, floating/redocking, and all EN/DE/ZH × 100/150/200% navigation/budget checks on development source.
- Eight real-store integration checks pass, including every explicit UI navigation-boolean combination and late normalization-failure recovery. Five new router ordering/lifetime checks pass.
- Component discovery enumerates 595 declared class fields and 440 scalar/enum probes. Some probes deliberately expose numeric normalization and dependent/structured values; they are a review queue, not a complete property pass. The expanded lifecycle work queue lists 1,696 declarations across twelve selected model families and explicitly remains incomplete.

- `src/layout/EditorLayout.vue` — Modified docking drag initiation to remember whether pointer input began on an editing control and reject that native drag; panel chrome dragging remains available.
- `src/components/ConfigPanel.vue` — Modified slider gesture ownership to the Inspector lifetime; cancel on selection replacement/unmount, settle on document boundaries, and keep child-control replacement independent. Wrap property details below controls.
- `src/components/NumericExpressionInput.vue` — Modified wrapper sizing to preserve a 10-character minimum where space permits and wrap on narrow rows.
- `scripts/lib/worldAudit17.mjs` — Modified Inspector expansion to target authoring sections, avoiding the new property-details disclosures consuming the section-expansion bound.
- `src/store/physics.ts` — Modified hydration to preserve explicitly stored focus/navigation booleans while retaining defaults for missing legacy metadata. Added authored-document recovery after late hydration failure, restoring selection, scene conflict/validation/dirty state, navigation, play mode and transaction stack/baseline; a recovery failure remains an explicit error. Register the loaded editor's synchronous mutation sink without making launcher loading eager.
- `src/runtime/projectMutationRouter.ts` — Modified queue ordering to flush the prior control before a different control's captured input mutates its model, and added explicit queue flush. Resource identity, stale callback cancellation and lazy startup remain guarded.
- `scripts/verify-v26.22-control-order.mjs` — Added five executable actual-module ordering/coalescing/resource/cancellation/disposal regressions.
- `scripts/verify-v26.22-document-boundaries.mjs` — Modified integration coverage for explicit focus/navigation booleans and malformed geometry failing after hydration starts, with complete before/after document comparison.
- `scripts/verify-v26.22-property-user.mjs` — Modified actual-input coverage for multiple native slider values, selection-switch drafts, mixed values and saved/reopened entity coordinates; record pointer observations for failure diagnosis.
- `scripts/discover-v26.22-component-properties.mjs` — Added real owner/serializer/hydrator discovery for every declared component class field, retaining unverified structured/reference/runtime cases explicitly.
- `scripts/discover-v26.22-property-lifecycle.mjs` — Added a named declaration work queue across scene/entity/component/material/input/animation/UI/script/package/build/project/render schemas. Mark unresolved lifecycle stages pending rather than passed.
- `reports/v26.22-component-property-discovery.json` — Added generated development probe results; incomplete lifecycle qualification.
- `reports/v26.22-property-lifecycle-matrix.json` — Added generated named declaration work queue; incomplete coverage.
- `reports/v26.22-world-roundtrip.json` — Added retained world-field/enum/WASM/NovaPak development evidence.
- `reports/v26.22-media-roundtrip.json` — Added retained animation/UI/media persistence/export development evidence.

The source remains version 26.21.0 during development. The latest store/router changes still need the final type/build/browser/retained-gate rerun. The complete 26.22 manual and release exit conditions above remain mandatory; no 26.22 frozen candidate or release package exists yet.

## Component corpus and numeric-control follow-up

The canonical development corpus now passes 721 cases over 695 field entries, including a 722-entity project through the native-format WASM loader and deterministic NovaPak pack/unpack. Asset fixtures establish reference identity/type, not semantic playback. The full cross-family lifecycle matrix remains incomplete.

- `src/world/Entity.ts` — Modified collider lookup to prefer an active collider before removed fallback records.
- `src/store/physics.ts` — Modified collider hydration to retain every supported collider record and removed identity; normalize joint thresholds without losing unlimited or large finite values. Preserve named merge transactions across successful replacement. Replace quadratic selection deduplication with sets.
- `src/world/components.ts` — Added shared joint break-threshold normalization and use it when pasting component values; JSON null preserves the unlimited sentinel.
- `src/components/LimitNumberInput.vue` — Added localized unlimited/finite joint editing, remembered finite values per resource, and recoverable non-negative expression validation.
- `src/components/RuntimeComponentsInspector.vue` — Modified joint force/torque fields to use the explicit unlimited control with stable resource identity.
- `src/components/NumericExpressionInput.vue` — Added configured-step increment/decrement buttons and Up/Down keys; reserve value width separately from buttons.
- `src/components/ConfigPanel.vue` — Modified NumberRange to forward its existing step size to expression controls.
- `scripts/fixtures/v26.22-property-dispositions.mjs` — Added explicit runtime/derived exclusions and constraint-valid scalar/structured component corpus values.
- `scripts/lib/propertyAudit22.mjs` — Added actual-version checks and development versus qualification report identity shared by new programmer suites.
- `scripts/discover-v26.22-component-properties.mjs` — Modified canonical probes to resolve imported/DOM enums, inherited identities, collider/joint variants, structured fields, typed asset references, whole-project hydration and deterministic package round trips.
- `scripts/verify-v26.22-history-core.mjs` — Modified report writing to use the shared actual-version guard.
- `scripts/verify-v26.22-pending-drafts.mjs` — Modified report writing to use the shared actual-version guard.
- `scripts/verify-v26.22-control-order.mjs` — Modified report writing to use the shared actual-version guard.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added successful/rejected replacement inside transactions, collider replacement identity and geometry/material effects, and zero/finite/large/unlimited threshold copy/paste/hydration regressions. Twelve cases passed before the latest UI-only edits.
- `scripts/verify-v26.22-joint-user.mjs` — Added actual mouse and keyboard/input save/reopen tests for unlimited, invalid negative and large finite joint thresholds. Center the mouse target and assert it is unobscured before clicking; the earlier nearest-scroll attempt failed and remains recorded in development history.
- `scripts/verify-v26.22-property-user.mjs` — Added actual step-button/arrow-key regression and six-digit minimum usable-width assertion.
- `reports/v26.22-component-property-canonical.json` — Added canonical development corpus results; not a complete lifecycle qualification claim.
- `reports/v26.22-queries.json` — Added retained query development evidence.
- `reports/v26.22-bindings.json` — Added retained world binding development evidence.
- `reports/v26.22-media-performance.json` — Added retained media performance development evidence.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded these follow-up edits and their exact evidence scope.

## Scene and prefab lifecycle follow-up

- `src/store/physics.ts` — Modified scene creation, activation, reload and loaded-state changes to settle pending document edits before mutating scene state; reject missing target IDs before touching selection. Added Back/Forward navigation that captures the outgoing world before changing the scene owner.
- `src/components/SceneTabs.vue` — Modified Back/Forward to call the shared store boundary. Added scene resource identity and distinct merge keys for template, runtime policy, tags, inheritance, named-layer creation and each layer name/visibility/lock field.
- `src/runtime/prefabs.ts` — Modified array comparisons to use canonical value ordering, preventing unchanged component records from becoming overrides merely because JSON property keys were reordered. A failing-before/passing-after regression demonstrates the defect.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added pending draft creation/navigation, invalid draft rejection with unchanged selection/document, and prefab apply/revert/Undo/Redo identity/asset/override checks. All fifteen current programmer cases pass.
- `scripts/verify-v26.22-scene-prefab-user.mjs` — Added actual Edge scene-setting two-step Undo, invalid-draft scene-creation rejection, Back/Forward persistence, and prefab apply/revert/save/reopen workflows. Assertions use the actual persisted authoringSettings path.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded each scene and prefab follow-up edit and current execution scope.

The rebuilt editor passes seven property-user cases (including step controls and usable digit width) and the joint threshold mouse/input/save/reopen case. Source type checking and Web build pass after the scene/prefab source changes. Scene/prefab browser suite is in progress; full lifecycle and release qualification are still outstanding.

## Component validation and atomic Inspector actions

- `scripts/generate-v26.22-component-enums.mjs` — Added a TypeScript-derived authored scalar string-enum contract generator with an exact `--check` drift guard; component identities also come from declared types.
- `src/world/componentEnums.ts` — Added generated accepted values for 41 scalar enum fields across 19 component identities. This explicitly excludes nested/asset schemas.
- `src/world/componentValidation.ts` — Added candidate-wide scalar enum and recursive finite-number validation before assignment, retaining the positive-infinity joint threshold contract.
- `src/world/components.ts` — Modified component paste to validate the complete candidate before cloning/assigning any field.
- `src/projects/projectPreflight.ts` — Modified project preflight to reject malformed component data and invalid declared scalar enums before hydration.
- `src/store/physics.ts` — Modified direct entity construction to validate component data before allocation/hydration. Added a separate optional transaction affected-resource argument, preserving existing defaults while allowing discrete actions to have a resource without a merge key.
- `src/components/ConfigPanel.vue` — Modified component paste and preset application to use explicit named transactions, normalize and capture prefab/animation changes once, and roll back with a visible error on rejection.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added all-41-enum API/load rejection, direct constructor rejection, non-finite nested paste atomicity, no-op Redo retention and separate same-resource action coverage. Eighteen current programmer cases pass.
- `scripts/verify-v26.22-scene-prefab-user.mjs` — Added actual paste and preset application with Undo/Redo assertions.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded each validation and transaction edit and its limited scope.

The canonical 695-field/721-case/722-entity component corpus passes with validation enabled, as do retained world and media round trips. All declared scalar enum rejections preserve the previous document. Nested schemas, all other authored families, full UI matrix, external-merge/export/player user workflows and final release qualification remain outstanding. No 26.22 release files have been packaged.

## Evidence indexing and full-panel traversal

- `scripts/qualify-panels-v26.21.mjs` — Modified the retained traversal to accept only the explicit 26.21/26.22 qualification target and require the corresponding actual machine version outside development mode. Default 26.21 behavior is preserved.
- `scripts/qualify-panels-v26.22.mjs` — Added the separate 26.22 traversal entry point and evidence paths. The first full midnight-blue development sweep is running; it is not frozen qualification.
- `scripts/discover-v26.22-property-lifecycle.mjs` — Modified the work queue to link canonical executed component persistence/export cases and explicit runtime exclusions, including inherited component identity fields. Current matrix: 1,796 entries, 611 with named passing persistence cases and 36 explicit runtime/derived exclusions; other stages remain pending.
- `reports/v26.22-property-lifecycle-matrix.json` — Updated generated per-field evidence links without converting unresolved lifecycle stages into a pass.
- `scripts/audit-v26.22-public-operations.mjs` — Added static enumeration of implemented public TypeScript operations and direct links from named passing document-boundary cases. Dynamic registrations and Vue handlers remain separate work.
- `reports/v26.22-public-operations.json` — Added the 278-file, 2,004-operation work queue: 26 operations have direct named executed cases and 1,978 still need a case or explicit exclusion. This is not a complete audit claim.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded evidence indexing, full-panel execution and remaining coverage precisely.

The latest four scene/prefab/component user workflows pass. The generated enum contract passes its drift check. All eleven preserved 26.21 release-file hashes still match. No new release package or qualified-release claim exists.

## Reviewed merge boundary

- `src/editor/semanticMergeCommand.ts` — Added the shared reviewed-merge command. It settles pending edits through a named transaction before comparing the review fingerprint, preserves newly committed edits on stale-preview rejection, and rolls back failed load/finalization.
- `src/components/TeamWorkflowPanel.vue` — Modified semantic merge application to use the shared command, keeping preview/incoming cleanup after success and reporting errors without clearing a rejected preview.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added stale-preview-after-draft, invalid-draft rejection and current-preview single-step Undo/Redo checks. All twenty current programmer cases pass.
- `scripts/audit-v26.22-public-operations.mjs` — Modified executed-case aliases to include the shared merge command and semantic plan creation.
- `reports/v26.22-public-operations.json` — Updated the operation work queue to 279 files/2,005 operations, with 28 direct executed-case links; 1,977 remain pending review or exclusion.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded merge ordering, recovery and exact evidence scope.

The panel sweep uses the production build preceding the reviewed-merge handler edit. Rebuild and run the actual external-merge/export user workflow after it finishes; do not claim that the ongoing sweep tested the newest handler.

## Retained delivery/recovery evidence

- `scripts/verify-v26.22-delivery.mjs` — Added a target-checked entry point for the maintained 26.21-origin delivery regressions, keeping separate 26.22 evidence and actual-version enforcement.
- `scripts/verify-v26.22-delivery-user.mjs` — Added a target-checked entry point for retained actual external merge, Undo/Redo, save/reopen and exported checkpoint gameplay.
- `reports/v26.22-save-recovery.json` — Added nine passing retained storage/destination failure and recovery checks on current development source.
- `reports/v26.22-delivery.json` — Added 27 passing maintained delivery regressions. The first 26.19-origin attempt failed three signed-update tests because its fixed update version was older than the current engine; its report is preserved in `.cache/v2622-delivery-legacy19-report.json` and log in `.cache/v2622-delivery.log`. The maintained 26.21-origin suite computes a newer fixture from the actual engine and passes.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded retained suite provenance and the older-fixture failure rather than hiding it.

## Settings/native export audit and retained user checks

- `src/world/components.ts` — Restricted pasted keys to own component fields; inherited `__proto__`/constructor keys cannot replace component prototypes. Whole-candidate validation remains atomic.
- `src/store/physics.ts` — Exported pending-document settlement for project-test startup.
- `src/runtime/testRunner.ts` — Settles drafts before taking the test snapshot; invalid drafts abort without replacement, and a refused playback start cannot begin gameplay.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added prototype rejection and valid/invalid draft project-test startup assertions; all 23 cases pass.
- `scripts/discover-v26.22-settings-properties.mjs` — Added type-aware discovery and populated canonical settings cases, then strengthened each canonical case to native/WASM and NovaPak reopen. The prior JSON-only run passed 580 cases across 451 fields. The first stronger run failed 91 cases; those failures are retained in `reports/v26.22-settings-export-failures.json` and are not counted as qualified.
- `scripts/fixtures/v26.22-settings-populated.mjs` — Added actual asset/entity/settings fixtures and enabled the optional official networking package through its owner. Export intentionally removes networking settings when that package is disabled; the first fixture had omitted activation.
- `scripts/fixtures/v26.22-settings-dispositions.mjs` — Added explicit local/fixed exclusions, ownership aliases, canonical constrained candidates, and dependent values for telemetry/authentication/platform identifier cases.
- `scripts/fixtures/v26.22-runtime-dispositions.mjs` and `docs/GAP_REGISTER_26_22.md` — Recorded unsupported project-test hooks, fixture execution and seed application separately from persistence evidence.
- `crates/nova_format/src/lib.rs` — Accepted the editor's existing UI, physics, animation and regression test kinds, retaining rejection of unknown kinds. Added all-eight-kind migration regression. The complete native format suite passes 49 tests. The test initially needed corrections to serialize ProjectFile and supply the required screenshot flag; no engine validation was weakened for those fixture errors.
- `release-audits/v26.22-panels-midnight-blue.json` — Completed 1,333 layout states in three languages with 25 captures; other palettes and final frozen-source qualification remain pending.
- `reports/v26.22-delivery-user.json` — Four actual external merge/save/reopen/exported gameplay cases passed on the development build. Newer source changes require final rebuilt qualification.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded every new source/fixture/report edit and the distinction between development persistence evidence and full lifecycle acceptance. Previous 26.21 release artifacts remain unchanged.

## Material/settings completion and extended numeric drafts

- `scripts/fixtures/v26.22-settings-dispositions.mjs` — Uses valid peer-2 for peer identity mutation; the final native/WASM and NovaPak run passed all 580 settings cases across 451 fields, with five explicit local/fixed exclusions. The preceding failure report remains diagnostic history, not the latest result.
- `scripts/verify-v26.22-material-corpus.mjs` — Added 125 passing material persistence cases across 74 field entries through normalize/serialize, transactional asset write, native migration and NovaPak reopen. Added linked graph identity rename assertion, accounting for canonical node sorting. Runtime rendering and editor history remain separate evidence requirements.
- `src/components/RuntimeComponentsInspector.vue` — Converted all 132 template numeric controls plus generated slider/progress min/max/value controls to NumericExpressionInput, retaining bounds and step controls. Added entity/component/field identities, stable breakpoint object identities, wrapping paired/quad fields, and explicit tilemap resize transaction with rollback. No control or animation was removed.
- `scripts/verify-v26.22-runtime-input-user.mjs` — Added actual audio invalid-draft/two-step Undo, tilemap resize/Undo/reopen and text keyboard-step/readability checks. Initial fixture was rejected because Text lacked RectTransform; fixed the fixture dependency before rerunning, without weakening validation.
- `scripts/discover-v26.22-property-lifecycle.mjs` — Linked the individual passed settings/material cases into the lifecycle work queue (2,321 entries); untested runtime/UI/history stages remain pending.
- `scripts/audit-v26.22-public-operations.mjs` — Added the project-test module alias; current traversal records 2,006 operations with 28 direct named-case links. Nested module access still requires linking, and unresolved operations are not classified as passed.
- `release-audits/v26.22-joint-user.json` and `release-audits/v26.22-property-user.json` — Existing one joint and seven property user checks pass on the rebuilt extended Inspector. Full panel/palette qualification still needs rerunning after this layout change.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded the above edits and the exact interrupted point. Native format tests (49), rebuilt WASM, TypeScript and production build passed before interruption; existing 26.21 release artifacts remain preserved.

## Resumed runtime input audit: decimal grammar

- `scripts/verify-v26.22-runtime-input-user.mjs` — Fixed Text fixture dependency on RectTransform; added view-settlement waits and actual visible Undo History observations. The apparent audio Undo failure was traced to a retained `.4` draft rejected by the arithmetic parser, so Undo correctly refused to discard it.
- `src/editor/sceneAuthoring.ts` — Extended the restricted numeric grammar to ordinary leading/trailing decimal forms (`.4`, `1.`, including exponents). Division by zero, non-finite values, malformed tokens and arbitrary property/call syntax remain rejected.
- `scripts/verify-v26.22-numeric-expressions.mjs` — Added fifteen passing actual-parser cases for accepted decimals/arithmetic and rejected unsafe/malformed inputs.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded the diagnosed cause and fix; production rebuild passed after the grammar change. The new browser cases are being rerun, not yet claimed passed here.

## Runtime sliders, metadata and field evidence

- `src/components/ConfigPanel.vue` — Captures pointer-down for every Inspector range input and uses the existing owned drag transaction; the transaction now records the target resource identity. Existing child range handlers safely see the already-open gesture.
- `src/components/RuntimeComponentsInspector.vue` — Added stable entity/component/field identities to all four remaining native range controls. No controls were removed.
- `scripts/verify-v26.22-runtime-input-user.mjs` — Added actual multi-second audio spatial-blend drag with one-step Undo/Redo. All four runtime input cases pass on the rebuilt UI; visible history evidence confirms independent audio edits.
- `scripts/audit-v26.22-public-operations.mjs` — Recognizes actual nested opened.modules calls, linking the project-test runner to its passed cases. Current result: 2,006 operations, 29 direct named-case links; unresolved entries remain explicit.
- `scripts/discover-v26.22-media-lifecycle.mjs` — Added 167 named media-interface field links to the retained passing production normalizer/native/NovaPak corpus. Does not label runtime/UI/history gaps completed.
- `scripts/verify-v26.22-metadata-corpus.mjs` — Added 49 passing cases over 41 entity/scene metadata fields through named transactions, Undo/Redo, native migration and NovaPak. Entity candidates also pass complete project validation. Prefab ownership uses a real prefab asset and named-layer selection has a matching layer. Reactive snapshots use persistence JSON; fixed an initial structuredClone-on-proxy fixture error. Corrected the initial assumption that editorOnly entities are omitted from packages: they are retained.
- `docs/GAP_REGISTER_26_22.md` — Added ENTITY-EDITOR-ONLY-22 and ENTITY-PERSISTENCE-22: entity flags have persistence/validation but no gameplay consumer; the separate persistentAcrossScenes boolean is implemented. Asset editorOnly export behavior is separate.
- `src/projects/projectPreflight.ts` and `src/store/physics.ts` — Added shared rejection of explicit invalid ownership/persistence enum values before project hydration or direct entity construction. Missing/null legacy values retain their existing default behavior.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added invalid metadata API/load atomicity and legacy-null default checks; the invalid-input pass before the null fixture addition brought the suite to 24 cases.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded all source/audit edits and limitations. The updated midnight-blue panel sweep is still running; its build predates only the latest metadata preflight edit, which does not change layout.

## Script/UI asset owners and no-op asset saves

- `scripts/verify-v26.22-script-assets-corpus.mjs` — Added 50 passing cases over 24 event-sheet/blueprint fields, including every ObjectEventKind, named history, native and NovaPak retention. Added actual blueprint instantiation assertions for required components, tags/groups, position and event binding, plus event selection/disabled-handler checks. Corrected the seed fixture to the declared 1–2147483647 range; zero is not a valid event-sheet seed.
- `src/runtime/eventSheets.ts` — Aligned scheduleObjectEvents selector matching with GameplayRuntime: blank handler selectors are wildcards; nonblank selectors match exactly. Added regression coverage through the script-asset suite.
- `scripts/verify-v26.22-ui-theme-corpus.mjs` — Added 53 passing field cases, named Undo/Redo, native/export retention, actual style/token/state/variant resolution and atomic rejection of non-finite style values/cyclic inheritance. Corrected the effect fixture to bind the hovered state's own values, respecting normal CSS-like state precedence.
- `src/assets/AssetDatabase.ts` — updateTextAsset now returns success without changing timestamps, pipeline or generation when the encoded source is identical. Changed source still follows the original update path. This prevents false history/dirty entries from unchanged saves.
- `scripts/verify-v26.22-document-boundaries.mjs` — Added unchanged/changed asset-write assertions; all 25 document-boundary cases pass.
- `scripts/discover-v26.22-property-lifecycle.mjs` — Linked metadata, script-assets and UI-theme field corpora with their correct source owners and named history evidence. Remaining stages are not labelled complete.
- `scripts/audit-v26.22-public-operations.mjs` — Added actual asset-owner alias links from the passed no-op regression.
- `docs/GAP_REGISTER_26_22.md` — Added EVENT-SEED-22 for the stored event-sheet seed that has no production execution binding. Recorded the completed updated midnight-blue sweep: 1,333 states, 25 captures, three languages.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded the above edits. Material and script corpora are rerun against the shared no-op asset save change; final source freeze, remaining field/runtime/public-operation coverage and all release files are still pending.

## Package lifecycle continuation

- `scripts/verify-v26.22-package-lifecycle.mjs` — Added four passing package lifecycle cases: enabled/disabled and offline-mode history/native behavior; enabled states also pass NovaPak reopening. Asserted matching plugin project flags and complete official manifest retention after export. The manifest fixture is inert and never executed. Publisher-owned manifest fields are explicitly distinguished from editable project controls.
- `reports/v26.22-package-user.json` — Retained actual browser package workflow passed review/install, platform readiness labeling, disable/enable/remove/Undo, and save/reopen with reviewed grants on the latest production build.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded package evidence. Latest Web build passes. Shared text-asset change was rechecked by the 125 material and 50 script-asset cases; TypeScript remains clean. Overall 26.22 is not complete: remaining asset/import schemas, full named public-operation dispositions, runtime/user coverage, all palettes/frozen qualification, localized release documentation and eleven release outputs are outstanding.

## Audio import zero-value preservation

- `src/assets/AssetDatabase.ts` — Added a finite asset-setting fallback helper and corrected audio quality/target-peak hydration so valid zero values survive. Null/empty/boolean/non-finite inputs retain fallback behavior; numeric bounds still clamp to the declared range. Audio quality zero previously reopened as 0.8, and target peak zero reopened as -1 dB.
- `scripts/verify-v26.22-audio-import-boundaries.mjs` — Added eighteen passing actual audio-asset hydration/native/NovaPak boundary cases using a valid tiny WAV fixture. Covers zero, range endpoints, out-of-range values, legacy numeric strings and malformed values. This is value-retention evidence, not codec or acoustic qualification.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded the fix and evidence. PresentationPanel's normalization action reads targetPeakDb directly, so its zero value was not subject to a second truthiness fallback.

## Exact import-discovery checkpoint

- `scripts/discover-v26.22-asset-import-properties.mjs` — Added TypeScript-aware discovery of the default AssetImportSettings schema through actual project/asset hydration. Result: 77 fields, 100 probes, 95 retained, five requiring canonical constraint correction, eight unpopulated nullable/container fields. Report explicitly remains incomplete and uses a neutral resource asset; it is not media/runtime qualification.
- `reports/v26.22-asset-import-property-discovery.json` — Records every probe and missing fixture. The five constraint cases are four-character OpenType tags (two array entries), oversampling minimum 1, and integer sprite-sheet row/column minimum 1. These are invalid exploratory candidates, not established engine bugs.
- `docs/IMPLEMENTATION_TRACKER_26_22.md` — Recorded this checkpoint. Next import step: populate loop regions/active-region IDs, sprite regions/frames/polygon outlines, platform override/variant records, and real font fallback references; use matching image/audio/font/script fixtures, then canonical history/native/export tests. Existing Nunito Sans WOFF2 files are available under node_modules/@fontsource-variable/nunito-sans/files.

Latest completed verification: both TypeScript checks pass, all 25 document-boundary cases pass, 18 audio import boundary cases pass, all eleven v26.21 release hashes remain unchanged. No frozen v26.22 candidate or v26.22 release output exists. The latest production build predates only the audio zero-value hydration fix; rebuild before its browser acceptance. No audit/build operation was left running at the last process check.

### Populated import corpus continuation
- Added `scripts/verify-v26.22-asset-import-corpus.mjs`: uses real embedded SVG, one-second PCM WAV, WOFF2, and text assets; populates platform variants/overrides, sprite geometry, audio loop references, and font fallback references. Checks named document transactions, Undo/Redo, native hydration and deterministic NovaPak reopen per candidate. This is retention evidence, not a claim that every import option executes a codec or renderer effect. No production behavior changed in this edit.

### Import numeric draft controls and capability disclosure
- `src/components/EditorBottomPanel.vue`: replaced asset-bound native numeric inputs with `NumericExpressionInput`, preserving existing handlers and bounds, adding stable asset/field identities. Invalid drafts now stay visible and block boundary saves instead of contaminating persisted numeric values. Existing nonnumeric controls remain.
- `src/components/PresentationPanel.vue`: applied the same retained numeric draft control to audio target peak, loop markers and loop-region endpoints, with asset/region identities. Existing waveform normalization and commit handlers remain.
- The new import corpus's TypeScript mapped-type member lookup now handles synthetic symbols without declarations, using the root declaration as its checker location.
- `src/components/EditorBottomPanel.vue` and `src/components/PresentationPanel.vue`: numeric control groups now wrap, and the asset inspector's narrow container rule recognizes the numeric component wrapper. This preserves six-digit editing space instead of forcing several fields into one narrow row.
- `scripts/verify-v26.22-asset-import-corpus.mjs`: fixture explicitly selects English/German build locales, because a locale mutation to German must be reachable under the genuine export closure; exports its baseline as `.cache/v2622-import-corpus.nova` for browser tests. Added a named missing-asset assertion rather than a generic undefined access.
- Added `scripts/verify-v26.22-import-input-user.mjs`: real browser interactions for malformed asset drafts, two controls/two Undo actions, immediate save/reopen and narrow numeric field capacity.
- `src/components/EditorBottomPanel.vue`: the real two-controls/two-Undo browser test exposed cross-field merging in `assetSettingsChanged`. Replaced its asset-wide merge key with the numeric control's asset-plus-field identity; controls without an explicit field identity do not merge. The affected resource is recorded. Atlas rebuild behavior remains.
- `scripts/verify-v26.22-import-input-user.mjs`: opens the dock using the actual maximize button and dismisses migration notices before clicking assets, avoiding obscured pointer targets. The failed two-control assertion was retained and used to fix production history.
- Populated import corpus: **113 fields / 178 cases passed**, including named history, native hydration and export reopen. Browser-dependent texture atlas decoding is unavailable in the Node harness and is not claimed by this corpus.
- `src/components/PresentationPanel.vue`: audio import commits also use asset/field identities instead of merging all audio fields. Region start/end drafts enforce start < end before committing, preventing an endpoint edit from silently deleting its region during normalization. Legacy loop markers retain their zero sentinel behavior.
- `scripts/discover-v26.22-property-lifecycle.mjs`: linked the 113 populated import fields to their named history/native/export evidence. Matrix now contains 2,552 rows and remains explicitly incomplete for outstanding lifecycle stages.
- `scripts/discover-v26.22-settings-properties.mjs`: each canonical candidate now enters the real settings hydration owner within a named field transaction, then compares Undo and Redo before native/export checks. This adds snapshot-transaction coverage; it does not replace each GUI handler's interaction audit.
- Import browser regression: all **3 checks pass**, including the previously failing two-control/two-Undo case, save/reopen and narrow six-digit field capacity.
- `src/components/PresentationPanel.vue`: converted 22 further persistent numeric controls (mixer limits/ceiling/crossfade, snapshots, bus/effect/automation/ducking parameters, localization expansion, runtime accessibility) to validated drafts with explicit project or nested resource identities. Kept their existing bounds and normalization handlers. Mixer commits now distinguish fields and no longer merge unrelated parameters under one project-wide key. Transient preview and separately saved theme draft controls were not included in this edit. Numeric groups wrap where needed.
- `src/components/PresentationPanel.vue`: presentation-setting commits now distinguish stable field identities, matching the mixer/import behavior. Unidentified actions remain separate history entries.
- Added `scripts/verify-v26.22-audio-draft-user.mjs`: actual browser tests for rejected crossing endpoints, retained loop identities, independent endpoint Undo, and mixer finite/range drafts with two-field Undo.
- `src/components/NumericExpressionInput.vue`: the audio endpoint browser regression exposed parent change handlers running before the numeric model update. Declared an explicit `change` event and routed it through successful validation/commit before notifying the parent. Invalid drafts do not call the parent normalization handler. Enter, blur-only and boundary commits dispatch the same change route. This prevents normalization from replacing an old loop/effect object before its new value reaches the document. All numeric consumers require regression reruns after this shared change.
- Added `scripts/verify-v26.22-component-history.mjs`: runs canonical component values through named document transactions, compares whole-component Undo and authored-field Redo, uses tilemap resize/stroke owners, and explicitly excludes in-place kind/UUID replacement. It consumes the passing canonical corpus; this adds history evidence without claiming physical effects or UI-handler coverage.
- Settings corpus now passes **580 cases / 451 fields** with the added named hydration transaction Undo/Redo assertions, plus native and export reopen.

### Separate 26.22 qualification wiring (not yet executed as release qualification)
- Added `scripts/verify-v26.22-transactions.mjs`: fresh, version-guarded execution and hash-bound evidence bundle for the 15 new programmer/corpus suites. No development result is promoted to release evidence.
- Added `scripts/verify-v26.22-property-authoring.mjs`: separate seven-suite real-input bundle, guarded by actual 26.22 source identity. This supplements retained feature gates; it does not replace them.
- Added `scripts/qualify-layout-v26.22.mjs`: retains the complete five-palette/three-language/viewport/scale layout contract with 26.22 report paths.
- `scripts/release-milestone-gates.mjs`: routes 26.22 browser-layout qualification to its versioned wrapper, preserving earlier release routes.
- After the shared numeric event-order fix, **all six affected browser suites pass**: audio drafts (3), import drafts (3), inspector properties (7), runtime inputs (4), joints (1), scene/prefab (4). This is current development-build evidence, not frozen release qualification.
- `src/components/PresentationPanel.vue`: mixer gain, effect wet and send gain sliders now have bus/effect/send resource identities and an explicit pointer-gesture transaction. A multi-second drag is committed once; pointer cancellation rolls back; pending document boundaries settle the gesture; unmount and document cancellation remove listeners. This retains slider behavior while closing the timeout-based splitting risk outside the component inspector. Browser verification is pending the next build.
- `scripts/verify-v26.22-audio-draft-user.mjs`: added a real mouse drag lasting over two seconds across the master gain slider, followed by one Undo and Redo with value assertions. It awaits the next built version of the gesture handler.
- Added `scripts/generate-v26.22-references.mjs` and six separate reference directories (`creator-v2622-code-game`, `creator-v2622-blocks-game`, `creator-v2622-mixed-game`, `server-v2622-headless-authority`, `creator-v2622-output-quality`, `creator-v2622-animated-menu`). Each contains `project.nova`, `README.md`, `expected-output.json`, and `test-controls.json`. Source content derives from preserved 26.21 examples; identities/build names and 26.22 acceptance exercises are separate. Generated files are candidates, not released binaries or passing gameplay evidence.
- Added `docs/QUALIFICATION_LESSON_26_22.en.md`, `.de.md`, and `.zh.md`: localized editing, draft correction, loop/slider, readability, save/reopen/export and evidence-limit exercises. Each distinguishes expectations from completed qualification and documents the importer transcoding limitation.
- `scripts/discover-v26.22-property-lifecycle.mjs`: links each component field's executed history case by canonical case index; constructor kind/UUID identity exclusions stay explicit instead of claiming in-place edits.
- `scripts/generate-v26.22-references.mjs` and its generated README/expected-output/test-controls files: audio exercises now explicitly import a WAV and create a loop before editing endpoints. Regenerated and verified the six reference outputs deterministically.
- Added `scripts/generate-v26.22-teaching.mjs`: version-guarded generation/verification of the 26.22 supplement in the retained offline manuals. It is prepared for final source-version alignment; current 26.21 manuals are not yet rewritten.
- `scripts/audit-v26.22-public-operations.mjs`: links additional history-class methods/getters/constructors and pending-draft public functions to their actual named passing regression cases. Unmapped operations remain pending; this is not a blanket coverage pass.
- `src/components/GameplayComponentsInspector.vue`: replaces all gameplay-component numeric inputs with retained finite/range drafts, stable entity/component/field identities and wrapping vector rows. Existing component choices and parent inspector normalization remain.
- `src/components/WorldComponentsInspector.vue`: applies the same control to world/navigation/streaming/pooling/particle numeric fields, including stable navigation-link identities. Existing package/bake actions and form guard remain. Invalid numeric drafts stop before parent commit; valid values use the normal field owner.
- `src/components/NumericExpressionInput.vue`: defaults the step to 1, preserving native number inputs' increment/decrement behavior when a field did not specify a step. Explicit fractional steps still take precedence. Default-step controls now expose the same keyboard and visible step buttons; layout and browser checks must use the next build.
- The gameplay/world conversion comprises **35 gameplay fields and 31 world fields**. Type-check result is recorded separately.
- `scripts/verify-v26.22-runtime-input-user.mjs`: adds Health2D and NavigationAgent2D fixtures and real-input checks for invalid drafts, two-control Undo, default ArrowUp stepping, vector values and save/reopen.
- `scripts/lib/worldAudit17.mjs`: numeric label helpers recognize both retained native number inputs and validated numeric-expression inputs, preserving existing user-test semantics after the control conversion.
- Added `docs/VERSION_26_22_TRANSACTIONS.md`: describes actual editing changes, corpus scopes, outstanding lifecycle work, release prerequisites and external limits. It explicitly identifies current development status and does not claim a completed package.
- Full midnight-blue sweep completed with failures in localization/accessibility/snapshot numeric readability. Preserved its failed report; it is not a pass.
- `src/components/PresentationPanel.vue`: numeric labels now wrap their value rows with enough space for digits, padding and step buttons. Snapshot cards and loop-region rows use wrapping flex layout instead of fixed narrow numeric grid columns. This fixes the observed 3–4 digit fields rather than hiding them.
- `scripts/qualify-panels-v26.21.mjs`: classifies `data-numeric-expression` inputs as numeric for the existing six-digit capacity rule. Native text fields still require twelve characters, and actual short numeric fields still fail. The shared 26.22 wrapper inherits this correction.
- Added `scripts/verify-v26.22-presentation-numeric-layout.mjs`: targeted actual-settings traversal of localization, accessibility and audio numeric fields across three languages, three scales and three widths. Measures usable digit capacity with the active font and preserves all short-field failures. It complements the complete panel sweep rather than replacing it.
- `src/components/NumericExpressionInput.vue`: the gameplay ArrowUp regression exposed rounding away a fractional minimum when the step was integral. Step rounding now preserves both step and minimum precision, matching native step-grid behavior instead of producing an unchanged value.
- `scripts/verify-v26.22-runtime-input-user.mjs`: checks the fractional-minimum/default-step result against the browser's native detached number-input `stepUp()` behavior, rather than incorrectly expecting an unaligned value plus one.
- `scripts/verify-v26.22-presentation-numeric-layout.mjs`: waits for the lazy UI workspace and uses the visible compact tab selector at narrow widths; these are test interaction fixes, with geometry assertions unchanged.
- Added `scripts/verify-v26.22-media-history.mjs`: edits each of six populated media assets through lossless draft validation/encoding and the actual text-asset owner, then compares complete documents through named Undo/Redo. Its report explicitly distinguishes whole-document retention from independent nested-field mutation and runtime effects.
- `scripts/verify-v26.22-media-history.mjs`: corrected the fixture to use recovery-envelope encode/decode only for draft transport, while the real asset write stores ordinary document JSON. Recovery envelopes are not media asset files. No production source changed for this fixture correction.
- Latest production build and both TypeScript configurations pass. The rebuilt numeric workflows pass: audio (4 checks), imports (3), property inspector (7), runtime/gameplay/navigation (6), joints (1), scene/prefab (4). The focused presentation capacity audit passes **81 language/scale/width/surface combinations**. Full five-palette traversal still needs the final build and remains a separate requirement.
- `scripts/verify-v26.22-transactions.mjs`: includes the passing six-document media history suite (16 programmer/corpus suites total).
- `scripts/verify-v26.22-property-authoring.mjs`: includes the focused presentation numeric capacity suite (eight user/layout suites total).
- `scripts/discover-v26.22-media-lifecycle.mjs`: links whole-document history evidence for each of 167 media interface fields, explicitly retaining the independent-field/runtime distinction.
- `scripts/discover-v26.22-property-lifecycle.mjs`: includes those media lifecycle rows in the consolidated work queue. Total is now 2,719 rows; unresolved lifecycle stages are not marked passed.
- `scripts/verify-v26.22-material-corpus.mjs`: every canonical material candidate now uses a named document transaction around the atomic text-asset writer, with full-source Undo and Redo assertions before native/export checks. GUI/render semantics remain separate, and the field inventory now names the executed history route.
- `src/components/ConfigPanel.vue`: converted remaining model-bound authored numeric fields (authoring origins/parallax/path, renderer/sprite/text/camera settings, body forces and collider geometry) to retained drafts with field or collider-shape identities. Converted z-order's direct input setter to the validated numeric value event. Existing transient impulse-entry controls and special script-property controls are separate. Paired/quad numeric rows wrap.
- `src/components/PhysicsSettingsPanel.vue`: converted the 12 project physics numeric controls to retained drafts with fixed project-field identities, preserving units, bounds and form commits. Separately saved material drafts are not part of this conversion. Numeric/unit rows wrap.
- `src/components/ConfigPanel.vue`: exposed script scalar and vector numeric properties now use retained numeric drafts and metadata bounds. Validated numbers are passed directly to `setScriptProperty`/`setScriptVectorPart`, preserving finite-value checks and avoiding parsing an unfinished expression from DOM text. The vector helper's final argument is now the validated number; both callers were updated.
- The preceding advanced conversion covered **74 model-bound fields plus z-order**, alongside 12 project physics fields.
- Added `scripts/verify-v26.22-advanced-inspector-user.mjs`: fixtures and real-input checks for renderer/camera fields, exposed script scalar/vector expressions with metadata bounds and immediate save, plus independent project physics setting history. These require the next production build; the running Cloud Blue sweep continues against the prior built source.
- Added `scripts/verify-v26.22-lsp.mjs`, `scripts/verify-v26.22-save-recovery.mjs`, and `scripts/verify-v26.22-reproducibility.mjs`: invoke the retained implementations with explicit 26.22 qualification identity and separate report paths, rejecting a conflicting target.
- Added `scripts/verify-v26.22-foundations.mjs` and `scripts/verify-v26.22-renderer.mjs`: retain the existing foundation/render assertions with separate 26.22 report/version authority. Native pixel-comparison limitations remain unchanged. These prepare retained release checks and do not imply final qualification.
- `scripts/verify-v26.22-foundations.mjs`: uses the 26.22 audit helper for explicit engine/development provenance and rejects premature qualification without `--development`. The retained foundation checks pass in development mode; LSP also passed with the explicit 26.22 development target.

- Resumption: Cloud Blue development layout passed 1,333 states / 25 captures against the pre-advanced build. Advanced source subsequently built successfully. `scripts/verify-v26.22-advanced-inspector-user.mjs` now creates an actual annotated Rhai asset and invokes property synchronization, replacing fixture-only metadata omitted by the intentional serializer contract. Renderer/camera checks passed before this correction; remaining checks are being rerun.

- `src/components/DeviceInputPanel.vue`: converted 11 model-bound numeric controls to retained finite/range drafts with field/resource identities. Preserved existing handlers and step/bounds. Numeric groups wrap to retain editing capacity. Direct material uniform setters remain separate; no feature or animation removed. Awaiting build/user verification.

- `src/components/RenderingPanel.vue`: converted 34 model-bound numeric controls to retained finite/range drafts with field/resource identities. Preserved existing handlers and step/bounds. Numeric groups wrap to retain editing capacity. Direct material uniform setters remain separate; no feature or animation removed. Awaiting build/user verification.
- Added `scripts/verify-v26.22-device-render-user.mjs`: real-input validation, separate Undo and saved/reopened rendering settings. Advanced inspector tests now pass all three cases after using the actual Refresh exported properties label. Device/render source type-check passed.

- Added `scripts/lib/operationEvidence22.mjs` and connected `scripts/audit-v26.22-public-operations.mjs`: resolve direct source-module calls inside named passing retained runtime cases. Unresolved aliases/indirect helpers remain unclaimed. `scripts/verify-v26.22-property-authoring.mjs` now includes advanced-inspector and device/render real-input suites (ten suites).

- `src/store/physics.ts`: serialize a history transaction before removing it from the active stack. A serialization exception now leaves both top-level and nested transactions available for correction/cancel. Added the named fault-injection case in `scripts/verify-v26.22-document-boundaries.mjs`; assertions compare the complete restored document and empty history. Device/render browser checks passed (2 cases); all eleven previous release files remain unchanged.

- `src/components/NumericExpressionInput.vue`: expose finite min/max and step DOM attributes for existing control inspectors; custom expression validation remains authoritative. `scripts/fixtures/renderer-fixture.ts`: retain renderer limit assertions and add explicit rejection/retention/correction checks when the mounted control supports numeric drafts. Native legacy controls retain their clamping assertion; valid fractional values still test normalizer behavior. Initial renderer attempt retained as failed evidence.

- Added `scripts/fixtures/v26.22-derived-field-dispositions.json`: 402 explicit source/declaration/field exclusions for reviewed runtime samples, evaluation caches, diagnostics, command results and generated receipts. `scripts/discover-v26.22-property-lifecycle.mjs` validates each exact row and records its rationale in every lifecycle stage. Authored backing resources remain in the matrix; no runtime effect or complete inventory pass is inferred from these exclusions.

- Added `scripts/audit-v26.22-reference-imports.mjs`: separate 26.22 version/report authority retaining the prior release assertions. Current source is still development; this prepares qualification and does not certify a release.

- Added `scripts/verify-v26.22-template-output.mjs`: separate 26.22 version/report authority retaining the prior release assertions. Current source is still development; this prepares qualification and does not certify a release.

- Added `scripts/generate-v26.22-template-walkthroughs.mjs`: separate 26.22 version/report authority retaining the prior release assertions. Current source is still development; this prepares qualification and does not certify a release.

- Added `scripts/verify-v26.22-focus.mjs`: separate 26.22 version/report authority retaining the prior release assertions. Current source is still development; this prepares qualification and does not certify a release.

- Generated `docs/TEMPLATE_LIBRARY_26_22.md`: all forty retained starters with 120 localized walkthroughs. Reference migration/idempotence audit passes 225 projects against current development WASM; renderer audit passes 43 checks with explicit development provenance and no native pixel-comparison claim. `scripts/verify-v26.22-focus.mjs` uses the actual transactions bundle filename. `scripts/verify-v26.22-template-output.mjs` now requires aligned source for qualification and records explicit development/qualified-release fields.
- Reviewed paired NumberRange input bounds against HEAD: the original numeric companion intentionally accepted values beyond the slider window (e.g. high mass and multi-turn rotation). No blanket slider-bound restriction was introduced, preserving that feature.
- Added `scripts/audit-v26.22-runtime-families.mjs` and derived runtime-family evidence: sixteen named families link exact passed effect assertions and report hashes. This supplements persistence cases; it explicitly remains partial and does not turn untested fields/families into passes.

- Added `scripts/verify-v26.22-layout-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-foundations-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-hierarchy-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-template-library.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-palettes-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-quality-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-menu-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-package-user.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Prepared, not yet executed as final release qualification.

- Added `scripts/verify-v26.22-authoring.mjs`: separate 26.22 retained user qualification entry point with versioned evidence paths. Includes the new property-authoring bundle as well as retained creator workflows. Prepared, not yet executed as final release qualification.
- Added `scripts/verify-v26.22-media-field-corpus.mjs`: independent populated media leaf/enum edits through lossless validation, named asset history, native hydration and NovaPak reopen. Rejected candidate drafts must leave the project unchanged. Linked identities and typed asset/null/color replacements remain explicitly pending; no whole-document pass substitutes for those edits.

- `scripts/verify-v26.22-media-field-corpus.mjs`: compare rejected candidates with the freshly loaded canonical baseline, because initial fixture metadata is normalized by project hydration before draft inspection. The unchanged-document assertion remains exact.

- `scripts/verify-v26.22-media-field-corpus.mjs`: the first export run correctly stripped an unused rig. Added a real media owner with Animator, Skeleton2D and TimelinePlayer references, matching the retained media fixture. The export-retention assertion remains unchanged and now exercises reachable resources.

- Media leaf corpus passed: 155 inventoried leaf paths, 218 accepted mutation/history/native/export cases and 29 owner rejections. Forty-five paths retain explicit pending structural/typed-reference dispositions. `scripts/discover-v26.22-media-lifecycle.mjs` links each leaf to its exact nearest declaring-interface field using populated fixture identity; container/rename/runtime coverage is not inferred. `scripts/verify-v26.22-transactions.mjs` includes the new corpus (17 suites). Final numeric attribute source type-check/build passed; Midnight Blue completed 1,333 states against the preceding build.

- Added `scripts/fixtures/v26.22-media-structured.mjs`: explicit existing-reference, acyclic synchronization, new-root parent, normalized paired-weight and marker/reference edit fixtures. `scripts/verify-v26.22-media-field-corpus.mjs` adds real alternate clip/rig assets and applies those reviewed coupled alternatives. Generated record IDs are explicitly creation identities, not unimplemented scalar edit controls. These are audit fixtures, not new production rename APIs.

- `scripts/fixtures/v26.22-media-structured.mjs`: new-root parent fixture now includes the canonical retarget alias automatically required for the new bone. Added an explicit unique mask-membership replacement. The strict normalized-document equality assertion is retained; the earlier new-root attempt failed because the owner added its missing alias.

- Added `scripts/verify-v26.22-entity-api.mjs`: direct alias/serialization, invalid-write atomicity, body modes, renderer layers and collider/component identity cases. The pre-fix run confirmed nonfinite color writes mutated the owner. `src/world/Entity.ts`: added finite guards to numeric setters (layer, transparency, angularVelocity, linearDamping, angularDamping, density, mass, inertia, gravityScale, torque, gravity, restitution, restitutionThreshold, staticFriction, dynamicFriction, contactCount, penetrationDepth), vector setters (velocity, force, acceleration, contactNormal) and color channels before assignment. Finite value ranges and forwarding identities remain unchanged.

- Corrected statement separators in the new finite Entity setters before rerunning compilation. `scripts/fixtures/v26.22-media-structured.mjs`: retarget remapping also retains the old bone under its canonical alias, satisfying the rig owner requirement that every bone remain addressable. Strict normalization comparison is unchanged.

- `scripts/verify-v26.22-entity-api.mjs`: use the actual `Collider2D(kind)` constructor for collider replacement/revival, and assert a rejected layer write leaves all renderer layers unchanged.

- Entity public API regression passes all four cases after the finite guards. `scripts/audit-v26.22-public-operations.mjs` links the explicitly exercised alias/accessor operations to those named cases. `scripts/verify-v26.22-transactions.mjs` now includes Entity API verification (18 programmer/corpus suites).

- Structured media run passed 251 cases / 24 rejections with two unresolved alternatives. Updated `scripts/fixtures/v26.22-media-structured.mjs` to choose a genuinely different command target and pair integer parameter rebinding with an integer threshold. `scripts/verify-v26.22-media-field-corpus.mjs` now also pairs parameter-type and trigger-operator edits with compatible values and records those coupled scopes explicitly. Query (9) and runtime binding (18) suites pass after Entity finite guards.

- Final structured media corpus passed 255 accepted mutation/history/native/export cases and 21 owner-rejection cases across 155 declared leaf paths; no pending alternatives remain within that bounded fixture scope. Added explicit scope-count and no-pending-fixture assertions to prevent future omissions. This does not claim arbitrary container operations, all structural combinations or GUI/runtime completeness. Meadow Cream passed 1,333 states / 25 captures on its recorded development build.

- `docs/VERSION_26_22_TRANSACTIONS.md`: updated implemented device/render controls, public Entity finite guards, recoverable serialization failure, bounded media cases, explicit derived exclusions and current unresolved operation counts. It continues to identify development state and unbuilt release artifacts.
- Added `docs/MIGRATION_26_22.md`: draft compatibility guidance for retained invalid drafts, finite API rejection, history/rollback changes and unchanged project format. It distinguishes 225 current development migrations from pending frozen-release and installation qualification.
- Added `docs/RELEASE_NOTES_26_22.md`: development release-note draft describing implemented changes, unchanged format, remaining qualification and the exact eleven-file release contract. It explicitly does not authorize packaging or claim universal performance.
- Added `scripts/generate-v26.22-edit-ledger.mjs` and `docs/EDIT_LEDGER_26_22.md`: deterministic path-first authored change ledger against the preserved 26.21 commit, supplementing the chronological per-edit tracker. Temporary/generated reports are excluded; source/audit/reference/doc paths remain individually listed. This is a development ledger, not packaged release evidence.

- Added `scripts/audit-v26.22-surfaces.mjs`, `docs/PANEL_AUDIT_26_22.json` and `docs/PANEL_AUDIT_26_22.md`: enumerate every current Vue surface, including NumericExpressionInput, LimitNumberInput and NumberRange instances that the prior native-control matcher omitted. Handler/model/conditional expressions remain explicit source evidence, not interaction passes. Retained 26.21 catalog routes are labelled as such; verify-only mode supports an immutable final source freeze.

- `src/panels/SettingsPanel.vue`: converted fourteen authored scripting/input-map numeric controls to retained drafts with project/action/binding/field identities, preserving existing commit handlers and numeric bounds. Input binding/advanced grids now allocate text-relative numeric space. Five editor-preference controls retain their separate persistence route. Awaiting next build/user audit; active Blush Berry traversal still uses the prior built Settings panel.
- Added `scripts/verify-v26.22-settings-input-user.mjs`: actual browser tests for scripting bounds and independent setting Undo, plus action/binding invalid drafts, independent history and save/reopen. It requires the next Settings build and has not yet been executed.

- `scripts/verify-v26.22-settings-input-user.mjs`: use the actual `scriptingSettings` panel search keyword before first execution. Settings source type-check passed. Integrated eighteen programmer/corpus suites and ten prior latest-build user suites passed; Blush Berry passed 1,333 states / 25 captures on the build before the latest Settings conversion.

### Continued history and Settings audit integration
- Added four history-core cases for direct document merge/baseline behavior, composite ordering/ownership, immutable history metadata and clearing, and bounded memory eviction with one oversized recoverable edit. No production behavior changed.
- Extended public-operation evidence linking to directly exercised DocumentMutationCommand and CompositeCommand receivers/constructors.
- Added the passing Settings input user suite to the property-authoring release bundle (eleven suites). Both Settings cases passed on the current development build.

### Connection modal draft validation
- ConnectionBuilder.vue: converted eight bounded numeric fields to retained expression drafts; stable dialog/field keys preserve ownership. Save/Bind now settle and validate drafts before allocating/mutating a connection. Existing limits, local Cancel behavior, drawing, physics and animations remain. Invalid values visibly remain and block Save.
- Retained 26.17 physics-operation browser suite now checks retained-invalid/blocked-save behavior when the new controls are present, retaining its legacy branch for older builds.
- Settings input browser suite now generates an independent empty-project fixture using current migration/serialization instead of depending on the advanced-inspector cache.
- History-core ten checks passed; public-operation inventory now links 279 of 2,007 operations, with 1,728 still pending review.
- Added a standalone connection-draft browser suite using the tracked world fixture: retained invalid input/blocked Save/Cancel, expression commit, Undo/Redo, connection identity, physics settings and saved-project reopening.

### Merged history memory budget correction
- Reproduced a growing merged edit retaining two commands above the configured memory budget (history-budget-before.log).
- commands.ts: both merged and newly appended edits now use the same length/memory eviction and cursor update. The latest command remains recoverable even when individually oversized; merge identity and undo semantics are unchanged.
- Added the precise merged-growth budget regression to history-core.

- Refreshed panel inventory after Settings/Connection conversions: 83 surfaces, 3,009 controls, 1,614 conditions and 102 retained routes, no missing catalog routes. Night Garden completed 1,333 development states/25 captures on its preceding build; this is not frozen-source qualification.
- Updated deterministic ledger descriptions for ConnectionBuilder, SettingsPanel, retained rope-user assertions and the history merge memory correction.

### Save/Undo/Redo phantom edit correction
- The new connection interaction check exposed a real failure: updating Recent Projects called touchProjectMetadata after Save, making the in-memory document differ from the just-saved file and creating phantom history entries. Consecutive downloads differed only in projectMetadata.updatedAt.
- projectManager.ts: removed this authored timestamp mutation from rememberCurrentProject; its separate recent-list updatedAt timestamp still updates. Cached snapshot and saved document now agree. No scene, connection or animation feature was removed.
- Added an actual-source document-boundary regression verifying recent bookkeeping preserves project text, Undo/Redo and the cached recent snapshot.

- Corrected recent-history test setup to hydrate prior fixtures and compare the recent snapshot with the last remembered (undone) state. Both full-document before/after remember assertions remain. All 27 boundary cases passed after the timestamp correction.
- Connection user check also downloads the committed expression before Undo; temporary history diagnostics were removed after isolating the real timestamp defect.

### Legacy rope limit preservation
- The corrected connection user test exposed null unlimited breakForce/breakTorque becoming zero in legacy rope normalization.
- Connection.ts now uses the existing normalizeJointBreakThreshold helper, retaining unlimited, zero and finite values consistently with Joint2D components. Runtime serialization can still represent unlimited as Infinity/JSON null.
- Added a document-boundary case covering null, zero, 0.5, 1e12, Number.MAX_VALUE and Infinity for both thresholds, repeated normalization, JSON round trips and UUID preservation.

- Browser migration correctly rejected raw Infinity returned by the legacy connection serializer after the limit normalizer fix. physics.ts now explicitly serializes unlimited connection force/torque as JSON null, matching component limits and the existing schema. Added a full tracked-project load/serialize/reopen threshold regression; this complements the direct normalizer case.

### Independent browser fixture prerequisites
- Extracted the existing populated image/audio/font/script/shader/localization fixture into scripts/fixtures/v26.22-import-project.mjs without changing its values or corpus assertions. The asset-import corpus now calls this shared builder.
- Added scripts/lib/userFixtures22.mjs to create current migrated fixtures in caller-specific cache paths.
- Import-input, audio-draft, presentation-numeric-layout and device-render user suites now create their own prerequisites instead of depending on earlier suites/cache state. No editor behavior changed.

- Connection browser checks both passed on the rebuilt source: invalid drafts/blocked Save/Cancel and expression commit/Save/Undo/Save/Redo/Save/reopen with identity and physics thresholds preserved. Added this suite to the property-authoring release bundle (twelve suites).
- Extended public-operation evidence aliases for the directly exercised recent-project manager and connection normalizer; untested operations remain pending.

### Declaration-to-corpus evidence ownership
- Added declarationEvidence22.mjs with explicit reviewed prefixes for input, device settings, entity metadata, material graph/layers and event/blueprint declarations; media links require identical source and interface-field names.
- The consolidated lifecycle generator now links matching raw fields to existing corpus evidence. Multiple fixture instances retain all links. Populated child fields do not qualify container insertion/removal/reordering, and unresolved constraints/runtime effects remain pending. No production files changed.

### First asset Undo metadata stability
- Reproduced first-Undo drift: new text records omitted tags, collectionIds, contentGroup, editorOnly, sourceControlStatus and thumbnailKey; hydration added them.
- AssetDatabase.ts now initializes fresh bookkeeping defaults in all four direct constructors (file imports, extracted sprites, legacy textures and text assets). Each record gets independent arrays; existing source bytes, UUIDs, settings and pipeline behavior are unchanged.
- Added script/resource creation and rename Undo/Redo regressions comparing the entire asset record, including non-ASCII source text.
- All twelve integrated user suites passed on the preceding complete rope/history build, including 81 presentation size/locale/scale cases. Asset-constructor correction requires its own subsequent checks.

- Corrected the new asset regression to rename through renameAsset, which maintains the name/path invariant and dependent path repairs. Directly assigning name had produced an intentionally inconsistent test fixture; the original metadata-default failure was separately reproduced before that Redo assertion.

### Retained operation evidence expansion
- Added freshly executed animation-authoring, media-roundtrip, world-streaming, world-roundtrip and networking suites to conservative direct-call linking.
- Networking aliases are resolved from its actual literal SSR module list and matching array destructuring. Dynamic/changed loader shapes and indirect helper effects remain unclaimed.

### Networking audit setup failure reporting
- Retained animation-authoring, animation-UI, audio-PCM, media-roundtrip, world-streaming and world-roundtrip passed on current source. Networking timed out in Vite SSR module loading before executing cases; the attempt is failed, not a runtime pass.
- verify-v26.18-networking.mjs now records a failed setup case and writes failed evidence for such exceptions instead of retaining stale passing output. Networking direct-call linking was deferred until a fresh successful run; the resolver support remains ready.

- Updated VERSION_26_22_TRANSACTIONS.md, RELEASE_NOTES_26_22.md and MIGRATION_26_22.md with verified memory, Save/Redo, rope-limit and first-asset-Undo fixes; updated evidence counts to 299 linked operations/1,708 pending and 230 direct declaration aliases/12 child-only container links. Development/unreleased status remains explicit.

- A second networking attempt timed out at another Vite development-server module fetch and wrote a failed report as intended. Replaced this runner's live SSR fetch loader with the existing production-bundle/native-ESM audit loader. All eleven actual source roots remain; the original real networking timers and controlled clock/transport/tests are unchanged.
- Removed the now-obsolete special SSR-list resolver from operationEvidence22.mjs; the shared bundled-module resolver applies once a fresh networking run passes.

- The bundled networking audit passed all 28 unchanged cases in the fresh run. Both earlier timeout logs remain. Enabled networking direct-call evidence linking against this new passing report and the actual bundled entry map.

- Extended conservative operation alias resolution to top-level identifier assignments such as opened = await openMediaAuditModules(...); function bodies remain excluded from global seeding. This makes the networking runner's actual namespace assignment discoverable without inventing helper coverage.
- All eighteen integrated core/corpus suites passed after the asset-default correction. All 225 reference migration checks also passed.

### Material graph numeric drafts
- MaterialGraphEditor.vue: six numeric fields (node X/Y, amount, strength, Number value and palette steps) now retain finite/bounded expression drafts. Existing bounds, steps and graph normalization on change remain.
- RenderingPanel.vue supplies the active material UUID so copied node IDs across different assets cannot share a stale numeric draft. The new component prop has a default for compatibility. Sliders, graph edges, animations and other graph controls remain intact.

- RenderingPanel material Save now settles/validates numeric drafts before shader validation and asset writes; a retained invalid graph value blocks saving the prior local draft.
- Added a self-contained material graph user fixture with copied node IDs across two assets; cases check invalid Save blocking, expression persistence/reopen and draft isolation across asset switches.

- Corrected the material user selector after inspecting its failure capture: graph cards show node type and UUID, while the custom label is edited in the inspector. The test now clicks the visible shared-palette UUID; no product change was needed for this fixture issue.

### Open material inspector history synchronization
- Reproduced a saved graph value staying at 10 after Undo restored the asset to 8. RenderingPanel only watched selectedGuid, so same-asset history replacements did not refresh its draft.
- RenderingPanel now tracks the last loaded/saved material baseline and follows source replacement while its local draft is clean. Unsaved local drafts are preserved instead of silently overwritten. Material Save checks the asset write result before updating the baseline.
- Added an actual-user case asserting the still-open graph shows restored values after both Undo and Redo.

### Resumed material verification and native audit
- Verified all three material-graph user cases and both neighboring device/render cases passed after the clean-draft history watcher. Added material-graph-user to the release property-authoring bundle (13 suites).
- Updated transaction evidence counts to 325 linked public operations / 1,682 pending and the RenderingPanel edit-ledger description to include guarded Save and clean-draft synchronization.
- Native workspace regression tests started against the existing source; previous changes and release artifacts are preserved.

### Typed material uniform editing
- RenderingPanel scalar/integer and vector uniform controls now use resource-scoped retained numeric drafts. Range sliders remain sliders; integer rounding, reflected bounds/steps and explicit asset Save remain. Finite guards also protect the shared scalar/vector handlers.
- Replaced the fixed 180px vector group and 25% input width with wrapping controls sized for numbers and steppers; no controls or preview behavior removed.
- Native cargo test --workspace --locked passed all 182 tests (49 format, 2 math, 96 physics, 6 runtime, 28 script, 1 WASM); doc tests also passed.

- Extended the material user fixture with scalar, integer, vector and range uniforms. Added rejected-vector Save blocking, expression/integer results, reopening and retained-slider assertions. Corrected quoting in the new browser-evaluation strings before running the suite.

### Retained scripting/runtime verification
- Material user suite now passes all four cases, including typed scalar/vector inputs; updated Vue typecheck and Web build pass.
- Typed graphs, language corpus, API signatures, syntax slots, script modules and project roundtrip passed against current source.
- Native and WASM runtime suites each exposed two fixture setup failures: their deliberate NaN assignment now hits the finite public Entity setter. Updated only those two setups to assert rejection and then inject NaN through the internal rigidBody field; detached snapshot and prefab/conflict non-mutation assertions remain unchanged. Both failed attempt logs are retained before the rerun.

- Added a 27-combination material uniform readability case (three languages, UI scales and viewport widths), measuring all five numeric controls and preserving captures at the smallest viewport/largest scale. No product changes accompany this audit extension.

- Linked the material corpus's existing per-candidate named asset transaction / Undo / Redo assertions into lifecycle history evidence; 74 material rows no longer incorrectly show missing history evidence. This does not qualify runtime effects or all edit domains.
- Native and WASM retained runtime reruns passed after the two corrupted-state fixture repairs; original failed logs are preserved.

- Extended operation evidence linking to the foundation suite's explicit moduleAt source paths and literal named passing cases. Dependency mocks and indirect calls are not linked as executed source operations; dynamically named preference cases remain unclaimed.

### Material layout visibility follow-up
- The original 27-combination numeric-width case passed, but inspecting its 1024px/200% capture showed header/navigation crowding the edit area. Width measurements alone did not prove visible reachability.
- Strengthened the material layout audit to require at least 80px of scrollable content and actual center-point visibility after scrolling each numeric field into view. Captures now show the controls rather than only the header.
- Prepared a Rendering-only CSS correction: full-width title/navigation rows and a scrollable header bounded to half the panel height. It preserves every tab and description. Application/build waits for the currently running integrated user suites to finish.

- Added six explicit asset-library operation cases for folder/move identity, mirrored collection membership, favorites, saved filters, cloned import presets and trash restoration. Named transactions compare complete-document Undo/Redo; stored import settings are not claimed as codec execution.

- All twelve neighboring user suites passed on the uniform-control build; the material suite separately passed its five original checks. The latter width-only layout claim is superseded by the stronger reachability audit.
- Applied the prepared Rendering header correction after those browser runs completed.
- Corrected the new asset operation test to use the actual resolveAsset lookup API rather than a nonexistent getAsset helper; no product lookup API changed.

- Corrected the preset test fixture to the existing pixelsPerUnit setting (100→200); pointFilter is not an AssetImportSettings field. The preset clone/isolation assertions are unchanged in purpose.

- All six asset-library operation cases passed. Added this suite to the 26.22 transaction bundle (19 suites) and conservative operation linking against its explicit module map and named passing cases.

- Rendering header correction passed all five material user cases, including 27 width/scale/language combinations with actual field reachability. Visual inspection confirmed the smallest/200% English capture now includes the vector controls. Both device/render neighbor cases passed.
- Updated transaction documentation to 344 linked public operations / 1,663 pending and included typed material uniform coverage.
- Added an authored-inspector playback/paused keyboard-focus regression and post-Stop restoration check to the property user suite; running it against the existing build first to verify the suspected pointer-only lock.

### Authored inspector keyboard isolation
- Reproduced keyboard focus entering the pointer-disabled ConfigPanel during playback. The new actual-user assertion failed before the fix.
- ConfigPanel now marks its already runtime-disabled authored subtree inert whenever canEdit is false. This prevents focus/keyboard activation in playing and paused modes and restores normal interaction in editing mode. Runtime display remains visible; the separate runtime inspector is unchanged.

### Additional exact declaration ownership links
- Added reviewed canonical aliases for Material2DResource/uniform metadata; rendering, post-processing, quality volumes, texture streaming and capture settings; build/platform/delivery settings; and script project settings.
- PostProcessValues retains evidence for both active values and preset values. Multi-prefix matching preserves every matching canonical row; container child evidence still does not qualify structural edits. Alias links now retain the canonical disposition, including fixed schema identity, rather than labeling every alias authored.
- Expanded property user audit passed all eight cases after the keyboard isolation fix, including playing, paused and restored editing modes.

- Added exact direct-call linking for the passed 48-case native runtime-stage suite. The resolver reads its real Vite input map, literal load calls and literal Promise.all entry lists, including the declared GameplayRuntime source path. Controlled host dependencies and indirect effects remain outside these links; no runtime/native equivalence or all-domain claim is inferred.

- Updated transaction documentation to 349 exact declaration aliases / 44 child-only container links and 402 public operations linked / 1,605 pending. These are traceability counts, not complete field/runtime qualification.
- Three-process localhost networking passed four retained replication/ownership/reconnect cases with explicit development provenance. The first launch omitted --development and stopped at the release authority guard; no case pass was recorded for that attempt.
- Release notes now describe authored Inspector keyboard isolation and Stop restoration.

- Latest retained LSP, save-recovery and delivery development gates passed. Added conservative direct-operation linking for save-recovery's actual bundled modules and delivery's literal Vite SSR source loads. IPC language-server effects remain their separate integration evidence, not invented direct-call links.

- Current Cloud Blue sweep passed1172 results,27required Settings combinations and25captures. Investigated the162-result difference from earlier runs: explicit requiredViewports skips the preliminary duplicate SHELL traversal. Verified all six workspaces still have nine passed width/scale states in each language in the main traversal. Recorded comparison in reports/v26.22-panel-coverage-comparison.json; no feature removal inferred from raw count changes.

### Retained authoring development execution
- Layout, foundations and hierarchy user entries now read the actual engine label only with explicit --development; release runs still require26.22. Layout now recognizes the development flag. This permits accurate pre-release testing without changing qualification guards.
- Menu-user chooses integrated reference-projects for an integrated development checkout; the authored overlay fixtures path is retained only for a distinct overlay source root.

- Found that the new property audit writer hard-codes passed status. Added reporting regressions requiring a failed or empty case list to produce failed evidence/nonzero exit, successful development evidence to remain unqualified, and release authority mismatch to write no report. Running the failure reproduction before correcting the helper.

- propertyAudit22 now derives report status from a nonempty all-passing case list, writes failed evidence before throwing on failure/empty results, and never marks a failed result qualified. Existing source authority guards are unchanged.

- All four reporting regressions passed after the fix. Added audit-reporting to the transaction bundle (20 suites). Checked that all20 existing suite reports use nonempty passed case lists compatible with the stricter writer; no engine tests were weakened or relabeled.

- Retained foundations user audit found a real Inspector pair layout failure at200%: numeric input width44px. Stopped only the verified task-owned palette/authoring process trees before rebuilding; completed Cloud Blue and layout-user results remain, foundations is failed, unfinished palette/hierarchy runs are interrupted rather than passed.

### Numeric wrapper typography and paired layout
- Root cause of the44px Inspector inputs: the wrapper inherited smaller text while input/button typography uses scaled --type-dense. NumericExpressionInput now uses the same --font-ui and --type-dense so ch-based minimum/flex widths reflect displayed characters.
- ConfigPanel slider/number rows now wrap, with an8ch slider flex basis; sliders, numeric step buttons and all animations remain. This prevents a correctly sized numeric companion squeezing the slider into unusable space at large text sizes.

- Foundations user suite now initializes its numeric200% case explicitly, rather than relying on the preceding locale/scale loop. Added a development-only --numeric-layout-only mode with a separate inspector-numeric-layout-user report; full release execution still runs every original case.

- Font sizing alone did not close the Inspector failure. The captured Property Details section was consuming width beside coordinates because its plain scoped selectors did not reach the nested render-function component. Changed those four rules to deep selectors, retaining full-width details below inputs and normal wrapping/capitalization. Added an explicit below-inputs geometry assertion; six-character capacity/overflow assertions remain unchanged.

- Full foundation rerun exposed a helper timing race: u.position returned an empty array before the selected Inspector inputs mounted, causing a later comparison against undefined. worldAudit17.position now waits for both actual coordinate inputs before reading them. Undo/value assertions remain unchanged; no product mutation or state injection was added.
- Focused200% Inspector check and all eight property workflows passed after the font/deep-details correction; inspected its capture with readable coordinates and details below. Runtime/advanced/device neighboring cases passed on that build.

### Material source conflict regression
- Added a real user regression: save a material, edit its local graph, Undo the saved asset, then try Save. The retained draft must not overwrite the replacement asset; explicit discard/reload must restore its current value. This first runs against the unchanged product to reproduce the defect.

- Reproduced the material conflict overwrite: actual saved value12 replaced the Undo value8. RenderingPanel now tracks the loaded source reactively, refuses material writes on source mismatch, retains the unsaved draft and displays an English/German/Chinese conflict notice with an explicit discard/reload action. No material or animation capability is removed. This guard does not claim complete studio draft ownership or merging.

- Resumed foundation workflow passed all five cases after the coordinate-mount wait. Seven neighboring suites passed on the same built application, including 27 material layout combinations. Retained hierarchy audit passed with5,001 entities at200%.
- Updated deterministic edit-ledger descriptions for typography, deep Property Details, playback inert controls, render header/uniforms and material conflicts. Updated transaction documentation pending-operation count and recorded current development additions in release notes.

- Retained palette help failed because its test requested26.22 documentation from the development26.21 build. Added openProductionManual using canonical NOVA_RELEASE_NAME and routed Settings/Rendering help through it. The26.22 browser test accepts the actual build lesson only in development; qualified runs still require26.22 and now require a real matching element. Corrected conflict border to existing --warning palette token.

### Particle numeric draft controls
- Converted eight ParticleGraphEditor numeric controls (spawn rate/burst/lifetime/maximum, size start/end, trail length/width) to NumericExpressionInput, preserving bounds, steps and integer rounding. Added asset/module/field resource keys and wrapping labels. Finite guards protect the local setter. RenderingPanel passes particle asset identity and settles pending drafts before Save Asset or Apply Asset. Vector-text fields and whole particle-document conflict ownership remain separate unfinished work.

- Added particle-draft-user browser cases for expression correction, invalid Save blocking, save/reopen and copied module identity isolation. Uses the real particle asset selector and buttons; no injected app state. Type check passed; browser execution awaits rebuilt particle controls.
- All six material user cases passed on the conflict/manual build, including stale-source recovery and27 layout combinations. The prior palette-layout traversal was interrupted after the known old manual expectation failed in palette-user; no incomplete layout run is counted as passed.

- Added an open particle inspector Undo/Redo assertion, matching the already-fixed material synchronization contract; product synchronization is not yet changed. All six palette user checks passed, including actual localized help targets, on the conflict/manual build.

- Aligned the two particle size controls and trail width with their existing executed runtime maximum1,000,000, retaining larger drafts as explicit invalid input instead of storing a value that playback silently clamps. Updated transaction report text to the current2,008 operations/426 linked/1,582 pending counts (the402 declaration exclusions are a different count).

- The conflict/manual build passed material6, palette6, quality5, menu12 and package4 user cases (verified against the generated reports); downloaded player execution is included in quality/menu evidence. Particle changes were made in source while those tests exercised the previous stable dist; they require the separate particle build now running. Added explicit ledger descriptions for openManual and ParticleGraphEditor and clarified the coordinate-mount audit helper.

- Particle browser setup exposed a real layout overlap before numeric cases could run: the shrinking budget/asset grid painted beneath the graph, so the asset-selector click hit simulation backend. Inspected the failure capture. RenderingPanel now prevents the particle top grid/event timeline and graph from shrinking below content, using the existing outer scroll area. Every module/preview/control remains. The failed run is preserved as failure, not passed.

- Reproduced stale open particle values after successful Save then Undo (expected25 remained30). RenderingPanel now refreshes clean particle graphs when asset source changes, tracks their source baseline and blocks stale Save/Apply. Failed asset writes cannot create a success history entry. Dirty graphs retain a localized source-conflict notice with explicit reload. Shared conflict wording now says resource for material/particle applicability. Added a dirty-particle conflict user regression.

- All four particle numeric/history/conflict user cases passed after the synchronization fix. Converted three comma-separated particle vectors (minimum velocity, maximum velocity, gravity) into six labeled X/Y NumericExpressionInput controls with existing runtime ±1e9 bounds, .01 steps and asset/module/component keys. Preserves the opposite component and wraps at narrow widths; no vector feature is removed. Added invalid-component and exact save/reopen regression.

- Added particle user layout coverage for all14 numeric controls (Spawn, Velocity, Force, Size, Trail), checking six-digit capacity and actual hit-test reachability in27 language/scale/viewport combinations. Records three large-text captures. This is new required evidence, not inferred from the material suite.

- The vector build passed types, production build and all five particle behavior cases. Corrected test-only quoting in the newly added layout selector before execution. Extended ledger/release-note descriptions to cover six vector components, particle conflict/history boundaries and the overlap fix.

- Added particle-draft-user to the required property-authoring release bundle (now14 suites). Inspected the English200% narrow-window particle capture: numeric controls remain visible and the previous card overlap is gone. Complete27-combination result is still running and is not yet counted as passed.

### Actual editor playback stability smoke
- Added playback-stability-user:50 real Play/Pause/Stop cycles through visible controls, exact saved authored checkpoint comparisons every10 cycles, followed by save/reopen and another playback. Records browser heap/node/listener observations without claiming a leak-free, performance or72-hour qualification. This supplements the retained clone-only stability smoke.


### Playback snapshot component order
- New real playback smoke failed at cycle10: component values/UUIDs were unchanged, but collider records moved behind camera/script/UI components. Added component-order programmer regression comparing50 actual project hydrations without sorting or dropping component records. The five-palette sweep continues on unchanged production dist; its development evidence is not a qualification of later hydration changes.


- Component-order regression reproduced drift on the first rehydration. applyStoredComponents now restores Map insertion order from the authored component records after replacing collider instances, retaining required legacy constructor defaults afterward. UUIDs, removed records and all field values remain intact; no sorting is added to assertions. This prevents Play/Stop and repeated reloads from silently changing authored list order.

- Added component-order to the required transaction bundle (now21 suites). Re-running all21 current core suites after the hydration fix using separate order-core logs; prior passing logs remain preserved. Full panel sweep still uses the unchanged particle-vector dist and must not be described as final frozen-source qualification.

- Added playback-stability-user to required property-authoring qualification (now15 suites). Built current source into .cache/v2622-order-preview/dist without replacing main dist; the isolated browser rerun has passed exact authored checkpoints at cycles10 and20. The original main-dist failure remains preserved. Repository hygiene also passed31 ignore rules and15 protected paths.

- Actual editor stability passed50 Play/Pause/Stop cycles plus exact save/reopen and another Play/Stop on the isolated order-preview build. Preserved original failed main-dist report and copied successful isolated evidence to reports/v26.22-playback-stability-isolated.json with explicit build scope.
- Fixed inherited26.21 reproducibility tooling to name logs and disposable build roots from context.metadata().release, so26.22 invokes separate outputs instead of overwriting26.21 logs. Build algorithm and version guards remain unchanged; fresh reproducibility execution is still pending.

- Cloud Blue full development panel sweep passed1,171 states/25 captures across all three languages on the main particle-vector build; Meadow Cream is running. Inspected playback resource observations: heap/listener/node samples vary with collection and are not monotonically growing across these five samples; no leak-free or performance qualification is inferred. Updated release notes and physics ledger description with the verified bounded ordering/playback evidence.

- All21 order-core suites passed after component-order fix; latest Vue type check passed. Live npm advisory query was rejected by automatic approval review because dependency metadata would be sent to public npm without explicit user permission. Requested permission asynchronously; no network workaround used. The local lock/hygiene evidence is not a live vulnerability clearance.

- Fresh offline reproducibility passed pnpm version, frozen offline install, optimizedWASM build, Web build, native compile check and relocated offline repair. Relocated Web/native rebuilds and byte equality remain running. Logs use26.22 names as intended. Cloud Blue and Meadow Cream each passed1,171 panel states/25captures; Blush Berry is in progress.

### Primitive component type boundaries
- Added a strict-null-aware TypeScript schema generator for declared authored primitive fields, preserving optional/nullable unions and excluding named runtime fields. Added per-field actual paste regressions that include an earlier valid enabled edit and require the entire component remain unchanged on rejection. First run targets the unchanged validator; structured-field validation remains separate.


- Primitive corpus reproduced accepted string values for ShapeRenderer2D.enabled. componentValidation now checks595 declared primitive fields across59 concrete component identities before assignment, then applies existing enum and finite checks. Explicit undefined remains a no-op partial patch; nullable declared fields and null unlimited joint thresholds remain allowed. Corpus chooses a type outside each declared union, so legitimate mixed primitive types are not mislabeled invalid.

- All596 initial primitive cases passed. Extended each declared numeric field to reject NaN/±Infinity before any assignment (positiveInfinity remains allowed only for unlimited joint fields), and verify explicit undefined no-op patches plus declared nullability. Generated contract verification runs before the corpus, so fresh release copies do not depend on a pre-existing cache. Records per-field case indices for precise lifecycle linkage.

- Added component-primitives to the required transaction bundle (now22 suites). Running the full accepted-value/round-trip regression bundle after primitive validation, using separate primitive-core logs so previous ordering evidence stays preserved.

- Extended primitive corpus passed1,414 boundary cases across595 concrete field contracts, including undefined/null compatibility checks. The lifecycle generator now links exact passing primitive case indices to matching component declarations, while leaving its overall incomplete status and remaining UI/structured/runtime requirements unchanged. Added the generated source contract to the edit ledger.

- Primitive validation checks supplied patch keys against the schema instead of scanning every declared field for small updates. Unknown keys retain prior handling; finite/enum validation remains unchanged. Linked1,414 passed cases to463 raw component declarations; this does not close structured/UI/runtime evidence gaps.

## Event-sheet integer drafts (2026-09-13)
- Consequence review: existing native number inputs did not support retained expressions; substituting controls must preserve integer ranges, asset/handler identity, transition decisions and clean no-op history. The shared control defaults remain unchanged.
- NumericExpressionInput.vue: add opt-in integer validation with EN/DE/ZH inline errors; no rounding or altered float behavior.
- EventSheetEditor.vue: replace priority/seed inputs with keyed bounded integer drafts; settle before Save and all existing guarded transitions. Save stays reachable for an uncommitted numeric draft; an unchanged Save returns without history. Seed runtime unsupported disposition is unchanged.
- generate-v26.22-edit-ledger.mjs: record both modified production paths. Verification pending.

- Added verify-v26.22-event-draft-user.mjs: actual browser input/rejection, blocked asset and code transitions, Escape recovery, exact asset Save/project reopen, focused Save and clean Save no-op. This is scoped development evidence, not complete event runtime qualification.

- Extended event-draft-user with a real saved-asset Undo/Redo display check; previous four browser cases passed on isolated event build17.66s, Vue types passed. New history check is a regression probe, not yet a pass.

- Real event-sheet history probe failed: open priority did not follow Undo (v2622-event-history-before.log). Consequence review: refresh only a clean draft whose saved source changed; preserve dirty content and existing explicit source-conflict recovery. EventSheetEditor.vue now watches saved source and reparses clean values, reporting malformed replacements.
- Strengthened event-draft-user to assert downloaded undone asset value before checking displayed value. Added the new suite to property-authoring (16 suites). Updated ledger description.
- All five event browser cases passed after clean-source refresh. Extended the suite with dirty-source Undo/conflict/reload and numeric controls across27 locale/scale/viewport combinations. All five full palette development sweeps completed successfully on the preserved particle-vector build.
- Added event-validation programmer probe for API numeric, kind, callback and destination rejection, requiring unchanged whole-project bytes and asset generation; valid extreme integers are retained. Existing event Save normalizes before writing, so malformed authored values may silently change. No production owner fix yet.

- Six event browser cases passed, including dirty-source Undo/reload. Layout probe stopped on missing event tab after workspace switch; fixture now waits for the actual mounted tab before clicking. Production layout is not yet declared passed.

- API probe reproduced saveEventSheetAsset accepting NaN priority and normalizing it (event-validation-before.log). Consequence review: constrain authored Save only; keep legacy parse/normalize compatibility. eventSheets.ts now validates destination type, handler kinds and shared draft numeric/callback constraints before transactional write; no earlier valid field can leak on rejection.
- Added event-validation to required transactions (23 suites), updated runtime edit ledger description.

- Entity API audit now exports the exact forwarding alias table already exercised by its actual owner/serialization assertions. Lifecycle discovery validates those named passed cases and canonical component IDs, then links21 direct Entity aliases; nested material links remain container-scoped and no history/export/runtime pass is inferred. This edits only evidence tooling, not Entity behavior.

- Current-build event tests again passed six behavior cases; layout fixture reached Manage before its asynchronous navigation mounted. Added an explicit mounted-navigation wait, preserving all27 layout assertions. API accepted-value corpus passed24fields/50cases after save validation;21Entity aliases linked with unchanged incomplete lifecycle status.

- Linked30 executed event Save assertions to its public-operation entry and named rejection cases to8 raw/canonical event-field rows. Remaining input/load/runtime stages stay separately pending. Current template-output check passed40templates/6checks (actual Web output bytes and structural Windows packaging; no native player launch claim).

- Full27 event-layout sweep exposed actual hit-test failures for priority controls at large scales; inspected English200%1024 screenshot. The event main pane was constrained below scaled toolbar/object context and its sticky header covered the remaining list viewport. EventSheetEditor.vue now scrolls the main pane, keeps toolbar/context natural height, allows the event list to grow, and uses a scrolling (nonsticky) list header in narrow panes. All fields and animations remain.
- worldAudit17 workspace helper now awaits actual aria-pressed activation and asynchronously mounted Manage/Script/UI content. Foundation rerun had failed before reaching a case because the prior fixed350ms delay returned before Manage mounted. Assertions remain unchanged. Updated ledger descriptions.

- Updated VERSION_26_22_TRANSACTIONS.md and RELEASE_NOTES_26_22.md with primitive/event changes, exact inventory427/1,581 operation counts, scoped template results, and still-pending layout/frozen qualification. Corrected palette totals from log-progress counts: each completed report contains1,172 results plus27 matrix rows (five palettes;25captures each).
- Both application/tooling type checks passed after event API validation. Main event-scroll build passed53.71s under concurrent audit load; no performance inference. A foundation browser started during that build failed loading Manage; preserved log and restarted the batch only after the build completed.

- Event scroll rerun completed7/7browserchecks including27configurations; inspected correctedEnglish200%1024 screenshot showing reachablepriority. Updated release/transaction docs to this verified scope. Current-build Foundation5cases and Property8cases passed after the asynchronous workspace wait fix; retained runtime-input suite nowrunning. No26.22freeze/package.

- Extended Entity API audit with28wrong-type boolean candidates acrossautoInertia/isSensor/isStatic/isKinematic, asserting whole-entity preservation. This probes public JS callers that bypass TypeScript; no production setter change yet.

- Entity boolean probe failed on autoInertia=0. Reviewed all literal setter callers: existing calls provide booleans and legacy hydration alreadychecks typeof. Added TypeError before mutation for autoInertia/isSensor/isStatic/isKinematic; valid true/false behavior unchanged. Mainbrowserdist intentionally remains the preceding build while retaineduserbatchruns.
- Found propertyAudit22 left an older passingreport when a suite threw before write(). It now replaces the result with explicit incomplete/unqualified evidence at start, after authority checks; a crash/interruption cannotreuseoldpass. Added next regression to verifythiscase; no claimthatincompleteisfailedsuccess.
-135paletteSettingslayout combinations passed on isolated eventhistory build; remaining retained palette assertions stillrunning.

- Added audit-reporting regression: establish a passingreport, start a rerun that throws before completion, require nonzeroexit plus incomplete/unqualified/empty-case replacement. Other authority/empty/failed/development semantics remain tested.

- Boolean Entity audit passed5cases (28wrong-type candidates plus retained owner/hydration/mode cases). Reporting guard passed5cases includingthrow-before-write. Started fresh23core suites againstcurrent source.135palette-layout finishedexit0,2checks140observations; isolatedbuildscope retained. Mainuserbatch progressed throughAdvancedInspector; currentmainbuildpredatesonlybooleanrejectguards.

- Fresh23core run found a real regression in earlier supplied-key primitive lookup: a constructor paste key resolved Object.prototype.constructor and crashed allowed.includes. Previous22core finished thiscase before the optimization;1414primitive schema cases lackedreservedkeys. componentValidation.ts now uses own-kind andown-field lookup (alsoenumkind). Expanded document-boundary regression withtoString/valueOf/hasOwnProperty, preserving prototype and ignoringreservedfields whilevalidmassapplies. No prototype mutation wasobserved; thisfixrestores prior validpastebehavior.
- Corestoppedatdocument-boundaries; preserve .cache/v2622-boolean-core-document-boundaries.log. Rerunprimitive/domain checks andresume remainingcore suites; no previouspassisacceptedforthereserved-keybug.

- Own-key fix passedprimitive1,414,document-boundaries andEntity5regressions;canonicalcomponentcorpus also passed. Remainingcorecontinuesfromcomponent-history. Currentbrowserbatchpassedallparticle6cases and27configs;playback50isrunning. Updatedrelease notes withboolean rejection/reservedkeyfix/auditinterruptionreporting;noqualifiedreleaseclaim.

- Retainedmainbrowserbatchcompletedall16suitesPASS, including50Play/Pause/Stop anddelivery. Typecheck caughtObject.hasOwn unavailable inconfiguredTSlib; switchedproductionchecks toObject.prototype.hasOwnProperty.call ratherthanraisingtheplatformbaseline. Node-onlytestObject.hasOwn remainsvalid. Sameown-keysemantics; fulltype/buildandtargetedregressionsrerun.
- Added identity operation audit: actual production source, native crypto sample,40 supported version/variant/case normalization combinations, malformed values without object coercion, byte-source fallback, and legacy no-crypto shape. ProjectData explicitly shares the currentUUID1–5 contract, so newer versions are not silently added. No production identity behavior changed.

- Identity audit passed5namedcases. Linkedboth exported identity operations toexactpassed case/report records andaddedidentity torequiredtransactionbundle (24suites). Fallbackassertions verifydispatch andstandardversion/variantoutput, not incidentalrandomcallcounts. No production changes.

- Final checkpoint for this audit segment: all running sessions completed successfully (core resume, compatible-key regressions, both type checks, build, all16 retained browser suites, focused rebuilt property/event checks). Build17.08s. UUID5checks passed; operation inventory280sourcefiles/2,008operations/429linked/1,579pending. Updated the transaction development record with readable scope and current24-suite runner; full lifecycle/operation closure and frozen release remain incomplete. No26.22release files generated;11priorfiles verified unchanged.

## Continuation — rendering draft recovery (2026-09-14)

- Reviewed the completed checkpoint, current diff, roadmap and transaction record; preserved all prior changes and earlier release outputs. No version alignment or packaging yet.
- RenderingPanel.vue: preview normalization now refreshes only clean advanced JSON buffers. Malformed text remains editable with localized field-level errors. Material Save validates both raw objects before applying either; clean external refresh also checks raw-buffer dirtiness. Existing shader/graph/animation features remain present. Added a browser regression; all seven material checks passed on the first JSON build, including 27 layout configurations.
- studioDraftRetention.ts: added separate material and particle kinds mapped to their actual material/particleSystem assets. RenderingPanel.vue registers live-record/session owners, retains exact graph/model and advanced JSON/baseline drafts on selection changes and unmount, restores conflict identity, clears caches on explicit reload/successful Save, and cancels preview timers on unmount. Global project Save still does not save every studio asset; this change is session recovery, not closure of that separate requirement.
- verify-v26.22-rendering-recovery.mjs: eight passing store checks cover both kinds, exact malformed text, project/object/type isolation, changed-source conflicts, mounted departure capture, explicit discard and failed-load rollback source matching. Added this suite to the required transaction runner (now 25 suites).
- Extended material and particle browser suites with asset-switch and panel-replacement recovery cases; the material suite also checks malformed JSON after panel replacement. The first run caught a real watcher-order bug (8 returned instead of unsaved 11): source refresh ran before the asset-selection recovery callback. Restricted both source watchers to the already loaded asset UUID. Preserved failing evidence in .cache/v2622-rendering-recovery-material-user.log; unchanged regressions are rerunning against the fixed build.
- Updated the edit-ledger generator to describe every production edit and the new recovery audit. Type check passed before the watcher guard; fixed build passed in 13.73s. Final affected browser checks and type checks remain in progress for this segment.

- Final rendering verification: fixed material browser suite passed8, particle suite passed7, each including27layout configurations; source typecheck passed. Recovery core expanded to10 cases with project-scoped clear checks and direct-call evidence; linked5 additional store operations. Existing prior11release files again verified unchanged.
- src/runtime/tilemap.ts: reproduced an overlapping-bake race in which a cancelled predecessor's finally block stopped the active successor. Restrict error/final state updates to the current controller; cancelled requests return their own initial chunk count/result, and controller installation follows normalization so invalid input cannot strand a controller. No rendering/animation/collision features removed. Four bake checks passed: different-size overlapping requests, cancellation/idle no-op, malformed request cleanup, deterministic completion. Added verify-v26.22-tilemap-bake.mjs to required transactions and linked its two directly checked operations. Before evidence: .cache/v2622-tilemap-bake-before.log; passing evidence: .cache/v2622-tilemap-bake-after.log.
- scripts/lib/constructorFactoryEvidence22.mjs and verify-v26.22-operation-linking.mjs: added conservative static inference for direct constructors and straight-line const-instance test factories. Reject ambiguous branches, mutable/computed returns, assignments, shadowed or unknown constructors, async/generator factories. Four audit-tool regression groups passed. Initial unrecognized-factory result returned undefined rather than null; corrected before integration; no production behavior affected.
- scripts/lib/operationEvidence22.mjs: use the tested factory references to associate actual named retained test cases with World/BoxEntity operations rather than leaving their instances unresolved. Public audit remains incomplete and does not claim full input-domain coverage. Inventory now280TSfiles,2,008operations,455with cases,1,553pending. Required transaction runner now27suites (added rendering-recovery, tilemap-bake, operation-linking); property-authoring remains16.
- Final source typecheck and Node configuration typecheck passed; fresh main Web build passed13.35s (.cache/v2622-recovery-bake-final-build.log). This last build includes the tested rendering recovery and tilemap fix; the browser suites ran immediately before the tilemap-only production change. No frozen qualification and no26.22release files yet.
- Read-only follow-up: project-test seed remains unbound; GameplayRuntime.beginSession resets the replay seed before initialize/lifecycle, while runOne calls it without seed and runProjectTests substitutes test.seed || fallback (losing zero). No seed/runtime changes made; proper binding needs actual VM output, retries and replay-state restoration tests. Existing runtime gaps remain explicit.

## Continuation — manifest ownership, strict package switches and observed operation calls

Consequence review: package enable/permission/safe-mode APIs accepted truthy non-booleans, allowing incorrect programmer inputs to alter approvals. Package enable and permission now return false for those inputs; safe mode throws a clear TypeError before side effects. Existing boolean behavior remains. The package suite now passes seven cases, including eight invalid input forms and entire project/plugin-state preservation. The inert plugin fixture does not execute a plugin.

Manifest paths were reviewed against native validation and every folder/transaction writer. Those owners require Packages.lock; allowing a custom manifest lock path caused a real native reopen failure. normalizeProjectManifest now enforces that existing fixed contract. Thirteen manifest cases pass, including compatibility boundaries, path normalization, preset insertion/reordering/removal, named history, WASM migration and NovaPak reopen. Preset arrays are canonical unordered path sets, explicitly reflected in expected values; directory fields remain metadata and this is not filesystem relocation evidence.

Declaration evidence now uses the actual ObjectBlueprint prefix and explicit authoring/scene/manifest owner prefixes. Twenty-five additional per-field derived dispositions identify Entity lookup/cache/solver fields, SceneDocument editor status, SceneManager navigation state and DirectClipPlayback session state. Every disposition now requires a substantive string reason; no generic property pass was added. The matrix contains 2,732 rows and 220 raw declarations remain unclassified at this checkpoint.

The Web build and both type checks passed after the production corrections (.cache/v2622-manifest-package-*.log; build12.78s). New optional browser tracing uses positive V8 function-entry counters within named assertions and checks source/bundle/map hashes. A real V8 fixture caught nested callbacks being attributed to their outer declaration; this was corrected. Five checks now pass: exact invoked functions, changed source, changed bundle, changed map and escaping paths. source-map-js1.2.1 is an explicit dev dependency installed offline (zero downloads), keeping audit resolution reproducible. No runtime dependency or version authority changed.

The isolated hidden-map build matches all64 main JavaScript bundles byte-for-byte. Four package browser cases passed; 434 distinct operations executed within their assertions. Verified links increase named-case inventory coverage from455 to774 of2,008, leaving1,234 pending. These links show execution during asserted workflows, not isolated operation correctness, complete input-domain coverage or performance qualification. A retained browser batch is still running on the isolated build. Main source edits do not change that build; fresh frozen qualification remains required.

New/updated audit files: manifest corpus, declaration evidence, property lifecycle generator, reviewed disposition fixture, package lifecycle, transaction runner (28 suites), operation coverage mapper/regression, optional browser harness tracing, browser evidence linker and public-operation inventory. The path-level ledger lists each authored file, including package.json and pnpm-lock.yaml. No26.22 release artifacts or qualification claim has been created.

## Continuation — nested geometry, direct execution evidence and retained path text

Connection coverage: new verify-v26.22-connection-corpus.mjs passes55 cases covering scalar values, all connection kinds/styles, checkpoint rope-node/break/tension fields, every anchor mode, insertion/removal/reordering, stable reference resolution and coupled binding normalization. Whole connection records are compared through Undo/Redo, WASM migration and NovaPak reopen. Its first structural fixture accidentally retained the template camera and reused numeric IDs; the isolated fixture now explicitly clears its entity list before creating its three owners. No engine behavior was changed to accommodate that fixture.

Nested component coverage: new verify-v26.22-nested-component-corpus.mjs passes35 checks, independently mutating BonePose2D, AreaEffect2D, PhysicsMaterial2D and editable Transform fields, enumerating area-effect and material-combine enums and comparing entire entities through history/native/export. Angular comparison accounts for the existing modulo normalization's floating-point rounding; saved whole-record comparisons remain exact. The attempted Transform.enabled edit exposed its intentional fixed invariant: Inspector omits enable/remove actions, Entity rejects removal and hydration restores enabled/present. This is explicitly classified and tested, not presented as an editable field.

Metadata corpus now includes all19 AuthoringObjectKind values, path point insertion/reordering/removal, tangent arrays/clear and path-reference metadata, for45 fields/75 cases. Script-asset corpus adds both valid-prefab and null blueprint source variants. Declaration aliases link those actual owner rows. The reviewed-disposition fixture now contains490 per-field entries, including eleven immutable build-preset defaults and52 reviewed identity/generated/publisher fields. Exact package owner names were corrected to installPackageManifest and diagnosePackageResolution. These are specific exclusions from independent property editing, not feature/domain passes. Matrix checkpoint:2,834 rows;480 direct declaration links and52 populated-container links;58 raw declarations still await classification.

Browser execution batch: the package trial and all15 remaining retained suites passed on the isolated hidden-map build, including50 Play/Pause/Stop cycles, exact restoration and delivery/save/reopen. The initial joint click missed its target during scrolling under profiling; the test now verifies a settled unobscured target, as its later click already did. Its corrected case passed. Existing input assertions remain unchanged.

Programmer execution tracing: optional Profiler entries are captured from real generated bundles using hidden maps, before cleanup; copied JavaScript/maps and current source hashes are retained and checked. nodeOperationTrace22, nodeOperationEvidence22 and trace-v26.22-retained provide explicit supplemental tracing. Both close-before-report and report-before-close lifetimes are supported. Whole-suite assertions are stored separately from original per-case checks, preserving their schemas and counts. An initial aggregate-in-checks layout broke a covers-array reader; report annotations were moved without changing original execution statuses/timestamps, and linking then passed. All20 selected programmer suites passed with tracing. The mapper was strengthened to reject nested named declarations as outer-owner execution; its five regression cases pass. Audit-reporting's five failure/interruption safeguards also still pass. Retained runtime tracing is in progress; the49-check animation suite passed but first lacked maps because it has a custom loader, now optionally instrumented along with the interface suite. Profiled runs are not performance qualification.

Real path edit defect and fix: ConfigPanel previously flat-mapped valid tokens and silently discarded malformed point/tangent entries, applying partial geometry. New pathTextDraft.ts parses entire entries and rejects malformed/count-invalid input without truncating. New PathTextInput.vue retains text, displays EN/DE/ZH inline diagnostics, supports Escape and registers with pending-edit boundaries. ConfigPanel preserves geometry/history/prefab callbacks for accepted values and settles drafts before reusable-path Save. Valid decimal, exponent, signed and hexadecimal coordinate formats and blank automatic tangents remain supported. Six parser checks pass. The new actual-browser path suite passes four cases: invalid-text/Save/playback blocking with unchanged geometry; focused immediate Save/reopen; independent point/tangent Undo/Redo; and readable/reachable controls/errors across27 locale/scale/viewport configurations. Vue types passed and the new main Web build completed in15.25s. This main build is later than the isolated tracing build; their evidence is not conflated.

Required runners now contain32 programmer transaction suites and17 property-user suites. Latest verified operation checkpoint:281 TypeScript files,2,009 entries,1,030 with named evidence and979 still pending. Version authorities remain26.21.0; no frozen26.22 candidate or release artifacts exist. All requested release completion work remains active; these development passes do not constitute release acceptance.

## Continuation — scene ownership and studio Save boundaries

Preserved all earlier changes and eleven 26.21 release payloads. The preceding retained-runtime trace batch completed all eleven suites; package/plugin lifecycle now has fifteen passing cases, including eight whole-state history/native/export cases. Reference ownership has three passing whole-document cases covering fifteen hierarchy/prefab/scene-layer declarations. The derived-declaration fixture contains509 specific dispositions. Optional tracing was also added to the retained animation-authoring loader without changing its fifteen assertions.

Read the26.22 roadmap again before changes. Added `scripts/verify-v26.22-scene-ownership.mjs`: native/NovaPak load flags and outgoing data, sole-loaded-scene rejection/fallback, defensive capture/reload copies, and malformed boolean flags before draft settlement. Export compares exact decoded asset bytes because NovaPak legitimately changes source representation. The first three cases passed; malformed flags failed before the fix. `src/world/SceneManager.ts` and `src/store/physics.ts` now reject nonboolean load flags before any mutation/settlement. All four cases pass. Added the suite to required transactions.

`scripts/lib/declarationEvidence22.mjs` and `scripts/discover-v26.22-property-lifecycle.mjs` now link six remaining raw declarations to exact scene, component-order and blueprint case names. Scene load/selection are explicitly persisted editor navigation state, not independently Undoable Inspector properties. The2,854-row matrix has509 direct aliases,54 populated containers and six named scene/reference ownership links. This closes raw declaration classification, not every lifecycle/runtime/structural domain.

Optional hidden source maps and actual entry tracing were added to retained26.12 language, language-editor and typed-graph tests. Existing assertions and default output destinations remain; optional report paths avoid overwriting historical reports. The tracing wrapper accepts these three suites and forwards the report argument. All three passed; the typed graph suite recorded72 executed entries. The refreshed inventory had2,009 operations,1,158 linked and851 still pending before the following new production changes. Profiled runs are never FPS qualification.

A new `scripts/verify-v26.22-studio-save-boundary.mjs` reproduced project Save silently succeeding with a retained studio draft. `src/editor/studioSaveBoundary.ts` now lists pending asset names with English/German/Chinese guidance to save/discard in the owning editors. `saveProject` checks after numeric settlement, before writing; `src/runtime/gameExporter.ts#buildGame` now settles pending numeric edits and checks studio drafts before synchronizing settings, changing progress or packing. This deliberately rejects incomplete Save/export rather than writing recovery wrappers as asset source. It does not automatically save arbitrary studio recovery data. All15 studio kinds have actual Save/export rejection and exact draft-retention assertions, plus mounted numeric ordering, localization, clean Save and compiler-invalid-draft checks.

The first material browser attempt looked for an error banner, but the captured UI correctly used the existing error toast; the selector was corrected. The next attempt exposed a real mounted-conflict defect after Undo replaces asset records: pending-draft discovery excluded the old mounted record. `studioDraftRetention.ts` now reports such mounted conflicts if a matching current asset exists while keeping the WeakMap recovery on the original record. Explicit discard clears the original cache only after successful callback. Failed-open snapshots include these conflicted owners, and only explicit rollback restores by UUID under the existing saved-source check. New regressions failed before both fixes; all20 boundary checks and all10 existing rendering-recovery checks now pass. No ordinary import/Undo receives automatic draft migration.

`scripts/lib/userFixtures22.mjs` adds real-menu Save rejection checks: visible error toast and an empty download folder. Material/particle browser suites now assert rejection while drafts/conflicts remain, then retain their asset Save, reopen and restored-source comparisons. These browser reruns are in progress against the newly rebuilt source; initial failed attempts remain in cache logs. Required transactions now35 suites, property-authoring17. No26.22 freeze or release yet; authorities remain26.21.0.

## Continuation — exact operation evidence and playback boundaries

The completed second-generation programmer trace batch passed all 24 suites; retained runtime, language, graph, asset and workspace traces also passed. Source mapping now matches declaration name and kind as well as position. A real compact-source regression demonstrated that the previous line-only mapper missed/conflated declarations. Only mappingVersion 2 entries are accepted; older trace links are invalidated rather than counted. Five mapper regressions cover executed/unexecuted compact functions, same-line getters/setters and artifact/source integrity. Browser build v2 matched all 64 JavaScript bundles byte-for-byte; traces are execution evidence, never performance measurements.

The latest unprofiled material (8), particle (7), delivery (3) and retained Save/recovery (9) suites passed. The profiled browser continuation passed through connection drafts, then exposed an outdated event-sheet fixture that expected global Save to omit unsaved source. The fixture now asserts a visible blocked Save, no download, retained local draft, explicit conflict reload, and correct saved source after recovery. Its 27-layout sweep remains part of the suite.

The explicit public-operation exclusion fixture has 93 individually named entries with source hashes and reasons; four regressions enforce path boundaries, source freshness, duplicates and precedence of actual executed cases. Exclusions never become passing cases. Added optional tracing to retained v26.12 syntax slots/API signatures/modules, v26.13 workspaces, and v26.15 assets/sprites/Tiled. The v26.15 asset context accepts current development source only under the conjunction of tracing, development and explicit 26.22 qualification target. The extracted export fixture supplies its two new boundary dependencies and checks order; actual boundary behavior is tested separately against production modules. Additional batch/resource-handler tracing retains original assertions and default behavior.

The property generator now carries primitive/API/event validation evidence into lifecycle cells, distinguishes 50 concrete constructor tags from abstract component declarations, propagates named owner evidence to envelopes and fixed vectors, and retains runtime limitations. Both abstract declarations were explicitly excluded from concrete constructor matching after executable generator failures. The generated matrix has 2,854 rows, 509 direct declaration links, 54 containers and six scene ownership links. These counts are an inventory, not universal correctness. Runtime family evidence now names 22 executed families, adding dynamic Rhai values/closures, structural slots, module reload, resource variants and blueprint instantiation with their exact tested scope.

Playback review found that toolbar/command-palette/replay entry points could continue after numeric draft rejection. Physics playback now returns an explicit success boolean, settles numeric edits and refuses global Play/step when studio drafts would be omitted, with localized recoverable-source feedback. ActionBar, CommandPalette and ProfilerPanel honor rejection before starting gameplay/recording. Animation preview explicitly opts into its existing local-draft workflow and still honors invalid numeric rejection. No animation behavior was removed. The failing-before regression expected false but received undefined; 21 production-module cases now pass, including all 15 studio types, unchanged source/progress, stale-record conflict identity, explicit rollback, localization, clean Save/playback and preserved asset-preview drafts. Vue types pass; production Web rebuilt successfully in 12.45 seconds. Additional current-source browser checks are running in an isolated v3 build so older evidence artifacts remain intact.

Remaining: finish current browser regressions, review unresolved operation/field dispositions and conditional-panel evidence, refresh documentation/ledger, align actual release authorities, freeze source and run every required qualification gate, then package and verify exactly eleven 26.22 files. No 26.22 package or qualification is claimed here.

## Continuation — aligned 26.22 source and expanded command audits

All eleven version authorities were preflighted and atomically aligned to 26.22 / 26.22.0. Project Format 2/schema 29 is unchanged. Fresh WASM release build completed in 44.73 seconds; Vue types and the aligned Web build passed (12.31 seconds). The six current reference projects verify. The offline teaching generator added all three 26.22 lessons and retained 120 starter lessons; the walkthrough generator verified all 40 templates. These are preparation results, not frozen release qualification.

The v3 browser continuation passed event, material, particle, playback stability, delivery and package suites. A dedicated new studio-playback browser suite passed all three cases: dirty event drafts block Play/Step with visible retained-source feedback; explicit asset Save permits Play/Stop with exact authored document retention; malformed numeric input blocks playback and Escape restores it. Its initial redundant workspace switch after Stop caused a test-navigation timeout; the corrected case continues in the already-open event editor and passes. No production change was made for that timeout.

The current aligned foundation, animation-authoring (15) and Save/recovery (9) regressions pass. A new isolated v4 build matched all 64 emitted JavaScript bundles byte-for-byte; hierarchy, animated menu and output-quality browser traces pass. The hierarchy test reaches the final row of 5,001 entities at 200% scale without rendering all rows. Traced executions do not qualify timing or memory performance.

New required programmer suites: authoring-actions (35 cases) checks world-coordinate alignment, distribution, mirroring, grouping, gizmo transactions, clipboard/remapped identities, locked/empty selections, isolation restoration, nine UI creation paths, TileMap creation and layer add/duplicate/delete/order with exact Undo/Redo and native reopen. Resource-actions checks seventeen resource creation paths, schema/table Save, typed row diagnostics, texture/audio import profiles, bulk metadata, render presets and build profiles/presets with exact native reopen/history and no-op suppression. Fixture corrections use actual component kind IDs (Image/Text/TileMap2D), the declared General texture profile, and explicit outer transactions for composed layer actions; they do not alter product behavior. Import-profile persistence uses script records deliberately and does not claim decoder/transcoder quality.

The operation exclusion fixture now holds 476 individually named, source-hashed records. Reviewed exclusions distinguish transient runtime/GPU/audio/network/debug state, editor-only layout/cache/learning/shortcut state, and read-only/generated diagnostic calculations from authored project mutation. Exclusions are never counted as passed cases; external security/device/runtime correctness is not certified by exclusion. Actual command/resource traces supersede exclusions when an executed case exists. Latest inventory: 2,010 operations, 1,363 with executed case links, 421 currently unexecuted scoped exclusions, 226 still pending. Remaining authored API paths are being reviewed; the inventory is not yet complete.

The ledger generator now includes Cargo/Tauri authorities, schema fixtures and every changed manual file as well as existing authored source paths. Required transaction suites: 38. Required property-authoring suites: 18. No 26.22 source freeze or release package exists yet. The next phase remains closing dispositions/remaining commands and documentation, then all 22 frozen qualification gates and exactly eleven independently verified release files.

## Current continuation — additional API regressions and execution retention
Version remains 26.22.0, Format 2/schema 29. No frozen candidate or release packages yet.

- Graph unlink now removes both metadata and real source comment markers; strings/block comments containing marker-like text remain untouched. Six graph cases and all retained language/editor/typed-graph suites passed. Web build after this fix passed in 12.79 seconds.
- TriangleEntity.vertices now rejects non-array, missing and nonfinite coordinates before either renderer or collider mutation. The new regression first reproduced the old partial-write error; six Entity API cases and valid shape authoring pass. Valid vertex count/shape behavior is preserved.
- rebindInputAction now rejects fractional/nonfinite indices before mutation; supported integer indices 0–31 are unchanged. Corrected actual lowercase device fixture reproduced the defect, then the new regression passed.
- Authoring actions expanded from 35 to 42 cases: Circle/Triangle creation, manual connection routing/repatch, compound binding/translation, repair/delete, blueprint derivation/instantiation and scene instance unpack, with exact transaction Undo/Redo/native reopen. All 42 passed. Scene ownership expanded to five cases including rejected missing/self/cyclic inheritance.
- Resource actions now include trash/restore/purge, team ownership/task/note/build metadata, binary lock ownership, tile layer duplicate/remove, clipboard/mirror and virtual control creation, plus input binding rejection. The expanded suite passed; see release-audits/v26.22-resource-actions.json for the exact count.
- Added real-WASM automation-actions audit (preview/apply/rollback, permissions, stale source, atomic command failure, cancellation). This is still under verification. The module audit helper has an opt-in bundled-WASM initializer and real clock; its default remains unchanged. Initial failures were uninitialized bundled WASM and missing Performance in the Node test host, not engine defects.
- Supplemental node traces now retain separate reports/v26.22-trace-* reports, explicitly development/unqualified. A concurrent development focus run completed its individual transaction suites but aggregate validation correctly rejected a report being rewritten by a targeted rerun. It is not a passing focus run. Final qualification will be serial and fresh.
- Public operation disposition fixture now has 581 individually identified entries. Source hash for input.ts was refreshed only after reviewing the isolated index guard change. Generated inventory counts are transient while the supplemental execution batch refreshes overwritten reports; do not claim coverage from stale counts.
- Active supplemental tracing batch: .cache/v2622-v3-node-traces.log. Remaining work: complete operation/field/conditional UI dispositions, refresh documentation/manual, final build/source freeze, all fresh gates and exact eleven release files. No previous release artifact was replaced.

## Final source review additions
Public operations now classify all 2,010 entries: 1,461 execution-linked and 549 explicit exclusions. All 2,854 fields have named owners and stage dispositions; limits remain explicit, with 22 observable executable-family links. The current Vue inventory enumerates 84 surfaces, 3,011 controls and 1,623 conditional/repeated sections.

Additional production edits: projectIntegrity binds repair previews to reviewed source/output using a WeakMap and checks numeric/studio drafts before applying. CommandPalette logs rejected repair. graphProduction validates wire endpoints independently during node replacement. AssetDatabase embedded-image creation aligns display filename with stored path. These preserve valid behavior and fix reproduced stale overwrite, dropped wire and reopen path changes. Each has a passing regression. No feature/animation removed.

New required suites: automation-actions (5 real WASM cases), repair-actions (8 project/repair boundaries), operational-metadata-actions (6 including actual local Ed25519 verification) and audit-dispositions (3 classification checks). Graph actions now 9 cases; authoring actions now 45. Resource actions include embedded assets, recovery, reimport, weights, tile strokes, package quarantine and real File import/cancellation. All passed. Asset traces were refreshed after the filename fix; source hashes and line identities were revalidated.

Audit infrastructure edits: optional bundled-WASM/real-clock initialization in mediaAudit16; separate supplemental trace reports; canonical field stage linking with explicit limits; panel generator uses the same write/verify path for Markdown and JSON. Updated all release/migration/contract documents and three language lessons. Fresh frozen qualification and eleven-file release packaging remain required after this source checkpoint.

## Release candidate 1 formatting correction
The frozen candidate passed native builds, WASM, Web, TypeScript and Rust tests. The Rust formatting gate detected line wrapping in crates/nova_format/src/lib.rs. Applied rustfmt to the test-kind validator and its regression test; no expressions, accepted values or runtime behavior changed. Formatting and workspace Clippy with warnings denied now pass. Candidate 1 evidence remains retained; a new immutable candidate will qualify the corrected source.


## Packaging preflight correction
Updated the edit-ledger generator and generated ledger to identify their deterministic path-level manifest, as required by the existing evidence validator. No validation was weakened and no runtime behavior changed. Corrected the qualification plan to pass reference project IDs rather than full project.nova paths; this plan correction is retained in release-audits. Earlier interrupted candidates remain retained.


## Frozen qualification harness isolation
Candidate 3 passed seven build/source gates and all 43 transaction suites, then stopped at the missing reproducibility package-manager environment. The milestone runner now propagates its pinned pnpm entry to focused child audits. The retained reproducibility audit reads the current release's pnpm log rather than a stale 26.21 path. Both canonical component/settings corpus audits now write runtime output into release-audits by default; explicit --write-discovery retains development source regeneration. Settings failures also write outside source. Preserved the observed overwritten settings report in cache and restored its frozen development copy. No product behavior or acceptance assertion was weakened.


Harness verification: all 580 canonical settings cases and 721 canonical component cases passed; the retained settings source report hash is unchanged. The complete offline clean-source/moved-path reproducibility audit passed all build steps, including fresh native checks and exact Web output comparison. Candidate 4 will run the full qualification against these corrected audit tools.


## Retained animation test fixture update
Candidate 4 passed seven build/source gates, 43 transaction suites, clean/relocated reproducibility, language/module/template checks and initial animation suites. A retained animation preview fixture still returned undefined from toggleSimulation; the current production API returns a success boolean. Updated that fixture to return true for accepted playback, validate asset-preview options, and added rejection coverage proving no lifecycle start or draft loss. All 15 animation UI tests pass. No engine change or weakened assertion. Remaining suites are being exercised before the next immutable candidate.


## Network process audit startup correction
The remaining-suite preflight found Vite SSR peer startup blocked by concurrent evaluation of interdependent modules. The test peer now loads its five entry modules sequentially; production networking is unchanged. All four actual three-process UDP checks passed: impaired late-join baseline, authority transfer/movement, third-peer baseline, and disconnect/reconnect epoch rejection. Renderer and remaining release gates continue in preflight before the next freeze.


## Remaining release preflight completed
After the fixture corrections, renderer, template output, historical compatibility, template catalog and layout contract passed. Cloud Blue passed 1172 measured layout states with 25 captures and no recorded console errors; the other palettes will run in final frozen qualification rather than duplicating the full matrix in preflight. The complete user-interaction/authoring bundle passed, followed by Windows export/launch, headless runtime, performance, local stability, offline dependency security, hygiene and manual checks. These preflight results are not the final source-bound release qualification. The next candidate runs all 21 gates and packages only upon success.


## Network peer startup stabilized with bundled modules
Candidate 5 reached the network-process audit but the Vite SSR peer again failed to signal readiness within its 30-second limit. Sequential SSR entry evaluation was insufficient. The test peer now uses the same real production-module bundling helper as the passing networking module audit, restores actual timer functions, and retains real independent-process UDP behavior. Added startup-phase and child-exit diagnostics to the process audit without extending deadlines or weakening assertions. The initial bundled-peer run and three successive runs after the full networking stress suite all passed every network-process case. Production engine networking is unchanged.


## Focus report identity correction
Candidate 6 completed the focused behavior commands, including the corrected three-process network peer, rendering, and all 40 template-output checks. Bundle assembly rejected the template-output report because its expectedRelease field was absent. Added that field from the existing release/source authority; no test or validator was relaxed. A fresh 40-template output run and strict one-report bundle assembly passed. All inspected focused reports now expose the expected authority where required.

