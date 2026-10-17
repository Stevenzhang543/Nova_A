# Nova_A 26.21–26.30 implementation and acceptance manual

Written 2026-09-11 against commit cb73d58 and the qualified 26.20 source. This is the implementation contract for the next ten releases, not a claim that future features exist. Keep each version's source snapshot, release evidence, notes, ledger and eleven-file release directory separate. Preserve 26.20 palettes, animation, public APIs, assets and existing projects.

## How to use this manual

Read FEATURE_INVENTORY_26_21.md and SOURCE_MAP_26_21.md for the complete current catalogue and file ownership, COMPETITIVE_REVIEW_26_21.md for externally sourced comparisons, and GAP_REGISTER_26_21.md for unfinished work. A catalogue entry establishes an implementation route; a passing test establishes only its tested behavior. Never mark an entire feature correct merely because a control, signature or file exists.

For every authored edit trace: visible control or script API → validation → mutation/transaction → live preview invalidation → Undo/Redo → canonical serialization → reopen/migration → exported-player consumption. Record editor-only, read-only and external operations explicitly. Unsupported values must retain a visible diagnostic and recoverable source. No silent deletion, success badge for an unexecuted action, or graph conversion percentage that counts preserved source as structurally editable nodes.

Before each edit record the consequence, affected owners, backward compatibility and regression risk. Keep an exhaustive path-level ledger with the published grammar: each bullet starts with a code-formatted path, then an em dash and its Added/Modified description. Test that grammar before source freeze. Do not change qualified source after freeze; package the exact source and produced binaries. Generated source/evidence is not a substitute for an executable runtime test.

## Shared GUI and interaction acceptance

Containment is necessary but insufficient. A field can fit its card and still display only two characters. Audit every Vue surface, its conditional sections and dialogs, and enumerate unvisited states with their prerequisites. For each reachable panel test docked, narrow, maximized, restored and floating presentation where supported. Include five palettes, English/German/Chinese, 100/150/200% application scale and 1024×640, 1366×768, 1920×1080 windows; add 720px settings and independently narrow inspectors on wide windows. Use additional input/device tests when the feature requires them.

Measure label clipping, real editable content width after padding/spinners, minimum readable character capacity, focus visibility, pointer hit targets, keyboard order, nested scrolling, accessible names and actual input. Labels stack when their own panel cannot fit the label and field; viewport width alone is insufficient. Paired numeric controls may wrap without losing axis labels. Long names must remain recoverable through a full value, detail view or accessible tooltip. Tables need an explicit scroll region or card layout. Do not remove actions, animations or information to make an audit pass. Preserve animation timing and user-selected reduce-motion behavior.

Use the existing shared form rules where appropriate; isolate new editor-only styling from the exported game's UI. Avoid JavaScript observers that continually measure every field each frame. Container layout should respond to actual available space and current text size. Navigation and layout preferences belong to editor state, not scene history. Verify reopening projects does not reset global preferences or import unrelated editor state.

## 26.21 — readable editor and trustworthy audit foundations

**Problem and intended result.** The previous geometry matrix can miss unusably narrow controls. Fixed 360/380px breakpoints ignore enlarged text. A delayed global edit router can outlive the originating control/project and its fallback identity can merge different controls. The new baseline must expose those limits and fix the shared foundation before adding more panels.

**Implementation, in order.**
1. Read/index every authored code/config file and its imports, exported declarations and ownership; enumerate all Vue roots, controls, conditional states and handlers. Add current user-facing features outside the old operation registry, including palettes and output quality. Link every public operation's seven dimensions to existing implementation/test files and retain missing or unexecuted routes as findings.
2. Publish a sourced Godot/GameMaker comparison, focused Construct/Defold comparison, and a durable gap register. Assign each gap to one of the next releases with a measurable closure criterion.
3. Add a remembered Automatic/Above controls form-label preference with EN/DE/ZH labels and help. Normalize old/invalid values and restore its default through Reset Settings. Keep all five palettes and existing compact/reduce-motion/high-contrast controls.
4. Implement editor-only responsive form layout using panel width and text-relative thresholds. Stack property/setting labels when necessary, wrap numeric pairs and slider/value pairs, and give text fields usable inline space. Preserve docking, resizing, maximizing and all existing content/actions.
5. Give delayed project-control commits a distinct per-control identity and originating-project lifetime check; retain explicit domain commands and snapshot-based no-op suppression. Cancel detached/stale work and dispose listeners/timers on unmount. Do not force eager gameplay loading into the launcher.
6. Add executable new preference, readability and mutation-lifetime regressions plus actual editor interactions. Verify separate controls are independently undoable, stale callbacks cannot touch a replacement project, and editor-only layout preferences do not dirty project data.
7. Repair the release-ledger publishing grammar in its generator, expand audit version selection explicitly for the new series and retain original regression provenance. Add current references/teaching/notes and the full required release plan.

**Source owners.** src/store/preferences.ts; src/panels/SettingsPanel.vue; src/assets/ and src/main.ts for isolated editor styles; src/components/ConfigPanel.vue and shared form surfaces; src/runtime/projectMutationRouter.ts; src/App.vue cleanup; scripts/ inventories, browser harness, release tooling; docs/ and manual/.

**Programmer audit.** Source/route inventory is complete and classified; all references exist. Preference migration/reset and malformed storage tests; queue coalescing, identity, disposal, project change and detached controls; no-op edits; TypeScript and Rust checks; retained scripting/media/physics/network/render regressions; exact source and previous-release hashes. Add a failing-before/passing-after narrow-field test. Do not infer domain correctness from the global router.

**Actual-user checks.** Open a code game, select an entity, narrow the Inspector on a large window, enlarge text, edit paired numeric values and a slider, Undo/Redo, save/reopen and export. Switch stacked/automatic labels through Settings in all three languages and five palettes; verify persistence/reset and project dirty state. Resize/maximize/restore while a field is focused. Run all starter create/play/stop/export checks and retained menu/merge/package workflows. Record all-panel geometry and readable-field findings separately.

**Exit.** No unresolved local blocking defect in the new foundation; executable new tests and retained gates pass on frozen source. Publish exactly eleven verified files under releases/v26.21. Independent human/AT/device acceptance remains explicitly external.

## 26.22 — complete document transactions and property application

**Implementation.** Create a field-by-field lifecycle matrix for scene settings, entity metadata, all component fields, materials, input maps, animation/UI, scripts, packages and build settings. Replace missing implicit mutation routes with explicit named transactions. Scope merge keys to resource identity and field; batch a drag into one undo action; keep unrelated edits separate. Commit/cancel pending edits before save, undo, project replacement and playback boundaries. Preserve selection, prefab overrides, external-change conflict identity and asset references across rollback. Validate finite numbers and enums consistently at the UI/API/load boundaries; show rejected input instead of silently applying partial state.

**GUI.** Property rows expose units, defaults, mixed values, override/pin state and the destination resource. Multi-selection must distinguish a shared value from a mixed value. Add consistent validation next to the offending field; retain the entered draft for correction. Keep large inspector groups searchable and keyboard reachable.

**Programmer audit.** Generate a canonical property corpus, mutate each field and enum through its owner, and compare save/load/export values. Add actual runtime effect assertions for every executable family, not only JSON equality. Test event ordering, no-op commits, nested transactions, redo invalidation, rollback after normalization failure and pending edit boundaries. Trace each public operation to a tested case or explicit exclusion.

**User checks.** Rapidly edit two controls then undo twice; drag continuously then undo once; switch entities during an edit; multi-edit mixed values; apply/revert prefab overrides; cancel malformed input; save immediately after typing; reopen and run the exported project. Repeat cross-scene and external-merge scenarios.

**Exit.** Each authored field has a named lifecycle disposition; no catch-all pass. Any unsupported runtime effect stays visible in the gap register. Separate 26.22 release and migration evidence.

## 26.23 — dynamic scripting, modules and safe hot reload

**Implementation.** Define the supported Rhai language contract against the actual native/WASM VM. Cover dynamic values, arrays/maps, closures/function pointers, method dispatch, scope/capture, modules/import aliases, errors and resource handles. Distinguish optional editor annotations from VM-enforced static types. Make reflection and dynamic API access permission-aware and discoverable. Hot reload validates a replacement before swapping it, preserves only explicitly migratable state, invalidates dependent modules and rolls back atomically on failure. Design cooperative tasks with cancellation and lifetime ownership; do not label them arbitrary suspended-stack coroutines.

**GUI.** Script Studio gains readable symbol/type/module diagnostics, explicit dynamic-value inspection, dependency/reload status and a clear kept-old-program result on rejection. Long paths and overload signatures wrap in dedicated detail panes. Completion/help comes from actual runtime signatures.

**Programmer audit.** Run semantic examples in both native and WASM VMs; test closure capture/shadowing, overloaded functions, imports/cycles, mutable values, exceptions, operation budgets and stale reloads. Verify annotations cannot make unsafe casts appear valid. Compare exported behavior and stable state migrations with preview.

**User checks.** Build an inventory with dynamic maps, a reusable module, callbacks and runtime-created entities; inspect changing values; deliberately break an import; reload while playing and recover without losing the previous working program; export and repeat.

**Exit.** Publish the exact supported language/API/annotation/task contract with passing semantic cases. Do not promise GDScript classes, C# or unrestricted eval merely because Rhai is dynamic.

## 26.24 — structural code/graph parity and large graph editing

**Implementation.** Extend the existing lossless syntax representation rather than replace scripts with a disconnected visual language. Give every supported structural statement/expression a typed node/slot: scopes, declarations, assignment, conditionals, loops, break/continue/return, calls, functions, module constructs and supported dynamic expressions. Preserve comments, source spans, identifiers and unsupported source regions. A source-backed region remains runnable/editable as source but is not counted as native structural coverage. Switching modes must select the exact linked document and perform an audited atomic conversion.

**GUI.** Separate node palette, graph, outline and inspector with responsive drawers. Auto-arrange uses measured node sizes, nested scope boundaries and deterministic lanes; preserve pinned/manual positions unless the user requests a full layout. Make insertion, wiring, disconnect, variable/function navigation and keyboard focus practical at high zoom and large text.

**Programmer audit.** Property-based parse/project/emit/parse tests; native/WASM trace equivalence; loops/nested flow and dynamic calls; preservation of escaped source, comments and manual geometry; incremental invalidation; duplicate identities; partial failures and undo. Measure large graph interaction percentiles with animation retained.

**User checks.** Create the same game from code, blocks and mixed authoring; repeatedly switch, edit, arrange, undo/reopen/export. Change a function signature and variable name across scopes. Import an unsupported construct and verify the exact source is preserved with an honest explanation.

**Exit.** All supported structural constructs have explicit fixtures and equivalent traces. No claim of universal conversion based on counting API node definitions.

## 26.25 — debugger, events, blueprints and discoverable diagnostics

**Implementation.** Close statement-mapping, breakpoint, call-stack, watch and task-lifetime gaps. Support actual pause/step semantics only where the VM/host can provide them; expose a capability boundary otherwise. Keep LSP document versions and diagnostics synchronized with code/graphs. Bind object-family, blueprint inheritance/override and event-sheet dispatch consistently across runtime, editor and export. Detect cycles and stale subscriptions; dispose handlers when instances/modules disappear.

**GUI.** Debugger panes separate execution state, frames, scopes, watches and errors. Source and graph selection follow the same paused location without overwriting unsaved edits. Event and blueprint editors gain readable condition/action cards, inheritance provenance and focused validation links.

**Programmer audit.** Real breakpoint/step/resume and exception scenarios on each claimed host; callback/task cancellation; stale LSP responses; watch side effects; inherited event order; entity destruction during dispatch; save/reopen/export and debug-permission enforcement.

**User checks.** Diagnose a wrong score, an inherited event and a failing callback in code and graph views; inspect a runtime-created entity; resume, hot reload, save and export. Verify disabled controls explain unavailable capabilities.

**Exit.** Debugger labels describe executed capabilities, not simulated suspension. All event/blueprint edits participate in the 26.22 transaction matrix.

## 26.26 — production assets, library and dependency-safe iteration

**Implementation.** Make import/reimport, UUID identity, dependency closure, variants, atlases, fonts, tilemaps and reusable scenes behave consistently. Invalidate thumbnails, GPU/audio resources and dependent scenes after content changes; preserve user overrides. Add transactional package/library content operations, missing-resource repair, deduplication with explicit identity decisions and deterministic export inclusion. Keep offline workflows functional; hosted discovery/publishing requires real service evidence.

**GUI.** Assets/library use scalable grid/list/details views with full paths, readable metadata and clear import progress. Dependency views support navigation to the actual consumer. Separate preview, settings, provenance and diagnostics. Keep all forty starters and add examples only when their complete runtime/export walkthrough exists.

**Programmer audit.** Reimport identity and dependency graphs; stale jobs/cancellation; malformed assets; font fallback/coverage; texture/audio disposal; missing packages; source moves; deterministic archives and export closure. Measure large libraries with bounded memory and interaction latency.

**User checks.** Replace a sprite/audio/font while playing, undo it, repair a missing dependency, move a project, choose a library variant, rebuild an atlas and export. Compare the actual downloaded output against the saved authored assets.

**Exit.** No asset operation reports success while leaving stale preview/export content. Library metadata and tutorials match tested examples.

## 26.27 — rendering, compiler and frame-time predictability

**Implementation.** Profile complete representative editor/player frames before changing algorithms. Improve demonstrated CPU/GPU bottlenecks in batching, scene traversal, uploads, resource residency and passes. Retain animation, lights, particles, materials and effects. Extend backend capability diagnostics, resolution/AA fallback and device-loss recovery. Keep authored quality separate from adaptive presentation. Revisit shader/material/render-texture correctness and directional-shadow limits with explicit backend support. Compile portable optimized outputs and prove semantic equivalence.

**GUI.** Rendering and Profiler show actual backend, backing resolution, sample count, pass cost, CPU/GPU measurement availability and allocation limits. Quality controls explain their project/export scope. Use comparative captures and readable per-pass tables instead of unqualified performance badges.

**Programmer audit.** Same scene/camera/resolution/effects/hardware/warm-up before and after; median/p95/p99 frame times, input latency, allocations and memory. Real pixel/edge tests, context loss, buffer bounds, transparency/order, animation-clock equivalence and clean compiler output checks. Do not equate a microbenchmark speedup with total FPS.

**User checks.** Edit a heavy animated scene during playback, change quality, resize and restore the window, run exported Web/Windows games, inspect fallback diagnostics and compare output at equal settings. Real low-end/mobile hardware remains required for those claims.

**Exit.** Publish measured improvements and regressions with preserved output. No universal best-FPS claim or feature/animation removal.

## 26.28 — animation, audio and game-UI production workflows

**Implementation.** Deepen timeline/controller/rig/skin blending, nested sequences, markers and reversible key editing. Keep integer-sample audio clocks, routing/effects/streaming and transport semantics consistent. Make localized responsive game UI, focus, IME, controller/touch and accessibility semantics survive editor/player/export. Keep text layout, font fallback, animation bindings and event actions attached after rename/reimport/undo.

**GUI.** Timeline, curve editor, mixer, UI tree and property panes share readable forms but retain specialized rulers, tracks and meters. Add focused details for long key paths and bus names; keep transport and selection visible in narrow docks. Separate preview-only solo/mute from authored changes.

**Programmer audit.** Clock/frame/sample equivalence, loops/seeks/reverse/nested playback, interpolation and blending boundaries, disposal/stream underruns, text shaping/localization, IME composition, focus navigation and serialization/export of every edited path.

**User checks.** Author a cutscene with music, captions and a localized menu; edit curves and bus gain, scrub/undo/reopen, use keyboard/touch/controller and run the exported sequence. Observe actual audio and assistive technology before claiming their device acceptance.

**Exit.** Deep behavior, not only panel presence, is verified. No timeline or audio feature is removed for speed.

## 26.29 — world scale, multiplayer and platform delivery

**Implementation.** Close remaining world binding, navigation, query, streaming and handoff gaps with exact field/runtime contracts. Implement a genuinely windowless authority as a separate native executable if feasible with the current runtime split; a WebView with rendering disabled is not that feature. Define rollback from a complete deterministic simulation/input/state contract before promising resimulation. Harden authority/reconnect/replay/session lifetimes and optional service permissions. Strengthen platform capability discovery, export prerequisites and recoverable build diagnostics.

**GUI.** World and Network Studio separate authoring, live session diagnostics and build readiness. Expose authority, ownership, snapshot age, actual rollback mode and missing toolchain steps. Build Settings provides concise actionable blockers, not blanket ready labels for absent SDKs or unsigned outputs.

**Programmer audit.** Every world field/enum reaches serializer and actual simulation; fixed-seed deterministic replay; packet loss/reorder/duplication/reconnect and multiple processes; full state restoration if claimed; permissions and malformed traffic. Match build artifacts to source, toolchain and actual host. Run real no-window startup/shutdown if implemented.

**User checks.** Build a streamed multiplayer game, join/rejoin, edit/export ownership settings, move the project and recover from a missing SDK/package. Use only disposable installation environments for lifecycle qualification; retain explicit unavailable-host/device statuses.

**Exit.** Separate locally verified Windows/Web behavior from Linux/macOS/Android/iOS, signing, public services and independent security qualification. Never produce a fake platform package.

## 26.30 — integrated release qualification and complete teaching

**Implementation.** Rebuild the feature, gap, binding, field and panel inventories from final source. Close local blocking findings across the ten-release series. Stabilize schemas/API migration and failure recovery, and provide complete English/German/Chinese task manuals with code/graph equivalents, all-template walkthroughs and troubleshooting linked to real diagnostics. Resolve publishing-tool presentation contracts before freezing source.

**GUI.** Run the full all-panel readability/interaction matrix with retained animations and all palettes. Verify onboarding, help, reset, search, large text, docking and discoverability. No success state may stand in for an unexecuted operation.

**Programmer audit.** Full native/WASM/Web regressions, actual user workflows, clean and moved builds, historical migrations, failure recovery, template/output matrix, performance budgets, dependency integrity/advisory coverage with precise scope, deterministic archive verification and complete evidence hashes. Audit all edit routes against their declared dispositions.

**User checks.** Independent beginner and expert create/edit/debug/save/reopen/export games from code, blocks and mixed workflows. Use real assistive technology and low-end/mobile hardware. Run the actual duration of any claimed soak. Record observer, machine, version, task, result and unresolved issue; automation does not impersonate an independent user.

**Exit.** All declared local gates pass; external acceptance is either evidenced or explicitly pending. Package exactly eleven verified files in releases/v26.30, preserving previous versions. The version number does not certify Godot/GameMaker parity.

## Release protocol for every version

Keep public YY.sequence and machine YY.sequence.0 authorities aligned without changing Project Format 2/schema29 unless a separately reviewed migration is necessary. Prepare notes, per-path ledger, localized teaching and references before freeze. Validate every packaging predicate early, including ledger syntax and reference metadata. Run actual focused and retained regressions, all relevant browser/user gates, builds, migration/history, templates, layout, platform smoke, performance/stability, dependency/hygiene and manual/product gates. Snapshot exact authored files and tool identities. Retain failed attempts honestly. Generated artifacts must identify their producing source and command; never relabel an older report as a new execution.

Required root release files: EDIT_LEDGER.md, LICENSE.md, RELEASE_NOTES.md, SHA256SUMS.txt; versioned source, web, reference-projects and release-evidence ZIPs; Windows portable EXE, setup EXE and MSI. Verify all ten payload checksums, archive contents, references, source digest and executable version independently before publication. Do not overwrite a completed release directory.

## External acceptance carried forward

Only the current Windows computer is available; an iPhone12 was offered but has not been exercised. Matching Linux/macOS/Android environments, real mobile/low-end input and performance, assistive technology, independent beginner/expert observations, production signing/disposable installation, public-network infrastructure, independent security and true-duration soak remain separate requirements. Work locally without repeatedly requesting unavailable machines. Claims must reflect observations, not intentions.

## Source ownership and concrete implementation contracts

These paths are the existing entry points, not instructions to rewrite whole subsystems. Read their callers before each change. Add one regression that fails on the old behavior, then change the smallest shared owner and its visible callers. Keep historical fixtures and baseline reports intact.

| Release | Existing source owners | Contract to implement and inspect |
|---|---|---|
| 26.21 | `src/store/preferences.ts`, `src/panels/SettingsPanel.vue`, `src/components/ConfigPanel.vue`, `src/runtime/projectMutationRouter.ts`, `src/projects/projectSession.ts`, `src/assets/editorReadability.css` | Global layout preference is normalized and excluded from project serialization. Each delayed edit captures a session lifetime and distinct control identity. Inspector keys also include entity identity. Label stacking follows container font size; help text scales too. |
| 26.22 | `src/editor/commands.ts`, `src/store/physics.ts`, `src/projects/projectData.ts`, `src/runtime/prefabs.ts`, every field handler in `PANEL_AUDIT_26_21.json` | Record resource ID, canonical field path and edit-session ID. Merge only continuous edits to the same field/resource. Flush pending input before navigation/save/undo/play; validate once, commit once, and restore the exact before-state on cancel. Treat multi-selection as one explicit transaction. |
| 26.23 | `crates/nova_script/src/lib.rs`, `src/runtime/scriptModules.ts`, `src/runtime/scriptHotReload.ts`, `src/runtime/scriptContracts.ts`, `src/editor/scriptLanguage26.ts` | Key compiled module caches by content and dependency versions. Compile candidate dependency graphs before swapping them. Restore the previous graph and state on failure. Give tasks an owner/session/cancellation token; do not represent arbitrary VM suspension with a timer. Derive diagnostics from actual VM semantics. |
| 26.24 | `src/visual/graphSyntax.ts`, `graphSyntaxSchema.ts`, `graphCompiler.ts`, `graphCodeSync.ts`, `graphLayoutService.ts`, `graphLayoutEngine.ts`, `src/components/VisualGraphEditor.vue` | Preserve source ranges, comments, unsupported regions and stable node identities. Compile code and graph through the same supported IR; classify each construct as structural, preserved raw or rejected. Layout consumes measured node dimensions and respects pins. A stale worker response cannot overwrite later edits. |
| 26.25 | `src/runtime/scriptDebug.ts`, `scriptCoverage.ts`, `scriptTestExecution.ts`, `src/visual/graphDebugger.ts`, `src/components/ScriptWorkspace.vue` | Bind debugger responses to source revision and execution session. Define actual pause/step capability, frame identity, watch scope and disposal. Surface unsupported operations directly. Link graph/source selections through stable source ranges. |
| 26.26 | `src/assets/AssetDatabase.ts`, `importPipeline.ts`, `assetGraph.ts`, `assetReferences.ts`, `contentLibrary26.ts`, `src/components/ContentAssetInspector.vue` | Asset UUIDs survive rename/reimport; content hashes invalidate only affected derivatives. Track live texture/audio references separately from authored references. A failed batch import is recoverable and does not leave half-applied dependencies. Export includes the reachable resource closure. |
| 26.27 | `src/renderer/WebGL2Renderer.ts`, `sceneRenderer.ts`, `renderGraph.ts`, `capabilities.ts`, `outputQuality20.ts`, `src/components/WorldCanvas.vue`, `src/runtime/gameExporter.ts` | Benchmark the same scene, motion, output dimensions, sample count and effects before/after. Separate CPU submission, GPU timing when available, present interval, allocations and upload bytes. Bound retained memory and report fallback quality accurately. Never use lower quality as an unlabelled optimization. |
| 26.28 | `src/editor/animationAuthoring.ts`, `animationStudioState.ts`, `src/runtime/animation.ts`, `animationProduction.ts`, `audio.ts`, `audioBuffers.ts`, `uiProduction.ts`, Animation/Audio panels | Specify clock authority for preview/export, loop boundary ordering and event-on-seek policy. Preserve key-path references after rename and undo. Dispose voices/listeners on scene replacement. UI composition, focus and localized text use the same runtime contract in preview and export. |
| 26.29 | `src/runtime/worldGameplay.ts`, `worldStreaming.ts`, `networking.ts`, `networkProtocol.ts`, `networkRollback.ts`, `networkReplay.ts`, `buildSettings.ts`, `src-tauri/`, Rust world modules | Enumerate the complete rollback state before implementing resimulation. Record input tick/ownership and validate authority at the receiver. World unload cancels owned tasks and references. A separate headless target must run without a WebView or hidden window if called windowless. |
| 26.30 | All preceding owners plus `scripts/release-milestone-gates.mjs`, release snapshot/package/verification tools and localized manuals | Freeze source only after all authored documentation and packaging predicates pass. Each gate records actual source and tool identity. Verify the eleven final files independently and retain unresolved external acceptance explicitly. |

### Test entry points and evidence rules

For 26.21, run `node scripts/verify-v26.21-foundations.mjs`, both TypeScript checks, the production Web build, then `node scripts/verify-v26.21-foundations-user.mjs`. The current user runner explicitly identifies itself as development work on the 26.20 engine identity; convert it to actual 26.21 qualification only after aligning all version authorities. Run `node scripts/audit-v26.21-surfaces.mjs` and regenerate inventories after source edits. The separate `qualify-panels-v26.21.mjs --development` traversal retains geometry checks and records short-field capacity findings. A geometry pass with short fields is not readability acceptance. For numeric input, account for padding and browser spinner space; at least six digit positions must remain usable. Text/search controls should expose at least twelve ordinary characters unless their declared maximum is smaller. Full-value discovery and keyboard scrolling are additional checks, not substitutes for usable editing space.

Retain the existing typed-graph and language regressions for every scripting change. The actual VM fixture pairs must compare observable outputs and state, not generated text alone. Keep media/world/network retained suites under their original identities when targeting a later integrated release. Full release qualification also requires native/WASM tests and builds, history/migration, reference/template output, real user save/reopen/export, security/hygiene, manual checks and the complete palette/locale/scale matrix described above.

For every new field, record: source control, enabled/visible conditions, model path, accepted values, normalization function, command label and merge identity, persistence path, runtime consumer, export consumer, undo/redo test, invalid-input test and user interaction evidence. Mark editor-only fields explicitly. A missing consumer is a defect or an intentionally unavailable feature, not a documentation-only TODO that can be labelled working.
