# Nova_A 26.23–26.30: current implementation instructions (2026-09-19)

This addendum takes precedence over conflicting historical instructions below. Retain all requirements in docs/ROADMAP_26_21_TO_26_30.md: the new launch, layout and stability work is additional, not a replacement for scripting, graph, debugging, asset, renderer, media or networking work. Finish and independently verify the separate 26.22 release first, then implement 26.23. Never relabel older binaries or overwrite an earlier completed release. Preserve Project Format 2/schema 29 unless an explicitly audited migration is necessary.

## Working and evidence contract

Before every edit inspect the shared owner, callers, serialization, history and runtime/export consequences. Record every changed path and what was added, removed or corrected in that version's edit ledger. Preserve existing features and default animations. Low-end settings are opt-in presentation preferences; never delete authored game animations or effects to claim an optimization. Keep failed test attempts, fix their cause, and rerun relevant checks. A source search or screenshot is not proof of runtime behavior. Every issue below requires implementation, regression coverage, actual user-flow checks, localized documentation and a truthful completion status by 26.30.

Only a Windows computer is presently available. The offered iPhone 12 has not been tested. Implement portable paths locally, but keep Linux/macOS builds, real iPhone/Android interactions, old-PC performance, production signing, clean installation, assistive technology, independent usability and true-duration soak pending until executed on appropriate environments. Never mark these passed through emulation or a Windows build. Local builds and tests must all pass before publishing each release.

## Reference review and design rationale

Use the supplied godot-master tree as read-only reference, never as Nova_A's backend or a release payload. The supplied version.py identifies a development 4.8 tree, not a released compatibility baseline. Read architecture and relevant implementation paths before borrowing a pattern; preserve licensing if actual code is copied. Current inspection covers BoxContainer sizing, SplitContainer constraints, PopupMenu pointer handling, editor bottom-panel/dock management, main-loop low-processor controls, export ownership and module inventory. This is a targeted semantic review, not a claim to have understood every source file. A structural index of 8,882 C++/header/GDScript/Python/XML files and 1,100 documented classes is retained in .cache/godot-reference-index-26-23.json; indexing does not prove behavior. Continue targeted review for each subsystem before implementing its release.

Concrete reference owners: scene/gui/box_container.cpp (_resort, bounded minimum/desired sizes and stretch); scene/gui/split_container.cpp (child minimums and divider limits); scene/gui/popup_menu.cpp (_close_or_suspend and safe rectangles); editor/gui/editor_bottom_panel.cpp (per-dock size and expand); editor/docks/editor_dock_manager.cpp (saved dock/floating state); editor/editor_node.cpp (scaled editor minimums); main/main.cpp (low-processor scheduling); platform/web/export/export_plugin.cpp (Web export); editor/project_manager/ (separate project actions).

Apply the principles to Vue/CSS rather than transplanting C++ widgets: shared content-aware width tokens; bounded resize; one primary page scroll; detail/expand mode; explicit popup ownership and pointer travel tolerance; repaint only when dirty while preserving live animation. Virtualized lists and timelines may retain purposeful independent scrolling. At high zoom or small screens, use focused pages/drawers, not clipped content or an impossibly large fixed desktop.

Godot feature families to compare explicitly with Nova_A's actual implementation: GDScript classes/resources/signals and C# integration; true debugger suspension; scene inheritance and resource overrides; theme/text shaping/IME/accessibility; mature importer/export-plugin ecosystems; TileMap/navigation tooling; animation blending/interactive music; multiplayer transports and windowless servers; native desktop/mobile export and Web/PWA delivery. Record full/partial/missing with source and behavioral evidence. Godot's 3D physics, 3D navigation, CSG, FBX/glTF 3D workflows, lightmapping, XR/OpenXR/WebXR and mobile XR are explicit scope decisions for a 2D engine, not features Nova_A already supports or mandatory stealth additions. Do not claim parity from matching panel names. By 26.30 every comparison gap must have a shipped implementation, a tested narrower contract, or an explicit justified scope decision; user-reported defects remain closure requirements.

### Additional Godot comparison register to resolve by 26.30

These are comparison obligations, not untested claims that Nova_A lacks every item. For each family, classify the current implementation as complete, partial or absent using actual code and execution. Link defects to the owning release above/below.

| Family / Godot reference | Required Nova_A comparison and decision | Owner |
|---|---|---|
| Control, Container, SplitContainer, EditorDock | Minimum/desired size propagation, expandable/floating docks, persistent layouts, focus and accessibility; translate to CSS/Vue rather than copy a native widget tree | 26.24–26.26 |
| CodeEdit, Script, GDScript, Resource | Typed/dynamic language semantics, completion, reload state, module scope and script/resource identity; explicit differences from GDScript/C# classes | 26.23–26.25 |
| GraphEdit, GraphNode | Connection validation, selection, zoom, minimap, automatic arrangement, undo and source synchronization; distinguish graph UI from structural language coverage | 26.24 |
| EditorDebuggerSession, SceneTree, Node | Real pause/step, live scene inspection, signals/groups, ownership and lifecycle; never equate diagnostic snapshots with suspended stacks | 26.25 |
| PackedScene, ResourceLoader, EditorImportPlugin, EditorExportPlugin | Scene inheritance/overrides, asynchronous loading, importer extensibility, stable dependencies and export presets; exact failure/rollback behavior | 26.26, 26.29 |
| TileMapLayer, TileSet, NavigationServer2D | Terrain/autotile/pattern editing, tile collisions/navigation, path queries/avoidance and streaming boundaries; verify current bindings before adding controls | 26.26, 26.29 |
| CanvasItem, Viewport, RenderingServer | Canvas transforms, batching/lights/shadows/materials, render textures, resolution/AA and compatibility backends; document each unsupported effect | 26.27 |
| AnimationTree, Skeleton2D, Bone2D, AudioStreamInteractive | State/blend trees, skeletal/IK constraints, sequences, interactive music and effects/routing; preview/export timing equivalence | 26.28 |
| TextServer, Theme, TranslationServer, InputMap | Font shaping/fallback, RTL/bidirectional text, IME, theme inheritance, translation, remapping and accessible keyboard/touch navigation | 26.28 |
| MultiplayerAPI, SceneMultiplayer, WebSocketPeer, WebRTCPeerConnection | Authority, replication/RPC, peer/session lifetime, supported transports and service prerequisites; no blanket rollback or transport parity claim | 26.29 |
| DisplayServer, OS, platform export code | GUI versus genuinely windowless commands, multiwindow support, minimum runtime, desktop/mobile/Web/PWA export and actual target qualification | 26.29–26.30 |

Record intentional 2D scope exclusions separately from defective existing behavior. A comparison row remains open until its narrower supported contract or implementation is documented and tested; an index count cannot close it.
## 26.23 — scripting safety plus launch and interaction repairs

Retain the complete original 26.23 dynamic Rhai/modules/hot-reload contract. Audit native and WASM semantics for dynamic maps/arrays, closure capture/shadowing, function pointers, dispatch/overloads, aliases/import cycles, exceptions, budgets and resource permissions. Cache compiled modules by content and dependencies. Validate complete replacement graphs before atomic swap, preserve only compatible declared state, reject stale revisions and retain the previous working program on any failure. Cooperative tasks have owner/session/cancellation, never pretend to suspend arbitrary VM stacks. Show actual runtime signatures, dynamic values and readable reload/module errors. Prove preview/export equivalence with an inventory/callback/module sample and deliberately broken reload.

New immediate scope:
- [1.1.1, 1.1.3] Verify editor Web ZIP can be extracted under a website root OR subdirectory, with no development server or required application backend for local editing. Include hosting instructions in the ZIP: entry points, relative URLs, WASM/worker MIME, HTTPS, HTML versus hashed-asset cache policy, and limitations of browser file access. Distinguish optional multiplayer/discovery services from static hosting. Keep an explicit Download ZIP action available even when the browser also supports directory export; preserve that directory option. Verify Build Web produces a downloadable, self-contained game archive and works after upload under a nested URL; diagnose unsupported browser APIs instead of crashing.
- [4.2] Fix the brand link's exact HTTPS opener permission and handle expected open failures locally. Cover both launcher and editor icons, keyboard activation and denied URLs; never grant arbitrary URLs/schemes or swallow unrelated errors. A failed link must not trigger the global editor crash screen or lose edits.
- [2.2.2, 2.2.3] Centralize transient menu ownership. Rapid File/Edit switching must leave one active top-menu branch; outgoing animations must not leave interactive stale overlays. Submenus and explicit independent popovers may coexist by declared owner. Mouse exit uses a tested grace interval and padded travel corridor; re-entry cancels dismissal. Escape, outside-click and keyboard focus remain reliable; touch never depends on hover. Do not close modal forms or discard unsaved drafts on pointer leave.
- [4.1] Start with New, Open, Recent/Continue and a discoverable More action. New opens the existing name/location/template workflow; More reveals migration/import/recovery. Preserve all forty templates, filters, help and recovery actions. Restore focus on cancel and retain in-progress creation values.
- [2.5] Capture a real idle/repeated-navigation baseline now: frame/input percentiles, heap trend where observable, active timers/listeners/workers/GPU resources, foreground/background/resume. Find and fix demonstrated accumulating owners; do not mask leaks with automatic reload or feature removal. Continue deeper renderer work in 26.27.

Exit checks: exact-URL positive/negative opener tests; rapid menu and pointer corridor/keyboard/touch sequences; launcher create/open/migrate/archive/recovery flows; static nested-path editor and downloaded Web game checks; all original scripting semantics and rollback checks; three locales/five palettes/large text; clean builds and full release gates. Update localized lessons and per-path ledger.

## 26.24 — code/graph parity and readable workspace foundation

Retain structural IR/source preservation, all supported control flow, measured-node automatic layout, pins, stale-worker rejection, undo and native/WASM trace equivalence from the original roadmap.
- [2.1, 3.1, 3.2, 3.3] Establish shared textbox styles with visible focus, hover, disabled, read-only, invalid and pending states, sufficient contrast, comfortable spacing and selectable complete values. Long paths/signatures get expanded detail views. Use content-aware minimum dock widths and full-page expansion, one primary scroll region, persistent actions and responsive drawers. Do not force all long text onto a single line.
- [2.2.1] Profile Script-to-Design transitions. Retain/prewarm only bounded necessary canvas/grid state, schedule resize before paint, cancel stale transition callbacks and dispose real resources on project close. Verify no duplicate animation loops and no growing cache on repeated switches.
- [2.3] Repair bottom Assets/Console/etc. sizing and toolbar overlap through their shared container. Test all tabs with populated content, narrow landscape and 200% scale.
- [2.4] Translate visual programming controls, node help, diagnostics and documents through the same locale sources. Preserve user-authored identifiers/source code.
Exit: populated all-panel matrix, repeated code/design switching with frame measurements, graph equivalence and no-loss fixtures, bottom-panel resize/expand/collapse and keyboard flows. Preserve default animations.

## 26.25 — debugger, events and browser/mobile reach

Retain actual VM-backed breakpoint/watch/step capability, source revision/session binding, LSP consistency, event inheritance and handler disposal from the original roadmap.
- [1.1.2] Define a capability-based support matrix and exercise current Chromium, Firefox and WebKit where available. Internet Explorer is optional and may receive an explicit unsupported-browser page; never ship unparseable startup code before that notice. Avoid claims of all-browser support.
- [1.1.2, 1.3] Mobile editor operates in landscape: portrait shows an accessible rotate prompt while preserving project state; do not assume orientation locking is available. Support safe areas, visual viewport, software keyboard, touch targets, drag/zoom and file download/import fallbacks. Test rotating with unsaved fields and open menus.
- [1.3] Add HTTPS PWA manifest/icons and iOS Add to Home Screen guidance; scope/start_url must work under a subdirectory. Define update/offline behavior without stale mixed-version bundles. Home-screen Web app is not a native iOS binary. iPhone 12 device qualification remains explicit until actually run.
Exit: real engine/browser matrix with honest unavailable entries, mobile viewport plus device evidence where possible, downloaded game startup and portrait/landscape state survival; debugger and event contracts still pass.

## 26.26 — asset production and complete panel inventory

Retain stable UUID/reimport/dependency closure/variants/atlas/font/tilemap/package/library work and deterministic exports.
- [2.3, 2.4, 3.1–3.3] Finish Assets/Library/import/resource panel refresh with list/grid/detail views, readable long names, full-page settings and bounded virtualization. No nested scroll trap. Translate library/docs/import errors in EN/DE/ZH.
- Audit EVERY Vue panel and conditional/empty/loading/error/populated state, not only visible navigation. Record path, owner, minimum width, expansion behavior, scroll owner, text clipping, keyboard flow and unresolved findings. Apply shared layout rules to specialized panels without erasing tracks, graph canvases or property distinctions.
Exit: large-library memory/latency and reimport identity tests; all-panel defect list with no unowned issue, complete template walkthrough and export checks.

## 26.27 — measured performance, idle stability and low-end mode

Retain renderer/compiler quality, batching/residency/device-loss, native/WASM/Web output-equivalence and same-scene median/p95/p99 measurement requirements.
- [1.2] Extend and audit the existing low-end editor preset in Settings: disable editor decorative transitions/animations, lower idle redraw work and apply bounded preview policies. Offer clear individual overrides and Reset. Default retains animations; authored game animation/timing/physics/export quality stays unchanged. Respect reduced-motion accessibility independently.
- [2.5] Close idle leaks with ownership/disposal tests for timers, subscriptions, workers, object URLs, textures, audio and script sessions. Run measured foreground idle, background, repeated project switches and resume with bounded memory and responsive input. Report actual wall-clock duration, not accelerated cycles as hours.
- [2.2.1] Compare first/warm Design transitions and cache lifetime; preload only when measured benefit exceeds retained memory cost. Show actual resolution/AA/backend and fallback, never claim universal best FPS.
Exit: same hardware/scenes/resolution/effects before/after report; no feature or default-animation removal; opt-in low-end preference persistence and export isolation; real older-PC claims only after device observation.

## 26.28 — animation/audio/UI depth and localization closure

Retain sample/frame timing, blending/rig/sequence/curve editing, audio routing/streaming, IME/controller/touch/accessibility and rename/reimport binding requirements.
- [2.1, 2.4, 3.1–3.3] Finish timeline/mixer/game-UI/property forms with readable expanded detail pages, stable transport and selection, correct focus and locale fallback. Audit every document and user-facing diagnostic in EN/DE/ZH, including visual node help and generated manuals. No raw translation keys or misleading stale-language text after switching.
Exit: authored cutscene/menu with captions/music, scrub/undo/reopen/export, all locales and palettes; actual device audio/assistive checks recorded separately from automated semantics.

## 26.29 — platform/runtime delivery and world/network contracts

Retain exact world bindings, complete deterministic rollback contract, reconnect/replay/ownership, build prerequisite discovery and truly windowless authority design.
- [1.2] Diagnose missing Windows runtime on actual failing machines when available. Document supported OS/CPU/GPU and WebView2 requirements; evaluate bootstrapper versus offline runtime installer and portable prerequisites. Detect missing runtime early with actionable instructions. Do not promise unsupported Windows versions by lowering metadata. Avoid adding unnecessary runtime dependencies.
- [1.3] Provide Linux and macOS build recipes/CI-ready targets, separate editor GUI versus CLI/export/server commands, clear SDK/system-library prerequisites and architecture support. A hidden WebView is not a windowless CLI/server. Only publish platform binaries built and smoke-tested for their actual target; never rename Windows artifacts as other OS packages. Signing/notarization/store delivery remains separately evidenced.
- [1.1.1–1.1.3] Revalidate static Web editor/game/PWA delivery with networking disabled and optional service configuration enabled. Explain exact backend requirements for networked functionality, CORS/TLS and permissions; do not require a backend merely to edit locally.
Exit: local Windows/Web releases and CLI behavior pass; matching-host builds and device qualification explicitly evidenced or pending, with reproducible commands and remaining prerequisites.

## 26.30 — final closure and release qualification

Retain all original integrated audit, API/schema migration, teaching, clean/moved build, history, performance, security and output-verification requirements.
- Rebuild feature/Godot comparison/field-binding/panel inventories from actual final code. Close every user issue ID above with changed paths, regression tests, user steps, evidence and limitations. No blanket claim that panel existence proves functionality.
- Run EVERY panel across supported sizes, large text, locales, palettes, keyboard/touch, popup transitions, form validation and pending edits. Use populated datasets and long paths. No inaccessible controls, overlap or scroll traps; intentional responsive scrolling remains usable.
- Recheck idle/resume and repeated navigation, default animation preservation, low-end opt-in, quality/AA and preview/export parity. Publish measured performance and actual test duration.
- Verify upload-ready editor ZIP and downloadable game archive under root/subpath, PWA update safety, permissions and failure recovery. Maintain precise browser/OS/runtime prerequisites.
- Publish complete EN/DE/ZH manuals and migration notes. External checks cannot be declared passed without execution; identify required environment/action. Do not certify Godot/GameMaker parity or zero possible bugs.

## Release files and immutable evidence — every version

Keep exact eleven root artifacts in releases/vXX.XX: EDIT_LEDGER.md, LICENSE.md, RELEASE_NOTES.md, SHA256SUMS.txt; Nova_A-vXX.XX-source.zip, -web.zip, -reference-projects.zip, -release-evidence.zip, -windows-x64-portable.exe, -windows-x64-setup.exe, -windows-x64.msi. Put hosting instructions/manuals/config examples inside the appropriate archives, not additional root files. Extra future platform artifacts require an explicitly revised packaging contract rather than silently breaking this verifier. Never bundle the Godot reference checkout.

Freeze only after source, documentation and packaging predicates are final. Bind all actual executed gates, binaries, archives and reports to the source digest/toolchain. Independently verify checksums, executable versions, archive contents, Web nested-path startup, downloaded-game behavior and previous-release preservation. Retain genuine failures; do not rewrite them into passing history. Each release keeps its own notes, ledger, migration guidance and evidence.

---
