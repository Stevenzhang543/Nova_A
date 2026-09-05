# Nova_A 26.11 development audit

This checkout contains 26.11 development changes on the 26.10.0 compatibility baseline. It is not a qualified 26.11 release package. The audit began on 2026-09-05 from a clean working tree.

## Read this material in order

1. [Source map](SOURCE_MAP_26_11.md) and [symbol/import index](SOURCE_INVENTORY_26_11.json): working frontend, runtime, Rust, desktop host, tooling, references and generated files.
2. [Feature inventory](FEATURE_INVENTORY_26_11.md): all 401 registered operations, 58 component kinds, 169 Rhai API entries and 208 core/API graph-node definitions.
3. [Backend/environment audit](BACKEND_ENVIRONMENT_AUDIT_26_11.md), [scripting contract](VISUAL_SCRIPTING_26_11.md), [panel audit](UI_LAYOUT_AUDIT_26_11.md), and [template library](TEMPLATE_LIBRARY_26_11.md).
4. [26.11–26.20 coding manual](ROADMAP_26_11_TO_26_20.md): implementation, consequences, programmer gates and user gates for every milestone.
5. [Edit ledger](EDIT_LEDGER_26_11.md): every changed source/configuration/documentation file and its consequences.

## How the application works

The Vue launcher creates/opens a project. `src/store/physics.ts` and `src/projects/` own scene documents, compatibility, snapshots, selection and history. Components describe authoring data; `src/runtime/GameplayRuntime.ts` schedules gameplay, input, scripts, animation, physics, timers, signals, networking and deferred commands. `src/world/World.ts` updates a retained Rust physics world through `nova_wasm` and consumes diagnostics/events and numerical state buffers. Rendering and game UI run in the WebView/browser. `src-tauri/` supplies native filesystem, packaging, networking/process and window services; it is not a separate HTTP backend.

`src/player.ts`/`PlayerApp.vue` load packaged game data without the editor shell. Editor preview and player share substantial runtime code. Fixes must be checked in both authoring and runtime routes; one successful component render does not demonstrate export behavior.

`src/panels/ScenePanel.vue` and `RendererPanel.vue` are legacy wrappers with no current source import. `nova_core/pkg/`, `dist/`, dependencies, Rust targets and release evidence are generated. Old release scripts frequently delegate to shared implementations: rerunning them can exercise today's code while writing an old-version filename. They are not immutable proof of a historical build.

## Reproduced findings

| Area | Problem | Correction / evidence owner |
|---|---|---|
| Rhai execution | Globals execute twice during AST evaluation and function invocation; callback export mutations can reset | Disable duplicate AST evaluation; direct/cached execution regressions |
| Physics event bridge | Rust snake_case fields do not match TypeScript camelCase consumers | Canonical wire names; WASM JSON regression |
| Physics queries | Point/ray/overlap/character queries omit retained child geometry | Child proxies, owner deduplication, sensor-aware character sweep regressions |
| Project versions | Large JSON integers wrap to legacy schema values through u32 casts | Checked decoding and malformed/future-version regressions |
| Native paths | Platform-dependent validation misses Windows traversal, device and stream forms | Portable lexical checks before filesystem operations |
| Build setup | CI ignores the Node pin; normal typechecking omits Vite config | Shared CI pin, Node declarations, config check |
| Code↔graph | Loop names, branches, expression parsing, signatures, argument order, comments and source markers can change behavior | Token-aware recognition and differential execution; exact limits in scripting report |
| Script tabs | Event Sheet switch can unmount an unsaved code/graph draft | Every mode change waits for the current save result |
| Graph layout | Imported nodes bypass arrangement; no-op saves can recreate identities | Arrange imported scopes; preserve unchanged linked graphs |
| Library | Filters can hide the selected template while Create still uses it | Shared discovery and visible-selection reconciliation |
| Template runtime | Particle descriptors use ignored field names; valid math builtins get false diagnostics | Canonical component fields and runtime-verified builtin recognition |
| Property forms | Narrow labels/values and generic accessible names | Container queries and contextual input names |
| Build panel | Startup scene controls disappear in a narrow panel | Keep selectors visible on a separate row |
| Input prompts | Keyboard fallback is mislabeled as mouse/gamepad; missing/axis bindings get misleading glyphs | Describe the actual selected binding; focused regression |
| Control help | Generated disabled tooltip remains on an enabled button | Remove only registry-owned disabled hints |
| Settings accessibility | Root Settings switches announce generic `button` names | Local helper inherits its translated row label while preserving explicit names |
| Reload/reopen | Normal tab reload loses the in-memory ownership token but leaves a two-hour persisted write lease | Release only the departing document's exact held token; preserve BFCache and other writers; thirteen lifecycle regressions |

These failures show why mapped operations are not proof that all usages work. The inventory records routes, not a universal pass. Independent review added regressions for exported declarations, comments, integer semantics, tail statements and rewired callback pins.

## Binding and persistence assessment

Domains generally have serializer/runtime owners and central history. The input/change mutation router is a safety net that records serialized differences after a delay; it cannot prove every button, drag, async command, dialog or runtime edit is correct. Domain save/undo tests remain necessary. Script drafts and physics events demonstrated failures between otherwise functioning layers.

Use a per-property table of control, normalized field, serializer field, consumer, undo transaction and export test in later milestones. Prioritize Animation, Rendering, Runtime Components, World and Interface. The 401-operation table supplies starting owners; field-level proof requires actual edited, reloaded and exported values.

## Competitive comparison

This compares documented workflows and source-supported Nova_A behavior, not speed or certified parity.

| Workflow | Godot | GameMaker | Nova_A and remaining work |
|---|---|---|---|
| Scene composition | Nodes, scenes, resources | Rooms, objects/instances, asset layers | Entities/components, scenes, prefabs/variants/resources exist; deep override/undo/export qualification remains |
| Dynamic scripting | Gradual GDScript typing, functions, signals, asynchronous waits | GML structs, constructors and methods | Sandboxed dynamic Rhai, arrays/maps/modules/callbacks/tasks; inference is not a static type system |
| Authoring choices | GDScript/C# and native extensions; visual shaders | GML Code and Visual, including custom functions | Code/graphs/event sheets exist; complete structural syntax coverage is still 26.12 work |
| 2D content/rendering | Dedicated 2D rendering/physics, sprites, tiles, lights, particles, animation | Room sprites/tiles/particles/sequences and shader assets | Feature families exist; runtime fields, fallback and rendering output need deeper qualification |
| Animation | Animation and skeleton systems | Sequence assets and runtime sequence creation | Tracks/animator/rigs/timeline/audio exist; production editing equivalence is 26.16 work |
| Physics/worlds | Bodies, queries, navigation/avoidance | Object/room collision workflows | Rust compounds/CCD/joints/ropes/navigation exist; this audit repaired actual query and event defects |
| Ecosystem | Broad documented engine/tooling surface | Integrated object/room/asset workflow | Local packages/plugins/build/collaboration exist; independent adoption and platform evidence remain gaps |
| Server/rollback | Evaluate the actual chosen architecture | Evaluate the actual chosen implementation | Renderer-disabled authority is WebView-backed; arbitrary Rhai effects do not rewind; true windowless server/full rollback remain absent |
| Beyond 2D | Includes 3D | Evaluated here for 2D workflows | Nova_A intentionally targets 2D; 3D is a product decision, not a 26.11 bug fix |

Godot sources: [features](https://docs.godotengine.org/en/stable/about/list_of_features.html), [2D](https://docs.godotengine.org/en/stable/tutorials/2d/index.html), [scripting](https://docs.godotengine.org/en/stable/tutorials/scripting/index.html), [GDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html). GameMaker sources: [rooms](https://manual.gamemaker.io/monthly/en/The_Asset_Editors/Rooms.htm), [structs](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Overview/Structs.htm), [visual functions](https://manual.gamemaker.io/monthly/en/Drag_And_Drop/Drag_And_Drop_Reference/Common/Declare_A_New_Function.htm), [sequences](https://manual.gamemaker.io/monthly/en/GameMaker_Language/GML_Reference/Asset_Management/Sequences/Sequences.htm). Checked during this audit.

Nova_A could distinguish itself with predictable, reversible code/graph/event switching, equivalent execution, readable diagnostics and working examples. This is a design target, not a claim of superiority. Source-backed Code blocks preserve behavior but do not satisfy complete typed visual authoring.

## Coverage limits

The source index reads and indexes roughly 99,000 lines across source/configuration/fixtures. It is not a line-by-line semantic review of every file or proof that all errors are fixed. The panel report distinguishes 70 inventoried Vue files from focused fixes and observed interactions. Native assistive technology, another host/device, public networking, signed installer lifecycle and real-duration soak were not certified.

Generated reports live in ignored `release-audits/`; regenerate them for another checkout. Never copy them as proof of a new release. See the results below for checks actually performed and their boundaries.

## Executed verification

| Check | Actual result and scope |
|---|---|
| Source index | 720 source/configuration/fixture files read and indexed; all hashes checked against the integrated sources |
| Vue and build configuration | `vue-tsc --noEmit`, separate `tsc --project tsconfig.node.json --noEmit`, and the final optimized build passed on host Node 22.22.2; pinned pnpm 10.30.0 frozen-lockfile install reported already up to date |
| Rust workspace | 154 tests passed in the final `--workspace --all-targets --locked --offline` run |
| Native host | 14 library tests passed; workspace/native clippy with `-D warnings` and formatting checks passed |
| Generated runtime and Web output | Release WASM rebuilt from the final Rust changes; optimized editor/player/manual build passed. Vite still reports large chunks; this is an optimization target, not a suppressed warning |
| Code↔graph | 81 focused checks passed, including 47 executions in a freshly rebuilt native Rhai runner; retained 26.01 suite passed 6 and the production graph suite passed 9 at its implementation checkpoint |
| Templates | 57 new discovery/hydration/particle/WASM behavior checks passed; the general catalog verifier passed 20 grouped checks across all 40 templates |
| Input prompts | Focused fallback-device, unbound, axis and glyph regression passed |
| Project lease lifecycle | 13 production-module checks passed, including reload, BFCache, other-editor exclusion, replacement-token preservation, switching, unreadable storage and expiry |
| Browser interactions | Report passed: 579 registered controls, 214 navigation actions, 241 settings mutations/restorations, and 4 actual drag operations. The 260 settings entries also include 5 normalized, 13 blocked and 1 covered case; 3 of the 7 drag entries are review-only or context-blocked. Registration is not a successful click |
| Layout | Report passed 257 panel/window states in EN/DE/ZH, including 27 required Settings width/scale combinations; 25 captures; no console errors. Required windows are 1024×640, 1366×768 and 1920×1080 at 100/150/200% editor scale. This does not cover every theme, browser zoom, component subtype or native dialog |

Live user-style checks additionally exercised localized launcher search, empty-result disabling and creation from the visible selection, plus unsaved code→graph→block edit→code and Event Sheet switching in a disposable project. The graph's loop identity, edited log value and unsaved comment survived, with valid code diagnostics. File/Edit/Help opened at German/200% scale passed visual and hit-target checks after repairing toolbar occlusion. Settings labels translated live and toggles retained their behavior. A fresh project reloaded and reopened writable after the lease fix; camera zoom editing and its named Undo/Redo transactions worked in that reopened project. The final integrated build passed both browser suites again.

Browser automation initially could not reach Edge DevTools inside the restricted execution environment. The explicitly approved rerun outside that environment produced the interaction/layout evidence above; the failed attempt is not counted as a pass. Temporary browser profiles and an isolated localhost origin kept the checks separate from existing projects.

The next milestone still owns complete typed Rhai syntax conversion, full property-to-export binding evidence, dense studio redesign and complete manual play/export qualification of every template. Twenty new templates are working starters verified at the documented test level, not twenty finished commercial games. A 26.11 release candidate must pass the remaining qualification gates before changing release metadata or publishing installers.
