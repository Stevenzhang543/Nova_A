# Nova_A26.14 object authoring and ownership UI development

Integration notice: this historical development journal retains staged paths, intermediate failures and pending-at-the-time findings. Its reviewed authored files are integrated into the26.14 candidate after26.13 was separately finalized. Copied Cargo/support trees, scratch typecheck-stage.mjs and generated stage outputs were excluded. Current behavior and final evidence boundaries are in [26.14 release notes](RELEASE_NOTES_26_14.md); executed-gate records determine production qualification.

This is isolated development staging. No file here qualifies26.14 or changes the frozen active release. Existing26.13 UI changes must be merged before integration; source manifests record the staging baseline separately.

## Consequences assessed before implementation

- Ownership must come from actual blueprint/prefab/Event Sheet references and declared callback authors. A matching name is not proof of ownership. Cycles, missing sources and unresolved inheritance must appear as diagnostics.
- Whole-array prefab override records cannot justify marking every component property overridden. Compare the specific authored property to the matching source component by kind, and report unavailable baselines honestly.
- Reading ownership must not normalize or mutate live entities. In particular, existing serializeEntity calls normalizeEntity; the UI requires a dedicated read-only snapshot or the runtime's captured pre-Play baseline.
- Runtime script properties are distinct from authored properties. The runtime accessor supplies separate detached values and marks runtime-spawned origins. The UI never changes VM state while inspecting ownership, subscriptions or timer queues.
- A blueprint editor must validate inheritance/composition before Save or Instantiate, retain invalid drafts on failure, and group create/derive/instantiate changes into real undo transactions. Existing object and prefab identities remain stable.
- New blueprint drafts extend the26.13 session retention mechanism additively; modal close, workspace departure and project replacement must not silently discard them. Explicit instance editing continues through real Inspector/property override paths.
- Author navigation must open the actual asset/script/Event Sheet, with inherited handlers retaining their author's logic asset. A removed asset yields a visible problem instead of navigating to an unrelated current selection.
- New forms use container-aware wrapping, visible labels and scrollable content at narrow widths. Runtime observation is read-only; authored override controls remain disabled during Play.

## Implemented owned files

- New src/editor/objectProvenance.ts: pure authored property/source/ownership view model using actual serialized values and resolved authored handlers.
- New src/editor/objectOwnershipCopy.ts: English/German/Chinese ownership, author navigation and blueprint workflow labels.
- New src/components/ObjectOwnershipPanel.vue: source chain, local/inherited/override classification, authored/runtime values, subscriptions and author navigation.
- New src/components/ObjectBlueprintEditor.vue: existing/new/derived blueprint editing, validation, save/instantiate and retained draft transitions.
- Narrow ConfigPanel.vue and EventSheetEditor.vue entry points; additive blueprint draft kind in editor/studioDraftRetention.ts.
- Focused actual view-model/handler regressions and an independent real-browser enemy-family workflow. User audit must include an instance override, UI/collision event wiring, pooling, paused hot reload, undo and save/reopen; source preparation alone is not a pass.

The source is development staging. Backend runtime evidence is recorded separately in RUNTIME_STAGE.md. The evidence below distinguishes focused checks from complete user workflows.

## Exact edit ledger

- `src/editor/objectProvenanceModel.ts`: added pure property-level source comparison, declaration baselines, component ownership, authored/runtime separation and detached runtime rows. A whole components-array patch no longer labels every property overridden.
- `src/editor/objectProvenance.ts`: added the actual asset/runtime adapter, bounded source-chain traversal, precise Event Sheet author identities, prefab field baselines and exported property defaults. Uses `readEntityAuthoringData`, never the mutating serializer.
- `src/editor/objectOwnershipCopy.ts`: added matching English/German/Chinese control labels, draft decisions and new task/destroy event labels.
- `src/components/ObjectOwnershipPanel.vue`: added expandable source, property, event, composition and runtime views, search, contextual author navigation and real Inspector property navigation. Runtime values are read-only and refresh only while the expanded view is active.
- `src/editor/objectBlueprintFields.ts`: added raw draft checks before normalization for names, references, lists and component composition. Invalid inputs remain visible.
- `src/editor/objectBlueprintAuthoring.ts`: added create/derive/instantiate transactions with canonical asset references and Edit-mode guards.
- `src/components/ObjectBlueprintEditor.vue`: added labeled source/composition forms, validation, retained invalid drafts, exact saved-base conflict handling, Save/Discard/Cancel and saved-only derive/instantiate actions. The modal uses the existing focus trap.
- `src/editor/objectCallbackLocation.ts`: added UTF16 callback declaration lookup with ambiguity and malformed-source refusal.
- `src/editor/objectAuthorNavigation.ts`: added pending project/record-scoped author navigation requests.
- `src/components/ScriptStudio.vue`: consumes callback navigation against the actual open draft and selects its precise declaration range, or shows a localized location problem.
- `src/components/ConfigPanel.vue`: added ownership and blueprint entry points, error reporting and synchronization of the explicit scene blueprint identity when its existing Script2D selector changes.
- `src/components/EventSheetEditor.vue`: added real blueprint edit/derive/instantiate entry points, inherited primary-logic navigation, task selectors, task/destroy labels and corresponding starter callbacks. Existing draft guards remain active.
- `src/editor/studioDraftRetention.ts`: added the blueprint draft kind mapped to objectBlueprint assets; no dirty-draft eviction or truncation was introduced.
- `src/runtime/objectBlueprints.ts`: added a validated current-asset draft override to the existing bounded resolver without temporarily writing the asset. Backend review and real AssetDatabase checks cover identity, missing sources, cycles, composition and no writes.
- `src/runtime/objectFamilyLesson.ts`: added a concrete English/German/Chinese task lesson, including actual pool command names, inherited callback authors, instance overrides, paused validation and save/reopen checks.
- `src/runtime/creatorLearning.ts`: registered the stable enemy-family guide and dispatches its concrete localized copy. Existing guide IDs/progress remain unchanged.
- `scripts/verify-v26.14-ownership.mjs`: added focused pure model/raw-field/cache/range/localization checks.
- `scripts/verify-v26.14-blueprint-handlers.mjs`: compiles the five changed/new SFC surfaces and executes actual extracted draft/save/close handlers with explicit fixture dependencies.
- `scripts/verify-v26.14-enemy-family.mjs`: added real browser creation, invalid draft/Cancel, derive/instantiate, instance override and exact callback navigation workflows; includes collision/UI binding creation, 42 introduced-state geometry/readability checks, Undo/Redo and actual save/reopen.
- `scripts/verify-v26.14-family-runtime-user.mjs`: added actual reference file-picker loading, pointer collision, inherited runtime inspection, one UI activation/one callback, bounded pool reuse, paused source validation, and downloaded/reopened game checks. Unreached steps remain explicitly unverified until the runtime report passes.
- `scripts/generate-v26.14-reference-projects.mjs`: added deterministic Enemy Family game/project expectations/controls and localized lesson artifacts. It imports the real template, validates all four scripts with the actual WASM VM and checks project structure. Development metadata remains explicit.
- `reference-projects/projects/creator-v2614-enemy-family/{project.nova,expected-output.json,test-controls.json,README.md}` and `docs/OBJECT_FAMILY_LESSON_26_14.{en,de,zh}.md`: generated reference and teaching outputs. A generated file is not a runtime audit pass.

## Observed evidence and limitations

- `release-audits/v26.14-ownership.json`: **17 focused groups passed**, including precise prefab fields/declaration defaults, runtime/authored separation, frozen-input immutability, raw draft refusal, retained conflicts, UTF16 callback lookup and complete EN/DE/ZH lesson/copy contracts.
- `release-audits/v26.14-blueprint-handlers.json`: **13 SFC/actual-handler groups passed**. These execute the actual extracted Save/Discard/Cancel/stale/conflict handlers with explicit dependencies and compile five real SFCs. They do not claim mounted geometry or assistive-technology use.
- Both scripts now emit generatedAt, release, the actual root package engineVersion, expectedRelease, development and qualifiedRelease. Staging remains development:true/qualifiedRelease:null; integrated production refuses a package version other than26.14. These report changes preserve the original checks.
- Merged `vue-tsc --noEmit` passed. The independent check tree retains the qualified26.13 public metadata while exercising staged26.14 implementation; it is not a qualified26.14 artifact.
- `.cache/development-v26.14-ui-check/release-audits/v26.14-enemy-family.json`: **8 actual browser authoring groups passed**, with **46 captures**, including42 new Ownership/Blueprint states at1024×640 across EN/DE/ZH,100/150/200%,dark/light and maximized200% Inspector. The checks use native browser keyboard/pointer actions and actual DOM/AX observations, not application-state injection. They cover blank quick-object creation, invalid draft/Cancel/repair, derive/save/instantiate, one instance override9 versus source6, exact inherited callback navigation, visible collision/UI Event Sheet bindings, undo/redo and downloading/reopening the actual `.nova` project with blueprint identities intact.
- Representative final German200% narrow/maximized Ownership and Chinese200% light Blueprint captures were visually inspected. The header is capped, numeric values remain inside the viewport, and modal footer controls remain reachable. Narrow panes require vertical scrolling; maximizing the Inspector exposes the full two-column comparison.
- The dedicated reference generator plus `--verify-only` passes deterministic byte comparison, four actual WASM script validations and actual project validation. It now checks `validation.valid`; its earlier nonexistent `errors`-field test was insufficient and is not claimed as project-validation evidence.
- `.cache/development-v26.14-ui-check/release-audits/v26.14-family-runtime.json`: **all5 actual user groups passed**, generated2026-09-05T11:48:12.353Z with8 captures. The reference opens through the actual picker; pointer contact increments the inherited collision counter; the inherited task counter reaches1; authored move_speed6 remains distinct from runtime7; one UI click produces exactly one restart and the Inspector reports8/8 active,16 reused,0 leaked; paused valid save succeeds, invalid source remains exact/dirty with an actionable error, repaired source saves; the game downloads, reloads and reopens through the actual picker, preserving blueprint/pool data and running a new wave. These are development observations, not a qualified26.14 package claim.

## Defects found by actual browser use and consequences of their fixes

- Derived-instance Design mounting exposed a read-time prefab mutation loop. Backend comparison/conflict reads now use the pure authoring snapshot; explicit capture remains a mutation. Backend tested25 repeated reads with zero writes and retains its independent runtime ledger.
- Actual project Save exposed prefab data-URL decoding, and Open exposed the validator's missing MouseFollower2D component kind. Backend repaired those paths; the authoring game now downloads and reopens through the real file picker. Its40-template/registry/native/WASM evidence remains in the backend ledger.
- German200% capture review showed the sticky Inspector header consuming most of its scrollport. ConfigPanel caps it at min(230px,40%), allows header scrolling, and reserves matching scroll padding. Ordinary100% headers retain natural height. The strengthened matrix checks readable body area and actual hit targets.
- The former auto-width German label column pushed numeric ownership values beyond the viewport. ObjectOwnershipPanel now stacks labels/values below420px container width; wider/maximized panes retain two columns. The matrix checks horizontal and vertical containment and the element actually hit at each value. The earlier36 basic geometry passes alone were insufficient visual-usability evidence.
- One Game UI activation initially dispatched its Event Sheet callback more than once. Backend now delivers it at the queued signal boundary with full arguments, preserving/deduplicating legacy direct callbacks. The actual browser checks exactly one restart log per click.
- Actual Vue-world preparation exposed raw/proxy entity identity mismatches that discarded valid pool members. Backend objectPool now compares normalized owner/member identity and refuses a different replacement object with the same UUID. Startup also prewarms the enabled pool synchronously before unrelated optional-package awaits, so start callbacks can use it; exhausted configured pools refuse an unpooled fallback. Final source files are worldGameplay.ts, objectPool.ts, dynamicObjects.ts and GameplayRuntime.ts. Backend reports48 native and48 actual WASM runtime groups plus6 real package/prefab integration groups. The final browser directly verifies the resulting16 cumulative reuses and unchanged capacity8.
- The reference now scores each target at most once per wave using supported nonserialized exported data, keeps state access in actual lifecycle callbacks, and routes keyboard Restart through the declared signal. Its replacement wave waits for the target group to become empty instead of assuming a short timer guarantees completed pool returns.
- The browser also observed Enter on the editor's Pause button activating the last focused Game UI button. This exact editor-focus isolation defect is assigned to26.16's Interface/input owner. The26.14 runtime audit uses pointer Pause after the game click so it measures one activation accurately; it does not claim the keyboard defect fixed.

No physical screen-reader, native operating-system file-picker, physical audio/device, or complete release-package certification follows from these browser/focused checks. The browser uses the actual supported download/file-input fallback in an isolated profile. Common production qualification remains the root release pipeline's responsibility.

Final14 UI/reference/lesson/harness source handoff is frozen. Root may promote this staged overlay and rerun its common production qualification. The complete programmer/user evidence remains separated above; no existing release metadata was edited by this UI handoff.
