# Nova_A 26.11–26.20 implementation manual

Status: development plan, written against the 26.10 source tree on 2026-09-05. This document does not certify any unexecuted release. The current task implements the first milestone; later milestones remain work to do.

## Product contract and change discipline

Nova_A is a local-first 2D authoring application. Vue provides the editor and most game orchestration/rendering; Rust provides math, retained physics, Rhai execution, format support and the desktop host. The Web player uses the same authoring data through WebAssembly. A functioning Inspector is insufficient evidence of a functioning exported game.

For every edit:

1. Record the triggering defect or desired behavior, the owning files, and the consequences before changing code.
2. Trace UI input → validation → transaction/undo → serialization → reload → runtime → export. Mark a step inapplicable only with a reason.
3. Preserve existing user data and check failure recovery. Never silently replace unsupported scripts with a partial reconstruction.
4. Add a meaningful reproduction for a behavioral defect; use rendered inspection for presentation changes. Record commands and actual results, including blocked checks.
5. List each edited file and each behavior added, changed or removed in the edit ledger. Generated build outputs are separate from authored changes.

Keep Project Format 2/schema 29, Rhai API 2, Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 compatible unless a later milestone explicitly approves and documents a migration. A calendar number alone does not justify a schema bump. Keep release metadata at the last qualified version until the new candidate is qualified; label unfinished work 26.11 development.

## Evidence and reading discipline

The README and historical audits describe intended capabilities, not proof that a current checkout works. Maintain four distinct evidence levels: source inventoried; implementation reviewed; automated behavior exercised; observed user workflow. A symbol count is not a semantic audit. A status entry, source-string assertion or pre-existing report cannot substitute for a running behavior test.

The source inventory must list active frontend, TypeScript runtime, Rust core, native host, tooling, fixtures and generated files separately. The feature inventory must retain the existing 401 operation identities and include actual component, script API, graph-node and template catalogs. For each feature family record available behavior, known boundaries, test route and outstanding work. Coverage gaps remain visible rather than being converted into passes.

## Common programmer gates for every milestone

- Typecheck all Vue/TypeScript and run affected behavior regressions.
- Run Rust workspace tests and warnings-as-errors clippy for Rust changes, rebuild WASM for Rust/WASM changes, and build optimized editor/player output.
- Check new input for malformed, missing, duplicate, non-finite, oversized and stale-reference cases where relevant.
- Check state ownership, disposal/cancellation, deterministic order, undo/redo, save/reopen, export closure and error recovery.
- Read the final diff and verify that unrelated generated history, lockfiles and user projects were not rewritten.
- Audit English, German and Chinese copy for new visible actions and diagnostics. Do not erase current behavior to make a gate pass.

## Common user gates for every milestone

Use a disposable project. Start at the launcher and reach each feature through visible controls. Verify the intended result in the scene/game, undo and redo edits, save/reopen, and repeat in an exported player where relevant. Try keyboard navigation, long names, empty values, narrow docks, small windows, light/dark themes, 100/150/200% scale and all three languages. Check text wrapping and reachability, not merely absence of document-level overflow. Record which panels and states were actually exercised; do not label a source review as a click test.

## 26.11 — repair authoring correctness and expose the library

**Problem.** The current implementation can change Rhai semantics during structural conversion; imported graph geometry is not consistently organized; dense property rows depend on viewport width; launcher filtering can leave an invisible selected template active. Historical documentation already claims these problems solved, so fresh reproductions take priority.

**Implementation.** Repair reproducible code↔graph defects, including loop variable identity, conditional chains, expression parsing and source scanning. Invoke the existing deterministic layout after import. Preserve unsupported constructs losslessly and report them as source-backed, not fully editable typed blocks. Add regressions for semantic equivalence and no-overlap geometry. Improve launcher search/filter/selection coherence and readable template cards. Add approximately twenty distinct game, physics and rendering starters to the existing twenty using current components and APIs. Make dense property forms respond to the available container width.

**Ownership.** `src/visual/graphCodeSync.ts`, `graphCompiler.ts`, graph interaction/layout helpers; `src/components/ProjectManager.vue`, Inspector components and `src/assets/main.css`; `src/projects/templates.ts`; dedicated 26.11 verification scripts. Backend/config fixes are allowed only when supported by an actual finding.

**Consequences.** Imported graphs may receive new positions; existing manually positioned graphs must not be continuously rearranged. Generated Rhai formatting can change, but execution order, scope and values must not. New templates are additive; stable IDs remain unchanged. Stacked property rows increase vertical scrolling while making labels and values readable. Filter changes must never silently launch a hidden template.

**Programmer audit.** Round-trip representative control flow and every affected expression through the real importer/compiler, compile with the Rhai engine when available, verify preservation fallback and layout idempotence; create every template and validate its components/assets/scripts; run fixed-step gameplay checks rather than count-only checks; typecheck and production build. Reproduce environment failures independently from source failures.

**User audit.** Write a script, save, switch to Blocks and Nodes, inspect variables/wires/loops, edit a block, save and return to code; run and compare behavior. Search/filter the launcher, select and create a visible result, play the new references. Resize Inspector, Script, Assets, Animation, Interface, Debug and Manage surfaces, read all labels, tab through fields and exercise undo/redo.

**Deliverables.** Source map, refreshed feature inventory, competitive gap register, environment/backend report, panel audit, template catalog, scripting contract, 26.11 test results and exhaustive edit ledger. A failed or unavailable native qualification remains a visible limit; it is not a reason to fabricate a release package.

## 26.12 — one language model for code and visual programming

**Implementation.** Replace fragile ad hoc source recognition with a versioned, span-preserving lexer/parser and a shared intermediate representation. Generate the supported API/node matrix from the registered Rhai API, including overloads, return types, defaults, handles, callbacks and packages. Preserve comments, strings, modules, exported properties, scopes and binding identities. Add editable nodes for arrays/maps, indexed/property assignment, functions and return values, nested branches, short-circuit operators and supported loops. Declare semantic limits for bounded execution explicitly.

**GUI.** Show structural coverage and source-backed ranges separately. Selecting a diagnostic focuses its exact code range and graph node. Provide an intelligible conversion preview for changes that cannot preserve typed graph structure. Never claim that an opaque Code block satisfies full visual support.

**Programmer audit.** Run a golden syntax corpus, malformed/truncated-input corpus, scope-shadowing and recursion cases, property-based round trips and differential execution in the real Rhai VM. Compare values, commands, logs and error behavior, not just code text. Verify all API overloads against generated pins.

**User audit.** Author the same small game from blank code and blank visual mode; switch repeatedly without losing comments or variables; repair syntax errors; edit a shared module; add custom functions and return values; exercise save conflicts and cancellation.

**Exit.** Every supported language construct has a typed structural representation or a precise public limitation with a tracked remaining task. Full bidirectional support is claimed only after the entire declared support matrix passes.

## 26.13 — graph interaction and complete workspace layout

**Implementation.** Use measured node bounds, nested control-flow regions, deterministic component placement and collision-free data lanes. Preserve manual edits, selection and viewport when applying layout; make layout undoable and support selected-region layout. Add wire routing, reroute points, compact/expanded code nodes, searchable variables/functions, keyboard wiring and accessible navigation. Profile 100/1,000/10,000-node graphs with cancellation and worker fallback.

**GUI.** Audit each Vue panel and dialog against container width. Separate primary task actions from advanced details, make splitters discoverable, allow workspace/panel maximize and restore, and preserve user layout. Replace clipped prose with wrapping or deliberate disclosure. Tables may scroll; forms must keep labels beside or above their own controls.

**Programmer audit.** Layout determinism and non-overlap including large code blocks, cycles, disconnected components and nested loops; focal zoom, snapping, drag/wire hit tests, undo/save/reopen and large-graph latency. Enumerate every reachable panel and state in the layout matrix.

**User audit.** Build nested loops and custom blocks without overlapping wires, pan/zoom with mouse and keyboard, reopen a layout and resize every dock at multiple scales/languages. Verify screen-reader labels and focus order through manual assistive-technology observation when available.

## 26.14 — object, event and dynamic scripting workflows

**Implementation.** Deepen Object Blueprints/Event Sheets around inheritance, instance overrides, composition, signal connections, deferred spawning/destruction and lifecycle ordering. Make dynamic arrays/maps, function values/closures and safe callback scheduling explicit within Rhai's actual supported sandbox. Unify code, event sheets and visual graphs on the same runtime command/validation path. Strengthen debugger stepping, watches, hot reload and test runner without promising arbitrary VM suspension.

**GUI.** Add a dependency/ownership view showing which blueprint, event sheet and behavior controls an object property. Show override provenance, runtime values versus authored values and signal subscriptions with navigation to their author.

**Programmer audit.** Inheritance cycles, stale handles, duplicate subscriptions, nested spawn/despawn, callback order, hot-reload rollback, task cancellation and play/stop cleanup. Confirm changes in code and event sheets affect the same exported game.

**User audit.** Create a reusable enemy family, override one instance, connect UI and collision events, pool enemies and hot reload while paused; undo and reopen. Teach these as complete games rather than API inventories.

## 26.15 — production assets, rendering and reference discovery

**Implementation.** Strengthen importer identity across source edits, folder moves, atlas reorder and missing dependencies. Complete resource inheritance/variants and build inclusion diagnostics. Validate renderer output for lights, normal maps, shadows, particles, cameras, render textures, materials and fallback paths. Expand the template library with searchable previews, requirement badges, input instructions, expected results and links to matching manuals.

**GUI.** Assets gets an uncluttered browse/preview/details flow, meaningful batch progress/cancel, dependency navigation and visible failed-reimport recovery. Rendering separates scene-wide settings, selected-object settings and output diagnostics.

**Programmer audit.** Golden imported artifacts, failed-reimport retention, texture/atlas limits, shader compile/fallback, context loss, bounded caches, deterministic packages and dependency closure. Verify rendered output, not just descriptor fields.

**User audit.** Import sprites and tilemaps, slice and animate, rename/move sources, fix missing assets, preview lighting, export a rendering template and compare browser/native output. Verify every library entry starts without hidden setup.

## 26.16 — animation, audio and interface production

**Implementation.** Complete animation tracks, curve editing, state transitions/blending, rigs, constraints, retargeting and root motion against runtime evaluation. Connect audio buses/effects/spatial playback/streaming and timeline scrubbing to the same clock. Strengthen responsive UI, themes, localization, IME, accessibility and game input focus.

**GUI.** Provide readable track headers and resizable timeline/property regions; explicit record/preview modes; visible audio routing and meters; meaningful interface anchors, safe-area and text-overflow feedback.

**Programmer audit.** Fixed-frame and integer-sample determinism, blend boundary cases, time scaling, pause/seek/loop/end behavior, audio disposal, caption synchronization and font fallback. Test serialization and export of every track and UI field.

**User audit.** Build an animated menu and cutscene with music, captions and skip; localize it; use text input with IME; resize and test touch/keyboard focus; reopen and export the exact sequence.

## 26.17 — physics, navigation and world gameplay

**Implementation.** Review every authorable body/collider/joint/rope/cloth property against Rust and runtime bindings. Strengthen character movement, one-way surfaces, compound geometry, CCD, sleep/wake, triggers and queries. Integrate navigation baking/invalidation, dynamic obstacles, avoidance, perception/AI, streaming and origin shifting with stable entity identity.

**GUI.** Give physical quantities units, ranges and runtime diagnostics; separate authoring from observations. Make navigation/bake/streaming state visible with cancellation and actionable failure reasons. Keep complex physics settings out of a compressed generic form.

**Programmer audit.** Analytical force/mass/inertia, unit consistency, tunneling/stacking/joint stress, deterministic contact events, fuzz malformed geometry, replay and large-world performance. Verify Inspector edits after body creation reach the retained Rust world and exported player.

**User audit.** Build a platformer, top-down navigation scene and physics puzzle; change materials, masks and joints; play/pause/step; stream scenes; undo and reload. Compare expected physical behavior in editor and export.

## 26.18 — honest multiplayer and native server architecture

**Implementation.** Audit ownership/authority/replication, reconnect, late join, protocol bounds, snapshot interpolation and rollback. Design an actual renderer-independent native server entry point if required; current renderer-disabled WebView behavior must not be renamed windowless. Extend rollback only when input, physics, script state and side effects have a deterministic journal. Keep public matchmaking/relay/auth providers optional and explicit.

**GUI.** Explain session roles, authority and unsupported rollback state. Use coherent instance log/Inspector navigation and readable packet/replication diagnostics. Expose failure reasons and reconnect controls without hiding offline workflows.

**Programmer audit.** Multi-process tests, packet loss/reordering/duplication, stale epochs, malicious inputs, reconnect ownership and bounded resource usage. Verify server startup without GUI when that feature lands; track side effects that cannot rewind.

**User audit.** Host/join a co-op template with separate players; edit authority, disconnect/rejoin, observe late-join state, export client/server and follow logs. Public-internet trials require actual service infrastructure and are separately recorded.

## 26.19 — platform delivery, tooling and collaboration

**Implementation.** Harden Windows/Web build reproducibility, native prerequisites, toolchain pins and offline dependency behavior. Qualify Linux/macOS on matching hosts and Android only with the actual toolchain/device. Improve external-editor/LSP workflows, package lifecycle, signed update/recovery and semantic collaboration conflicts. Pin direct dependencies only for a verified reason and revalidate the lockfile.

**GUI.** Show target readiness with exact missing prerequisites; provide build logs and repair steps; readable package permissions and dependency changes; side-by-side semantic conflicts that preserve identity and ordering.

**Programmer audit.** Clean-source build, moved-checkout build, package/archive traversal and malformed input, interrupted save/update rollback, plugin unload, permissions, merge/delete/reorder cases and no unexpected network actions. Publish platform support only from matching-host results.

**User audit.** Build/install/open/update/uninstall on disposable machines, open existing projects, use an external editor, install/disable/remove a reviewed package, resolve a real collaboration conflict and verify exported results.

## 26.20 — release qualification and teaching

**Implementation.** Close all local blocking findings; stabilize public contracts and migration/recovery. Refresh the feature/gap inventory from implemented behavior. Produce complete EN/DE/ZH task manuals, script/graph equivalents, all-template walkthroughs and troubleshooting connected to visible diagnostics. Package only the exact tested source and toolchain identity.

**GUI.** Complete the all-panel theme/language/scale matrix, onboarding tasks and context help. Remove misleading success states and distinguish prerequisites, inapplicable operations and verified outcomes.

**Programmer audit.** Full automated regression suite, clean optimized WASM/Web/native builds, dependency/security audits, deterministic archive checks, template runtime/export matrix, migration/history/failure recovery and published performance budgets. Generate fresh evidence with hashes and retain failures honestly.

**User audit.** Independent beginner and expert create, edit, debug, save/reopen and export games from code, graphs and mixed workflows. Observe accessibility on real assistive technology and input on real low-end/mobile hardware. Run the actual duration of any claimed soak.

**Exit.** Release only when all declared local gates pass and external limitations are explicit. A 26.20 version number does not certify parity with Godot/GameMaker or platforms that were not tested.

## Competitive comparison and retained gaps

Godot provides a scene/node/resource model, GDScript gradual typing, signals, first-class functions and asynchronous signal/coroutine waits; C# and native extension paths offer additional choices. GameMaker offers object events, rooms, GML code/visual authoring, dynamic structs, constructors and methods. These are workflow comparisons, not evidence that converting arbitrary code into blocks is automatically lossless in either product.

Primary references checked for this plan:

- [Godot stable scripting documentation](https://docs.godotengine.org/en/stable/tutorials/scripting/index.html)
- [Godot GDScript static typing](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html)
- [Godot GDScript language reference](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html)
- [GameMaker structs and constructors](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Overview/Structs.htm)
- [GameMaker visual function declaration](https://manual.gamemaker.io/monthly/en/Drag_And_Drop/Drag_And_Drop_Reference/Common/Declare_A_New_Function.htm)

Nova_A's plausible advantage is one understandable, reversible authoring path across code, blocks, events and exported behavior, with local ownership and explicit diagnostics. It must earn that advantage through equivalent execution and usable layouts. Rhai's dynamic values are not a static type system; annotations and typed graph pins must be described accurately.

Retain these gaps until independently closed: full structural language coverage (26.12), large and accessible graph editing (26.13), advanced object/event/debugger workflows (26.14), production asset/render output qualification (26.15), deep animation/audio/UI behavior (26.16), exhaustive physics binding evidence (26.17), full simulation rollback and genuinely windowless server (26.18), matching-host/mobile/public-service qualification (26.19), independent usability/accessibility/performance/security/soak evidence (26.20). 3D/XR and proprietary consoles are product/platform decisions, not accidental omissions to add during a 2D bug fix.

## Repeatable handoff for the next version

Read this manual, the latest edit ledger, source inventory and unresolved findings first. Reproduce the outstanding highest-priority defect. Define the milestone's exact supported behavior and acceptance cases before editing. Carry unresolved checks forward verbatim with their reason and owner; never erase them by generating a new all-green report. Update every affected manual/library entry and report every file change to the project owner.
