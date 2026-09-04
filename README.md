**Languages:** [中文](./README.zh-CN.md) | English

# Nova_A 2D Game Engine & Editor

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE.md)
[![Tier 1](https://img.shields.io/badge/Tier%201-Windows%20%7C%20Web-63c6ff)](./docs/PLATFORM_BUILD_MATRIX_5_0.md)
[![Release](https://img.shields.io/badge/release-26.10-63c6ff)]()

Nova_A is an open-source 2D game engine and desktop editor built with Rust, WebAssembly, Vue 3, and Tauri.

Release **26.10** completes the current calendar roadmap as a stable, lightweight 2D creator platform while preserving Project Format 2/schema 29 and every frozen contract. It combines first-class pen and accessible input, cancellable low-end-aware loading, lease-safe workers, cached large-world queries, fail-closed semantic collaboration, operation-specific readiness evidence, three complete creator references, and a trilingual task manual. Work that genuinely requires another host, physical hardware, signing credentials, public infrastructure, or independent people remains explicitly external.

**Manual:** [interactive English/German/Chinese webpage](./manual/index.html) · [English Markdown](./manual/MANUAL.en.md) · [Deutsch](./manual/MANUAL.de.md) · [中文](./manual/MANUAL.zh-CN.md)

## What is new in 26.10

- **Stable creator platform:** [26.10 contract](docs/STABLE_CREATOR_PLATFORM_26_10.md), [typed gap register](docs/PLATFORM_GAP_REGISTER_26_10.md), and [support matrix](docs/SUPPORT_MATRIX_26_10.md) distinguish locally verified behavior, intentional scope, and external certification without catch-all passes.
- **401 exact operation routes:** each public operation has an explicit Binding, Validation, Undo, Persistence, Runtime/export, Documentation, and Tests disposition, with a stable manual anchor in English, German, and Chinese.
- **Ultimate-performance core:** generation/lease-safe workers, deterministic yielding fallback, unchanged-scene component caches, bounded asset virtualization, lazy workspace chunks, and interaction-cancelled idle warming keep semantics and animation intact on constrained devices.
- **Platform input and accessibility:** pressure, tilt, twist, eraser and pen buttons join logical/physical keyboard, mouse, touch, gestures, gamepads, virtual controls, and permission-gated sensors on the same action path. See the [26.08 platform contract](docs/PLATFORM_INPUT_ACCESSIBILITY_26_08.md).
- **Collaboration correctness:** source-complete fingerprints, generation-aware change lists, exact identity-preserving three-way merge, real delete/reorder handling, bounded conflict reporting, and canonical post-merge validation fail closed instead of silently rewriting content.
- **Runnable end-to-end references:** code-authored, block-authored, mixed-authoring, platform-input, large-world, semantic-merge, and renderer-disabled authority projects live in the [reference library](reference-projects/README.md).
- **Release and recovery guidance:** [API/SDK](docs/API_SDK_26_10.md), [migration](docs/MIGRATION_26_10.md), [troubleshooting](docs/TROUBLESHOOTING_26_10.md), [reproducibility](docs/REPRODUCIBILITY_26_10.md), [clean-machine](docs/CLEAN_MACHINE_QUALIFICATION_26_10.md), and [independent-usability](docs/INDEPENDENT_USABILITY_26_10.md) protocols are current.
- **Complete plan:** [26.01–26.10 implementation manual](docs/ROADMAP_26_01_TO_26_10.md) and [competitive review](docs/COMPETITIVE_REVIEW_26_01.md).
- **Feature truth:** [generated full operation/binding inventory](docs/FEATURE_INVENTORY_26_06.md) covers every public operation over binding, validation, undo, persistence, runtime/export, documentation, and tests.
- **Multiplayer production:** [26.07 networking and server contract](docs/MULTIPLAYER_PRODUCTION_26_07.md) documents explicit package/permission/session gates, authority, replication, bounded rollback, replay/save scope, reviewed service interfaces, multi-instance testing, export security, and honest external limits.
- **Network Studio layout:** [26.07 all-panel audit](docs/UI_LAYOUT_AUDIT_26_07.md) covers the responsive session/protocol/replication/orchestration/replay/diagnostics workflow and the exact scope of per-instance Logs and Inspector actions in English, German, and Chinese.
- **Runnable references:** [26.07 co-op and server projects](reference-projects/README.md#nova_a-2607-multiplayer-and-server-references) exercise the state-delta rollback and renderer-disabled authority paths without claiming public-network or no-window certification.
- **Simulation production:** [26.06 implementation contract](docs/SIMULATION_AUTHORING_26_06.md) documents exact units, compounds, constraints, rope/cloth, navigation, avoidance, AI and deterministic evidence.
- **Output reliability:** [template/output contract](docs/OUTPUT_BUILD_RELIABILITY_26_06.md) aligns interactive and headless template IDs and verifies all twenty launcher templates through deterministic packages and supported outputs.
- **26.06 layout audit:** [localized all-panel audit](docs/UI_LAYOUT_AUDIT_26_06.md) covers line/letter spacing, centered single-line controls, graph-inspector containment, panels, locales, scales and viewports.
- **Production media:** [26.05 implementation contract](docs/PRODUCTION_MEDIA_26_05.md) documents materials/fallback, ordered render passes, bounded texture residency, animation and audio readiness, and fixed-frame/integer-sample capture.
- **26.05 layout audit:** [localized production workflow audit](docs/UI_LAYOUT_AUDIT_26_05.md) covers every added card, form, status, action, theme, scale and responsive breakpoint.
- **Asset and library ecosystem:** [26.04 implementation contract](docs/ASSET_CONTENT_LIBRARY_26_04.md) documents dependency visualization, deterministic import/reimport, thumbnails, content profiles, variants, trusted offline discovery, repair and export closure.
- **26.04 layout audit:** [localized Assets workspace audit](docs/UI_LAYOUT_AUDIT_26_04.md) covers dependency lanes, production profiles, variants, thumbnails, themes, scale, keyboard focus, scrolling and narrow layouts.
- **Language and debugger depth:** [26.03 implementation contract](docs/LANGUAGE_DEBUGGING_26_03.md) documents optional types/data, modules, statement maps, task cancellation, watches, breakpoints, LSP 3.17, code↔graph coverage, escape blocks, diff, and merge.
- **26.03 layout audit:** [localized Script Studio and Visual Graph audit](docs/UI_LAYOUT_AUDIT_26_03.md) covers type/statement panes, debugger tasks, live values, coverage cards, Execute Rhai source, themes, scale, and compact layouts.
- **Object-event workflow:** [Event Sheet and Object Blueprint guide](docs/OBJECT_EVENT_AUTHORING_26_02.md) documents runtime binding, inheritance, validation, reusable composition, and guided creation.
- **Responsive graph authoring:** [Visual Graph performance and interaction contract](docs/VISUAL_GRAPH_PERFORMANCE_26_02.md) documents focal zoom, direct wiring, indexed layout, batching, culling, and preserved visual feedback.
- **26.02 layout audit:** [panel and localization audit](docs/UI_LAYOUT_AUDIT_26_02.md) covers the new three-column Event Sheet studio and retained cross-panel containment.
- **20 verified starters:** Scene, Test, and Gameplay categories now have search, difficulty, setup-time, capability, and tag discovery. See the [template catalog](docs/TEMPLATE_LIBRARY_26_01.md).
- **Actual two-way visual scripting:** selecting an existing `.rhai` and switching modes opens its exact linked graph; variables, My Blocks functions, `if/else`, bounded loops, operators, entity/API values and commands convert structurally. See the [visual scripting contract](docs/VISUAL_SCRIPTING_26_01.md).
- **Every-panel containment:** flex/grid children shrink correctly, fields stay inside cards, translated text wraps, tab rows have reachable scrolling, and dense studios collapse at narrow effective widths. See the [panel audit](docs/UI_LAYOUT_AUDIT_26_01.md).
- **Version compatibility:** the public/calendar and machine/SemVer mapping is documented in [versioning policy](docs/VERSIONING_2026.md); legacy projects receive a metadata-only `<27.0.0` ceiling seal with no schema rewrite.

## Stable platform inherited from 7.0.0

- **Platform readiness:** Manage → Learning Center → Platform readiness audits all 401 public operations across seven explicit dimensions and never disguises external work as a local pass.
- **Stable contracts:** Project Format 2/schema 29, Rhai API 2, Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1 and workspace document 3 remain compatible. The next breaking-contract decision is deferred pending evidence.
- **Safe 6.x migration seal:** a dry-run preview, semantic diff, backup, deterministic canonical apply and rollback update only the historical engine ceiling to `<8.0.0`; future schemas still fail closed.
- **Complete teaching:** every public feature has EN/DE/ZH classification, prerequisites, exact workflow, expected result, persistence/export, undo/recovery, mistakes, accessibility, examples and Rhai/Visual Graph equivalents.
- **Honest platform support:** Windows and Web are locally qualified Tier 1. Linux/macOS remain matching-host, Android remains experimental/toolchain-gated, iOS/console remain deferred and 3D is out of scope.
- **Release qualification:** stable-platform and migration references, history/golden fixtures, normal-user interaction and localized layout audits, retained runtime/security/performance checks, clean-source build and exact eleven artifacts form the local evidence set. Independent observation, signing, matching-host builds and real-duration soak remain external.

See the current [stable creator-platform contract](./docs/STABLE_CREATOR_PLATFORM_26_10.md), [API/SDK guide](./docs/API_SDK_26_10.md), [migration guide](./docs/MIGRATION_26_10.md), and [troubleshooting guide](./docs/TROUBLESHOOTING_26_10.md).

## Retained v6.9.0 ecosystem and shipping baseline

- `pnpm package:publisher` validates, packs, reproduces, and mirrors bounded Package Manifest 1 archives locally; private keys and network publishing remain external and explicit.
- Dependency locks include human-readable sorted solver traces. Signed bulletin sequence/fingerprint checks enforce revocations and default High/Critical vulnerability blocking.
- Signed application updates are opt-in and plan-only: no fetch or replacement is implicit, stale/replayed/downgrade/wrong-hash input fails, and committed releases retain rollback identity.
- Team Workflow adds deterministic change lists, CODEOWNERS matching, and three-way semantic merge for project/settings/scenes/assets/Visual Graph data with an explicit choice for each true conflict.
- Ecosystem Studio → Shipping presents publisher commands, trust state, solver decisions, updater state, matching-host pipelines, signing hooks, and complete delivery/lifecycle guidance in English, German, and Chinese.
- Deterministic package/security/updater/merge fixtures, two release references, programmer/user audits, Windows/Web smoke, evidence hashes, and exact eleven-file packaging provide local evidence. Signing identities, disposable clean-machine lifecycle, second-machine reproduction, non-Windows matching hosts, independent review, and real soak remain external.

See the [v6.9 ecosystem, collaboration, and shipping guide](./docs/ECOSYSTEM_COLLABORATION_SHIPPING_6_9.md).

## Retained v6.8.0 performance baseline

The data-oriented component indices, prepared hierarchy/spatial queries, bounded worker/background/streaming paths, live latency/1%-low/startup evidence, adaptive presentation-only quality, and 10k/50k/100k fixtures remain unchanged.

## Retained v6.7.0 device baseline

- Author safe-area-aware virtual sticks, D-pads and buttons without code; their actions pass through the same Input Map as keyboard, mouse and gamepad input.
- Touch events are deduplicated from compatibility mouse events, and deterministic pan, pinch, rotate, two-finger pan, tap, double-tap, long-press and swipe gestures can bind to actions.
- Gamepads support guided remapping, dead-zone/inversion/curve calibration and device-aware prompts. Motion sensors require an explicit user gesture and permission; haptics and orientation locks degrade visibly when unsupported.
- Device Preview rotates common presets and displays safe areas, DPI and minimum touch targets. Runtime accessibility now exports semantic role/name/state/value/focus evidence and supports 200–400% text checks.
- The optional Android path discovers local JDK/SDK/NDK/platform tools and a reviewed Gradle template, validates least-privilege permissions and purposes, generates the manifest, supports non-secret signing environment variables, and exposes bounded install/log capture. A missing gate produces an exact blocker instead of a fake APK.
- Two no-code references teach a touch platformer and the same project configured for gated Android delivery. English, German and Chinese manuals include the complete workflow.

See the [v6.7 device, mobile and accessibility guide](./docs/DEVICE_MOBILE_ACCESSIBILITY_6_7.md).

## Retained v6.6.0 multiplayer baseline

- Optional reviewed adapters and authentication providers must pass bounded identity, permission, documentation, and security metadata checks before use.
- Additive Protocol 2 envelopes provide epoch/nonce/time/proof fields; malformed, oversized, rate-limited, expired, future, replayed, schema-mismatched, and unauthenticated packets fail before gameplay dispatch.
- Encryption guidance distinguishes local/WSS/reviewed encrypted transports from unencrypted direct UDP/WS and can block builds when encryption is required.
- Server/owner authority can transfer safely and returns to host/server on disconnect; scene/radius interest filtering and host/server scene handoff are visible and bounded.
- Network Studio adds explicit local lobby hosting/discovery, deterministic 2–8 peer plans, built Windows-player launch, separate log/Inspector identities, verified peers, ownership, replication diffs, rollback timeline, and bad-network controls.
- Co-op and headless-authority references plus EN/DE/ZH teaching workflows cover play, reconnect, late join, save/replay, revoked permission, client/server export, and unchanged offline play.

See the [v6.6 production multiplayer guide](./docs/MULTIPLAYER_PRODUCTION_6_6.md).

## Retained v6.5.0 physics and renderer baseline

- Compound bodies keep exact child geometry, stable child contact/sensor identity, layer/mask rules, and area-weighted mass/inertia instead of collapsing to a convex envelope.
- Static/Kinematic Chain and simple Concave colliders are prepared into exact deterministic solver pieces. Unsafe dynamic Chain/Concave bodies are blocked with a recovery path to convex children.
- CCD accounts for rotation and the full compound radius; matching manifold features warm-start; contact/constraint islands sleep and wake together; joint motors, limits and break forces use the correct linear/angular axes.
- Rope2D excludes its two owners but collides with eligible third-party compound children, transfers impulses through anchors, and retains stretch/bend breakage.
- The physics overlay draws authoritative child geometry. Renderer diagnostics expose passes, shaders, lights, particles, textures, uploads and context recovery; quality volumes select deterministic camera-local budgets without deleting effects.
- Release gates cover analytical/unit-scale/manifold/compound/Chain/Concave/CCD/joint/rope/determinism/fuzz cases, renderer fallback and budgets, localized user flows, native/Web builds and the exact eleven release artifacts.

See the [v6.5 production physics and renderer guide](./docs/PHYSICS_RENDERER_6_5.md).

## Retained v6.4.0 content and animation baseline

- Import Aseprite JSON, TexturePacker/common atlases, and Tiled TMX/JSON/TSX with stable frame IDs, pivots, colliders, tags, timing, references and visible diagnostics. Failed reimports retain the last valid artifact.
- Contextual Asset tabs show source/slices and edit six reusable Resource kinds: materials, animation libraries, input maps, physics materials, themes and data tables. Shared parents and local-only overrides resolve deterministically and cycles block Build.
- Animation adds skin-weight heat visualization, bounded automatic weights, rig constraint context, runtime-sampled onion skin, retained curves, retarget diagnostics and exact root-motion preview.
- Metadata above 128 KiB uses a time-bounded worker; canonical imports use a bounded cache. Before/after and large-atlas/timeline evidence starts the performance program that culminates in v6.8.0.
- Programmer and user gates cover golden/malformed import, reimport identity, precision, Resource inheritance/cycles/export, animation playback, EN/DE/ZH layout, native/Web builds and the exact eleven release artifacts.

See the [v6.4 content and animation guide](./docs/CONTENT_ANIMATION_6_4.md).

## Retained v6.3.0 automation and Blocks baseline

- Saving any Rhai script automatically creates or updates its linked `.nova-graph`; saving any graph creates or updates its linked `.rhai`. Recognized lifecycle/API code becomes editable typed blocks, while unsupported source stays visible and lossless in Code blocks.
- The visual editor defaults to Scratch-style categories, colored stack/hat/reporter/boolean blocks, direct sequential placement, and an optional advanced Nodes view retaining typed wires, refactoring, diagnostics, and debugging.
- **Manage → Automation** provides local Rhai templates, explicit permissions, dry-run diffs, bounded execution, cancellation, one-transaction apply, rollback, and a trace. It has no filesystem, process, network, clock, or randomness authority.
- WASM plugins are schema/signature/import/export checked without initialization. Users review individual permissions before enabling; command, selection, Inspector/gizmo, asset importer/editor, and build contributions follow the live plugin lifecycle.
- Programmer and user gates cover denial, stale handles, hostile imports, 1,000-command output, rollback, hot unload/reload, automatic graph/code round trips, EN/DE/ZH layout, native/Web builds, and the exact eleven release artifacts.

## Retained v6.2.0 scripting baseline

- The Script Studio **Contract** tab explains declared requirements, budgets, API modules, thread rules, determinism, permissions, and precise diagnostics.
- New script templates opt into versioned comment-based contracts; existing scripts without a header keep the previous behavior and global sandbox limits.
- Runtime, Project Health, and Build use one analyzer for attached components, Input Map actions, Asset Database references, enabled packages, deterministic API use, and callback budgets.

## Retained v6.1.0 improvements

- Maximized launch now takes precedence over stale saved geometry while retaining decorations, resize/restore controls, placement recovery, and optional true fullscreen.
- The repository is drive-independent: active build/export paths are relative, pnpm overrides live in the supported workspace configuration, and moved dependency links are rebuilt from the frozen lockfile.
- System-first typography, semantic light/dark materials, consistent radii, gentler contrast, and compositor-friendly motion follow Apple HIG hierarchy, color, typography, layout, accessibility, and motion principles without requiring proprietary fonts.
- Pointer events are coalesced to the newest display-frame sample; selected overlays no longer calculate every entity boundary or re-sort the scene; connection signatures, render-graph publication, and profiler diagnostics avoid duplicate work.
- Advanced workspaces and dialogs load as cached chunks and warm during idle time. The Inspector remains mounted after first use, and large docked panels no longer live-blur the animated canvas.
- Type, Rust, template/game, interaction, EN/DE/ZH layout, local browser, relocation, build, native packaging, and exact release-artifact gates cover 6.1.0.

## Retained v6.0.4 corrections

- Native Windows game export writes and verifies a same-folder staging executable before publishing it. If an older output is running and locked, Nova_A keeps it alive and emits a deterministic build-ID-suffixed `.exe` instead of failing with `Access denied (os error 5)`.
- Visual graphs can create a linked Rhai asset. Saving the graph regenerates its linked code; saving linked code updates graph variables, literals, API-node inputs, and explicit visible Code nodes for source that has no standard-node representation.
- Visual-graph compilation is debounced away from pointer movement, node/pin lookups and minimap bounds are indexed, and large graph dragging no longer repeatedly scans every node.
- The launcher and player load their full workspace chunks on demand, render ordering avoids quadratic `indexOf` sorting, profiler bookkeeping is sampled adaptively while authoring, and the Low-end profile caps only an idle scene canvas while preserving active camera/tool animation and full runtime cadence.
- Type, Rust lock regression, graph round-trip, browser interaction/layout, template, native build/game export, and exact release-artifact gates cover 6.0.4.

## Retained v6.0.3 corrections

- All 20 startup templates resolve a real Windows x64 player template when their build settings have not been edited.
- Old `windows-x86_64-v1`/equivalent synthesized IDs migrate to the compatible registered template without rewriting custom IDs.
- `RectTransform` is passive by default; buttons, sliders, checkboxes, and text inputs opt into focus with inferred roles and names.
- Reading order `0` is automatic scene order. Duplicate warnings are reserved for conflicting explicit positive orders.
- Template, accessibility, type, Rust, rendering, interaction, localization, native export, and release-artifact checks are part of the 6.0.3 gate.

## What is new in v6.0.2

- **Reachable UI at every supported scale:** shell rows grow with accessibility scale, dense navigation switches to icon-first layouts, long text wraps inside scrollable panel boundaries, and floating surfaces remain inside the window.
- **User-style interaction audit:** automated EN/DE/ZH traversal inventories registered controls, opens every workspace and panel family, mutates and restores safe settings, exercises resizers/reordering, records blocked or destructive controls explicitly, and rejects fatal/browser errors.
- **Safer backend export:** bounded web payloads, strict relative paths, output/source overwrite protection, atomic replacement with rollback, and accurate Android capability/architecture handling protect user data.
- **Actual portable game output:** the CLI and native path share a SHA-256-verified embedded `.nova-pak` footer; the release smoke test launches the exported Mouse Knockout `.exe` separately from the editor.
- **Release completeness:** the exact eleven-file release contract and ten non-circular SHA-256 entries remain enforced.

## Retained v6.0.1 playable baseline

- **Correct language ownership:** the web manual now discovers every article after generation, shows only the selected language, translates search/navigation controls, preserves locale-aware bookmarks, and keeps all generated content inside the HTML document.
- **Clear first-game tutorial:** English, German, and Chinese manuals teach the exact template → Play → object drawing → physics → scripts → UI → Project Health → portable `.exe` workflow.
- **Playable Mouse Knockout template:** move a blue kinematic block with the pointer, knock eight dynamic prefab targets outside the camera, earn one point each, and reveal the congratulations bar at 8 / 8.
- **Precise pointer physics:** Rhai API v2 adds `mouse_world_x/y`, `view_min/max_x/y`, and viewport size. Replay/network-replay data preserves the new values with legacy fallbacks.
- **Release integrity:** no schema, stable contract, existing template, feature, animation, shortcut, or rendering path was removed.

## Retained v6.0.0 creator baseline

- **Learn by doing:** first-run onboarding and **Manage → Learn** teach every public feature with exact steps, persistence, recovery, accessibility, examples and Rhai/Visual Graph links.
- **Twelve complete projects:** Snake, platformer, top-down, physics puzzle, localized menu, cutscene, TileMap world, checkpoint, package/plugin, networking, Windows portable and web deployment.
- **Stable contracts:** Project, Rhai, graph, plugin, package, build and workspace contracts expose compatibility and fail-closed migration behavior.
- **Large projects:** map-backed 10,000-object hierarchy lookup, 50,000-asset and 1,000-node qualification, bounded memory and a low-end creator profile.
- **Complete manuals:** the searchable/bookmarked HTML and three Markdown manuals are generated from the same EN/DE/ZH teaching catalog used by the editor.
- **Honest evidence:** signing, independent clean machines, a second-machine reproduction, matching-host builds, independent browser/hardware/accessibility and a real 72-hour soak remain pending external gates.

Read [creator experience](./docs/CREATOR_EXPERIENCE_6_0.md), [stable contracts](./docs/STABLE_CONTRACTS_6_0.md) and [performance/accessibility qualification](./docs/PERFORMANCE_ACCESSIBILITY_6_0.md). The [extensions and platform delivery](./docs/EXTENSIONS_PLATFORM_DELIVERY_5_9.md), [networking/replay](./docs/NETWORKING_REPLAY_5_8.md), [world/navigation/AI](./docs/WORLDS_NAVIGATION_AI_5_7.md), [animation/audio/cinematics](./docs/ANIMATION_AUDIO_CINEMATICS_5_6.md), [materials/effects](./docs/MATERIALS_EFFECTS_5_5.md), [gameplay framework](./docs/GAMEPLAY_FRAMEWORK_5_4.md) and [production visual scripting](./docs/VISUAL_SCRIPTING_5_3.md) guides remain current.

### Retained v5.8.0 networking baseline

Permission-gated reliable/unreliable channels, RPC contracts, bounded replication, prediction/rollback, poor-link simulation, replay/save, sanitized diagnostics and authoritative headless validation remain intact.

### Retained v5.7.0 worlds baseline

Hierarchical/grid navigation, 10,000-agent bounds, behavior-tree blackboards/perception/utility, streaming dependencies/state handoff and deterministic scene/prefab TileMap baking remain intact.

### Retained v5.6.0 animation/audio baseline

Blend trees, synchronized animation layers/transitions, runtime recording, nested/branching timelines, safe-area subtitles, waveform loop regions, mixer snapshots/ducking and loudness/device diagnostics remain intact.

### Retained v5.5.0 rendering baseline

Deterministic material graphs/layers, isolated shaders, post presets/volumes, modular particles, honest Canvas2D/WebGL2 fallback, real previews and rendering-budget recommendations remain intact.

### Retained v5.4.0 gameplay baseline

Stable dynamic-object handles, bounded queries, eleven gameplay components, game flow, production input interactions and shared AI diagnostics remain intact and compatible.

### Retained v5.1.0 playable/export baseline

- Matching-host Windows/Linux projects default to a SHA-256-verified single-file portable player while explicit sidecar choices remain compatible.
- Standalone games mount player-only services, and the Snake template remains the keyboard/gamepad/input/signal/trigger/export reference.

### Retained v5.0.1 UX baseline

- **Clear control hierarchy:** direct workspace, transform, history, and simulation controls remain visible; layout, command/search, authoring, drawing, snapping, guide, camera, and arrangement commands now live in named, keyboard-accessible groups.
- **No scene-toolbar scrollbar:** the authoring surface adapts without hiding commands behind a browser-like horizontal scrolling strip.
- **Readable multilingual chrome:** a 12 px caption floor, 13 px dense controls, larger body/heading roles, two-line context-rail labels, wider popovers, and localized migration checks protect English, German, and Chinese layouts.
- **Refined themes and motion:** deeper dark surfaces, muted light surfaces, clearer borders, role colors for selection/creation/secondary actions, softer elevation, unified rounding, purposeful press/hover transitions, and reduced-motion preservation.
- **Preserved contracts:** Project Format 2 stays at schema 29; Rhai API v2, Plugin API 2, Package Manifest 1, Build CLI 1, workspace document 3, shortcuts, features, and the eleven-file release contract remain unchanged.

See the authoritative [v5.0.1 UX specification](./instructions.txt) and [UX guide](./docs/UX_GUIDE_5_0_1.md).

### Retained v5.0.0 frozen baseline

- **Tiered, reproducible builds:** Windows/web Tier-1 presets, explicit target availability, content stripping/compression, symbols/crash output, provenance, CycloneDX SBOM, safe web headers, release channels, signing/notarization hooks that never run implicitly, and comparable build history.
- **Fail-closed packages:** trusted registry policy, pinned lock resolution, checksums/signatures, dependency constraints, offline mirror, rollback, cache verification, license/vulnerability policy and pre-install publisher/permission/provenance review.
- **Local-first collaboration:** Git guidance, semantic scene/resource comparison, external-change handling, CODEOWNERS output, ownership, task/change notes, shared presets and advisory binary locks—with no mandatory cloud service or hidden network action.
- **Release-ready onboarding:** versioned offline three-language manual, first-game walkthrough, package/plugin SDK, build, source-control, migration and release-engineering guides, direct health/build help links, five release reference projects and automated documentation validation.
- **Frozen authoring contracts:** new projects use Rhai API v2, 4.x workspace layouts migrate to document 3, and incomplete Experimental targets no longer appear in the default release picker.
- **Actionable warnings:** Launcher migration, Project Health, Package Manager, Script Studio, and Build Settings warnings open stable offline help targets.
- **Honest certification:** local audits and candidate artifacts are separated from the still-pending time-based and independent external gates.

Start with the [first-game tutorial](./docs/FIRST_GAME_5_0.md), [platform/build matrix](./docs/PLATFORM_BUILD_MATRIX_5_0.md), [build/export guide](./docs/BUILD_EXPORT_5_0.md), [package/plugin SDK](./docs/PACKAGE_PLUGIN_SDK_5_0.md), [migration guide](./docs/MIGRATION_5_0.md), and [release-engineering guide](./docs/RELEASE_ENGINEERING_5_0.md).

### Retained v4.7 animation and runtime UI

Production animation, 2D rigs, responsive runtime UI, themes, localization, RTL, accessibility, captions and automatic input prompts remain fully available.

### Retained v4.6 programming workflow

Rhai API v2, semantic Script Studio, debugger, transactional hot reload, script tests/coverage, headless CI and external-tool protocols remain fully available.

### Retained v4.5 production physics

Accurate/Balanced/Fast/Custom solver profiles, structured spatial/contact queries, CharacterBody2D, Area2D, production colliders/joints/Rope2D, deterministic collision events, Physics Monitor, diagnostic overlays, and measured solver evidence remain unchanged.

### Retained v4.4 content-production pipeline

- **Deterministic Asset Database:** importer/version/preset/settings/hash provenance, dependency cycles and repair, duplicate sources, build inclusion closure, content groups, tags, favorites, collections, saved searches, grid/list view, bounded thumbnails, incremental 20,000-asset browsing, source-control state, watcher conflict choices, transactional folder moves, Compare, Revert, and batch reimport.
- **Production sprites and atlases:** filtering, mipmaps, color/transparency/compression, PPU, pivot, trim, grid/automatic slicing, nine-slice, polygon/collision, animation extraction, SVG, deterministic atlas packing, reports, and platform overrides.
- **TileMap and composition:** searchable TileSet palettes, complete paint/selection tools, per-layer physics/navigation/occlusion, streaming boundaries, deterministic storage/history, camera bounds/smoothing/safe frames/multiple views, parallax repeat/mirror/depth, and reusable tangent-based paths with followers.
- **Runtime fonts:** shaping, OpenType, hinting, oversampling, bitmap/SDF/MSDF, fallback chains, platform settings, editor/game ownership, and actionable CJK/RTL/combining/emoji glyph reports.
- **Refined interface:** bundled rounded Nunito/Noto type, role-based control sizes, softer materials and radii, purposeful transform/opacity animations, visible focus, and complete reduced-motion handling.

See the [asset pipeline contract](./docs/ASSET_PIPELINE_4_4.md), [sprite/TileMap/font guide](./docs/SPRITE_TILEMAP_FONT_4_4.md), and [known issues](./docs/KNOWN_ISSUES_4_4.md).

### Retained v4.3 authoring foundation

Scene tabs, stable hierarchy and component identities, multi-Inspector, prefab v2 variants/conflicts, rulers/guides, exact snapping, transactional edits, and the 10,000-object hierarchy remain unchanged and fully supported.

### Retained v4.2 data-integrity foundation

- **Atomic project transactions:** manual saves validate and canonicalize first, journal every affected scene/asset/script/animation/UI/settings/package/build file, stage temporary data, verify checksums, and preserve the last manual save across interruption, permission, path, disk, file-lock, antivirus-delay, and network failures.
- **Deterministic data:** stable ordering, LF/UTF-8 text, finite shortest-round-trip numbers, lowercase UUID references, authored/generated separation, validator, deterministic re-save, and identity-based semantic scene/prefab/resource diff.
- **Central undo and recovery:** named/grouped/nested history has timestamps, resources, count/memory bounds, redo invalidation, and a searchable Undo History surface. Verified autosaves are separate from manual saves; Recovery Browser previews conflicts and offers restore, discard, or new-identity copy without silent overwrite.
- **Safe migration and repair:** schemas 5–29 use dry run, compatibility/impact report, Task Center log, backup, full validation, deterministic rerun, and rollback. Project Health adds read-only repair preview, missing-reference mapping, cache rebuild, manifest repair, transaction journals, recovery status, and recoverable project trash.
- **External/team safety:** guided Open/Add existing/Migrate older/Import archive workflows, project locks/read-only open, watcher self-suppression, source-control/large-update classification, compare/reload/keep-editor/keep-disk choices, and exact-count destructive confirmations.

See the [serialization specification](./docs/SERIALIZATION_SPECIFICATION_4_2.md), [schema matrix](./docs/SCHEMA_COMPATIBILITY_MATRIX_4_2.md), [transaction contract](./docs/PROJECT_TRANSACTIONS_4_2.md), [undo coverage](./docs/UNDO_COVERAGE_4_2.md), [recovery guide](./docs/RECOVERY_4_2.md), and [migration/rollback guide](./docs/MIGRATION_AND_ROLLBACK_4_2.md). The [v4.1 navigation and design-system documentation](./docs/NAVIGATION_4_1.md) remains current.

### Retained v4.0 production baseline

- **Upgrade Assistant:** every external project receives a pre-open format/engine/content/package report. Supported 3.x upgrades require a full backup, retain rollback data, migrate in memory, validate and canonicalize the entire result, and never replace the session on failure. Schema 29 remains frozen.
- **Stable support contract:** Studio Status declares Stable/Beta/Development channels, an offline known-issues feed, patch policy, archived-engine guidance, release health, and opt-in local crash-report packages with privacy review. Nothing uploads automatically.
- **Production documentation:** the multilingual complete manual now links the supported API, migration, build/CI, package, performance, security, accessibility, troubleshooting, support, license, and guided small-game/export paths.
- **Stable defaults:** Experimental networking remains available as an optional package and reference but is removed from the default project-template set. Safe, qualified defaults take precedence over maximum visual effects.
- **Final qualification:** the v4 evidence set records the migration corpus, Tier-1/browser/layout/reference matrices, package security, malformed-input tests, performance comparison, accessibility, documentation, SBOM/licenses, provenance, release health, installer gates, and sign-off state without claiming external gates that did not run.

### Retained v3.9 productization

- **Build automation:** validate/import/test/build/export/package/version commands, headless operation, presets, clean/incremental/validated cache modes, include/exclude and stripping, compression, size/dependency reports, symbols, manifests, metadata, CI and JSONL logs.
- **Honest platform policy:** Windows x86-64 editor/runtime and Web runtime are Tier 1. Linux and macOS stay Experimental until their matching-host matrices pass. Mobile and console are explicitly Unsupported until after 4.0.
- **Secure packages:** Stable requires SemVer, engine/API ranges, dependency hashes, entry type, archive identity and a verified signature. Permissions appear before install and on escalation; failures quarantine; lockfiles, offline cache, rollback and Safe Mode are deterministic.
- **Team workflows:** structured scene/prefab/resource/settings/package diffs, external reload/compare, canonical no-op saves, shared/local separation, Git initialization, optional locks, pre-commit/CI templates and operation summaries.
- **Support and freeze:** the offline manual is searchable, context links route to focused help, Studio Status provides migration/known-issue views and a privacy-reviewed diagnostic bundle, and schema 29 plus Runtime API 1, Plugin API 2, Package Manifest 1 and Build CLI 1 are frozen for 4.0 stabilization.
- **Retained world data:** Tilemap 2.0, navigation, streaming cells, save recovery and optional pools from schema 28 remain fully supported and migrate losslessly to schema 29.
- **Experimental networking gate:** bounded transport, RPC, authority, replication, prediction, diagnostics and headless interfaces remain optional and are not a 4.0 core blocker.

See [guided first game](./docs/CREATE_EXPORT_SMALL_GAME_4_0.md), [migration](./docs/MIGRATION_4_0.md), [API index](./docs/API_REFERENCE_4_0.md), [Rhai API v1](./docs/RHAI_API_V1.md), [build/CI](./docs/BUILD_CI_GUIDE_4_0.md), [support](./docs/SUPPORT_POLICY_4_0.md), [security](./docs/SECURITY_GUIDE_4_0.md), [accessibility](./docs/ACCESSIBILITY_GUIDE_4_0.md), and [troubleshooting](./docs/TROUBLESHOOTING_4_0.md).

### Retained v3.3 authoring foundation

- **Universal creation:** Shift+A or Create Object opens a searchable Core/2D/Physics/UI/Audio/Camera/Navigation/Script/Packages palette with compatibility, requirements, favorites, and recents. Camera, sprite, collider, script, and light creation never leaves Design and every creation is one undo step.
- **Complete viewport editing:** move, rotate, scale, pivot, rectangle, path, polygon, collider, and ruler tools join align/distribute/mirror/90° rotation, frame, isolate, grouping, box/multi-selection, filters, and grid/pixel/vertex/edge/center/angle/object snapping.
- **Professional inspector:** search and categories work with multi-selection and mixed values. Reset, revert override, copy/paste value, copy path, keyframe, help, pin, and modified-only actions use validation metadata; components support enable, copy/paste, reorder, reset, and removal.
- **Sprite and camera workflow:** sprites expose pivot, region, flips, tint/modulation, sizing, nine-slice borders, sorting, layer and visibility. Imports add trim, sprite-sheet slicing, preview/filter/compression/color/pixel settings. Cameras add zoom, limits, smoothing, drag margins, follow, preview, pixel-perfect, and common-resolution overlays.
- **Hierarchy productivity:** rename, duplicate, reparent, reorder, group, and delete remain transactional. Normal drag preserves world transform; Alt-drag keeps local transform; Shift-drag reorders. Breadcrumbs, component/tag search, status badges, lock/hide/isolate, and large-scene mode reduce navigation time.
- **Measured release evidence:** six new source references cover pixel art, resolution-independent art, parallax, multiple cameras, nested prefabs, and 5,000 objects. Reports cover object creation/round trips, inspector transactions, pixel-perfect zooms, viewport latency, and the documented platformer workflow.

### Retained v3.2 project-data foundation

- **Authoritative project manifest:** project UUID, engine range, schema, package lockfile, build presets, and source/shared/generated/cache/user-local directory ownership are explicit and validated.
- **Deterministic text data:** canonical JSON uses sorted keys, policy-sorted set arrays, preserved authoring order, finite normalized numbers, two-space indentation, UTF-8-compatible text, and one final LF. No-op saves are byte-identical.
- **Scenes and prefabs:** scene instancing, nested scenes, nested prefab layers, stable source identities, Apply/Revert/Reset/Compare/Unpack workflows, component-dependency validation, and a project-wide scene dependency graph are persisted.
- **Production asset workflow:** source and artifact hashes, importer versions, dependencies and reverse dependencies, background progress/cancel/retry/logs, external-change choices, import presets, previews, favorites, saved filters, missing-resource repair, unused reports, and dependent previews are connected.
- **Safe migration and repair:** every supported schema has a registry entry. Project Manager shows engine/package compatibility and the dry-run migration plan; backups and rollback protect the current session. Future schemas open only in a non-mutating compatibility viewer.
- **Window behavior:** the desktop editor starts maximized with normal decorations and remains resizable/restorable. F11 is the explicit true-fullscreen toggle.
- **Measured evidence:** the v3.2 release includes deterministic/no-op reports, the schema migration matrix, move/rename UUID evidence, a 50,000-asset benchmark, reference coverage, source/binary packages, and checksums.

### Retained v3.1 editor-safety foundation

- **Recoverable windowing:** F11 preserves and restores the last valid maximized or windowed state, and disconnected-monitor positions recover safely.
- **Professional workspaces:** Design, Script, Animation, UI, Debug, and Custom support collapse, resize, left/right docking, per-user or per-project persistence, save/duplicate/rename/update, import/export, reset, and safe-layout startup.
- **Faster navigation:** the command palette globally searches commands, settings, assets, scenes, objects, components, and scripts. Back/Forward and a conflict-safe shortcut editor make every core command discoverable without hunting through panels.
- **Project safety:** named transactional history retains 100 mixed operations. Checksummed, bounded autosaves stay separate from manual saves; crash startup offers snapshot selection, corrupt-entry skipping, read-only recovery, and Safe Mode.
- **One status surface:** Task Center combines imports, builds, package work, migrations, and saves with progress, cancellation, retry, error details, and copyable diagnostics. App-styled toast/banner/modal/inline feedback replaces browser dialogs.
- **Cleaner terminology and placement:** Presentation becomes the central UI workspace, Production Lab is Profiler, runtime/save diagnostics move to Debug, plugin management moves to Packages, and project metadata becomes Project Health. Optional AI/world/network tools stay hidden until relevant.
- **Auditable delivery:** the release evidence includes multi-resolution layouts, first-launch configuration, keyboard coverage, crash recovery, 100-step Undo/Redo automation, benchmarks, stability smoke, build logs, checksums, and explicit pending qualifications.

### Retained v2.9 shipping and collaboration foundation

- **Focused Shipping workspace:** Build Settings is divided into Overview, Platform, Delivery, and Team pages, with validation and build reports visible without scrolling through one long form. The bottom toolbar collapses to a compact selector when space is narrow.
- **Platform delivery:** Windows, Linux, macOS, Web, and conditional Android targets expose debug/release profiles, x86_64/aarch64, identifiers, versions, icons, splash, orientation, permissions, signing/notarization guidance, compression, and preflight validation. Android remains unavailable until its official package, SDK, JDK, and local template are present.
- **Reproducible exports:** stable project text, sorted package sources, deterministic `.nova-pak` timestamps, SHA-256 build records, incremental writes, cache metrics, patch manifests, and the `pnpm export -- …` headless CLI make builds inspectable and automation-friendly.
- **Player operations and privacy:** structured logs, crash records and symbol maps are explicit delivery options. Telemetry is disabled by default, bounded to scalar events, requires HTTPS, and shows its privacy contract before enabling.
- **Team workflow:** UUID-level source status overlays, generated ignore rules, bounded native diff/merge hooks, three-way conflict detection, stable scene/prefab JSON, and expiring machine/file locks support review without hiding project state.
- **Registry safety:** registry browsing shows verified publishers, requested permissions, ratings, documentation and security links; browsing never executes a package. Explicit installs and offline/local mirrors remain separate actions.
- **Safe upgrades and complete examples:** older projects receive a schema/package impact preview, optional complete backup, validation-before-replacement, and a downloadable rollback copy. Empty, Platformer, Top-down, Physics Sandbox, UI Showcase, and Networked Optional templates are audited at creation.

### Retained v2.8 production foundation

- **Production Lab:** trace every frame across input, scripts, animation, physics, audio, rendering, assets, allocations and GPU passes; capture and compare bounded memory/lifetime snapshots.
- **Deterministic regression:** record input, replay with fixed seeds, compare physics checksums and export replay assets. Rhai `random()` and `random_range()` are seeded by the runtime.
- **Automated testing:** unit, scene, integration and headless definitions support assertions, timeouts, optional screenshots, and JSON/JUnit CI reports.
- **Data resources:** schema/table assets validate typed fields, import CSV/JSON/database results, generate TypeScript accessors and migrate versioned save envelopes.
- **Bounded jobs:** worker-count/queue limits, cancellation and a serialized fallback prevent unavailable workers from flooding the UI thread.
- **Optional networking:** install the official package to enable WebSocket or native UDP transports, RPCs, snapshots, interpolation, prediction/rollback helpers, replication budgets and diagnostics. It remains disabled and excluded by default.
- **Headless server:** native builds can select authoritative headless runtime mode; validation blocks an invalid platform or missing networking package.
- **Sharper presentation without jagged edges:** WebGL multisampling, high-quality Canvas interpolation, rounded stroke joins and optical font shaping improve UI and game rendering while preserving explicit nearest-neighbor pixel art.

- The dedicated **Presentation** panel keeps UI, localization, audio, and runtime accessibility authoring out of the Object Inspector and is available from Interface workspace and Command Palette.
- Canvas/RectTransform/Panel now apply anchors, fill/content/fixed size policies, safe areas, aspect constraints, responsive breakpoints, horizontal/vertical/grid containers, clipping, rounded masks, wheel-driven scroll views, and reusable UI prefabs.
- `.nova-theme` resources support parent inheritance, variables, normal/hovered/pressed/disabled/focused states, live preview, style classes, and per-control overrides.
- Runtime UI provides visible keyboard/gamepad focus, explicit or spatial navigation, screen-reader metadata, and controls that capture input remaps. Runtime accessibility remains separate from editor preferences.
- Localization tables support source/preview locale, fallback chains, plural/select forms, variables, number/date formatting, pseudolocalization, font fallback, RTL layout, live preview, and build-locale stripping.
- The audio graph supports custom buses, parent routing, sends, mute/solo, effects with wet/dry processing, meters, snapshots, ducking, spatial curves, streaming overrides, and bounded master/per-bus voices.
- Audio assets gain decoded waveform preview, loop markers, peak-normalization gain, streaming selection, and active/streaming/buffered/limited voice diagnostics.
- The bundled manual now opens in a same-origin app overlay. It no longer asks Tauri to open `http://tauri.localhost/manual/index.html`, eliminating the reported fatal URL-permission error.
- Every release ships web, source, portable EXE, MSI and NSIS artifacts plus release notes, license and SHA-256 checksums.

### Retained v2.6 worlds and gameplay foundation

- CharacterBody2D provides slopes, steps, floor/wall/ceiling state, floor snapping, moving-platform velocity, one-way platforms, coyote helpers, and exact-unit Rhai motion.
- Area2D effectors accumulate gravity, wind, drag and buoyancy for one authoritative Rust fixed tick; damage and custom signals use the bounded runtime event queue.
- Navigation regions/agents provide bounded grids, polygons, obstacles, A* or flow fields, avoidance, smoothing, dynamic rebakes and Scene debug overlays. Navigation and behavior tools remain separate lazy project packages.
- Behavior-tree and hierarchical state-machine assets connect to runtime signals without entering physics-only builds.
- Tilemaps now support palettes, brush/terrain assets, layers, streaming controls and collision/navigation/occluder bake diagnostics.
- World chunks stream scenes asynchronously under priority and memory budgets, shift the origin at large coordinates, and use portals for runtime scene transitions.
- Object pools prewarm bounded prefab instances and connect spawn/despawn lifecycle signals. The Platformer template demonstrates CharacterBody2D.
- The dedicated World Tools bottom panel keeps character, area, navigation, AI, streaming and pooling authoring out of the long Object Inspector.

### Retained v2.5 asset and package foundation

- Content-addressed imports hash source bytes, importer version, platform, and normalized settings; identical imports reuse the Cache API artifact.
- Imports run through a bounded background queue with visible progress and cancellation. File watching is debounced, cache writes are staged, and a failed reimport keeps the last valid artifact.
- Asset tools expose dependency/reverse-dependency lookup, reference and build-inclusion explanations, unused reports, missing-reference reports, and path repair on move/rename.
- The importer has settings/previews for images, atlases, fonts, audio, tile data, scripts, shaders, animations, and localization data.
- The Package Manager covers local/Git/registry manifests, semantic-version compatibility, lockfiles, offline cached manifests, update previews, disabled/incompatible views, and uninstall-impact checks.
- Plugin API 2 adds declared editor/runtime contribution points, per-project enablement, capability permissions, SHA-256/signature verification, bounded WASM memory/call budgets, crash isolation, and Safe Mode. Native extensions are never downloaded or executed.
- During Play/Pause, the Physics Monitor slides out with position, direction, speed, acceleration, velocity, force, energy, contacts, and a bounded collision timeline containing impact forces, impulses, collision points, and before/after relative motion.
- ResizeObserver delivery notices are filtered from fatal crash reporting, and resize work is coalesced to one animation frame to prevent the reported false render crash.
- Project Format 2 schema 18 validates package state and Plugin API 1/2 manifests while preserving existing 2.4 animation resources.

### Retained v2.3 rendering foundation

- The **Rendering** bottom tool edits ambient light, shadow quality, color space, debug views, post effects, user post materials, safe material shaders and live previews.
- Point, spot, directional and area lights honor rendering layers/masks; ShadowCaster2D supports hard/soft/ultra quality and SpriteRenderer2D normal maps affect light response.
- Materials carry validated shader source, textures, finite uniforms, blend mode, sampling, color space and color-write state. Invalid shaders use the default material without breaking the frame.
- Multiple Camera2D components support priority/stack ordering, normalized viewports, culling masks, pixel-perfect placement and named render-texture captures.
- Optional color adjustment, vignette, bloom, blur and custom material passes are isolated from UI/editor overlays. World and UI images support nine-slice rendering.
- Image imports expose sRGB/linear metadata and platform compression variants. Atlases, nearest/linear sampling and existing sprite-region settings remain supported.
- Rendering diagnostics show pass timing, draw calls, triangles, textures, overdraw, render targets and GPU time where timer queries are supported; captures download as PNG.
- The Scene toolbar now participates in document flow, preventing overlap with the workspace strip and Canvas labels. Overlay clearing and selection reset remove retained white handle dots on axis/scene changes.

### Retained v2.2 scripting foundation

- Script is now a dedicated full-width workspace instead of a tiny textarea inside the Asset importer.
- Explicit `use "…"` project modules support dependency diagnostics and reject missing or circular dependencies. Package declarations are read-only metadata.
- Typed Entity/Component/Animator/AudioSource handles report `valid`, `kind`, `id`, and `error` consistently.
- Signals connect custom editor events, scripts, physics contacts, UI callbacks, animation events, and scene lifecycle at safe runtime boundaries.
- Entity-owned `task_wait`/`on_task` scheduling is cancelled automatically when the entity or scene ends.
- Development sessions support persisted breakpoints, Continue/Step, call stack, locals and safe property-path watches; release packages strip debugger metadata unless Development Build is enabled.
- Templates retain physical metre-scale values but now open at 40 editor pixels per world unit, so default characters and platforms are immediately visible.
- Bottom tools use larger default text and responsive proportional panes; script editing no longer competes with the folder tree and asset importer.

### Retained v2.1 editor workspace foundation

- Five one-click workspaces provide focused layouts without removing any editor panel or capability.
- Hierarchy, Inspector and bottom drawer visibility are independently controllable; Focus Mode temporarily hides chrome without erasing the saved layout.
- The default Design workspace keeps the bottom drawer folded, and local layout persistence validates malformed or stale stored data before use.
- `Ctrl/Cmd+K` or `Ctrl/Cmd+Shift+P` opens a keyboard-navigable command palette covering workspaces, views, settings, all bottom tools, panel toggles and layout reset.
- Inspector search and General/Transform/Rendering/Physics/Gameplay/UI categories eliminate long-scroll hunting.
- Add Component is now an always-visible, searchable, categorized picker that uses the original component creation and undo paths.
- View menu layout commands and responsive 900 x 600 behavior keep the new shell discoverable in English, German and Chinese.

### Retained v2.0 engine foundation

- Nova_A starts in a Project Manager with New, Open, Import, Continue and local recent-project workflows.
- Four self-auditing templates are included: Empty 2D, Platformer, Top-down and Physics Sandbox. They refuse to open if a subsystem required by their tutorial is missing.
- **Nova_A Project Format 2** (currently schema 29) records compatibility/project identity and migrates every supported legacy schema from 5 onward.
- Stable Component API 2.0 documents every built-in component and keeps rendering, collision, editor and runtime responsibilities separate.
- Rhai scripts can persist finite booleans, numbers, strings, arrays and maps through isolated named save slots.
- WASM Plugin API 1 validates manifests/modules, exposes only log/event capabilities, and provides no filesystem, network or process access.
- The bundled manual documents every editor command, component, physics property, runtime API, asset workflow, build option, migration step and three complete tutorials in English, German and Chinese.
- CI now validates all three desktop operating systems and audits documentation completeness in addition to code, WASM and frontend builds.

### Retained v1.9 distribution and debugging foundation

- Nova Player is a runtime-only application mode containing the runtime, physics, renderer, audio, scripts, input, and packaged assets. It does not mount the Inspector, Hierarchy, Asset Browser, editor grid, menus, or gizmos.
- Build Settings configures game name, Windows/Linux/macOS/Web target, x86_64 architecture, ordered scenes, startup scene, development metadata, output directory, and optional executable-embedded game data.
- `game.nova-pak` is a versioned indexed archive with per-entry paths, offsets, MIME/type metadata, original sizes, optional gzip blocks, and SHA-256 verification. Project JSON and imported assets are packaged once rather than emitted as hundreds of loose content files.
- Host-native Windows and Linux builds produce Nova Player plus `game.nova-pak`, or one executable with the package appended and read from a verified footer. macOS builds preserve the `.app` bundle and place the package beside its internal player. Web builds produce `index.html`, the production Nova Player modules, and `game.nova-pak`.
- Console messages now support Trace, Debug, Info, Warning, Error, and Fatal levels, category/search filters, source data, a 2,000-message bounded history, and script-asset navigation.
- Profiler samples real frame, physics, rendering, script, animation, and audio times, plus FPS, memory when exposed by the browser, draw calls, sprites, bodies, contacts, and script instances. A bounded history chart can be frozen or cleared.
- Physics debugging can overlay colliders, contact points, normals, sleeping bodies, AABBs, joint constraints, and rope nodes.
- Frontend failures and Rust panics write versioned diagnostic logs under the user's Nova_A application-data `Logs` directory. CI validates Rust tests and clippy, TypeScript, WASM, frontend production output, and the Tauri backend.
- Game UI now renders and can be selected in Scene view, automatically receives a Canvas when needed, has component-specific visible defaults, shows missing-image placeholders, imports images directly from the Inspector, and uses a native Game-view TextInput overlay for selection, paste, passwords, IME, German, and Chinese input.
- Bottom tabs always wrap instead of falling into a native horizontal tab scroller. Assets, Console, Animation, Profiler, Tilemap, Project Settings, and Build Settings own their scrolling; Animation timestamps and frame controls remain bounded and readable.
- Project format 13 persists Build Settings. Format 12 and every previously supported project format migrate automatically.

### Editor shortcuts

| Shortcut | Action |
| --- | --- |
| `Q` / `W` / `E` / `R` | Select / Move / Rotate / Scale |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` | Undo / Redo |
| `Ctrl/Cmd+C`, `Ctrl/Cmd+V`, `Ctrl/Cmd+D` | Copy / Paste / Duplicate selected subtree |
| `Delete`, `F2` | Delete selection / Rename primary selection |
| `Ctrl/Cmd+S` | Save project |

## Engine workspace

```text
Vue editor
  └─ nova_wasm        WebAssembly boundary only
       ├─ nova_runtime  fixed time, events, diagnostics, runtime skeleton
       │    └─ nova_physics  bodies, collision, solver, ropes, retained world
       │         └─ nova_math  vectors, transforms, AABB, rays, rectangles
       ├─ nova_script   sandboxed Rhai gameplay execution
       └─ nova_format   versioned schemas, validation, and migrations
```

Physics, math, runtime, script, and format crates contain no Vue, DOM, JavaScript, or Tauri imports. Internal crates are statically linked, so the desktop release remains one application and does not require Nova_A DLL plug-ins.

## Supported build targets

- Browser preview: current Chromium, Firefox, and Safari releases with WebAssembly support.
- Desktop: Windows, macOS, and Linux systems supported by Tauri 2 and their native webview.
- Build native release bundles on the target operating system whenever possible. Windows produces NSIS/MSI, macOS produces app/DMG bundles, and Linux produces the formats supported by the installed Tauri toolchain.

Nova_A remains a desktop/Web-first editor. Android is an optional Experimental, toolchain-gated target; iOS application output remains deferred to a matching macOS host.

## Common prerequisites

- Node.js 18 or newer (`.node-version` records the tested Node release).
- pnpm 9 or newer (`package.json` pins the project package-manager release).
- Rust 1.88 or newer with Cargo (the standalone core crates retain a 1.77 MSRV; the security-patched desktop dependency graph requires 1.88).
- The `wasm32-unknown-unknown` Rust target.
- `wasm-pack` 0.14.0 or newer.
- Git and the native prerequisites for your operating system.

Install the common toolchain components:

```sh
corepack enable
corepack prepare pnpm@10.30.0 --activate
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.14.0 --locked
pnpm install --frozen-lockfile
```

If `wasm-pack` 0.14.0 or newer is already installed, omit its installation command. Rust documents the WebAssembly target and installation command in the [`wasm32-unknown-unknown` target guide](https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-unknown-unknown.html).

When moving an existing checkout to another drive, do not reuse generated dependency links or native build metadata. Remove only `node_modules`, `target`, and `src-tauri/target` from the moved copy, then run `pnpm install --frozen-lockfile` and rebuild. Source files, projects, `pnpm-lock.yaml`, and Cargo lockfiles must remain. This prevents copied pnpm links and Tauri permission metadata from retaining the former absolute checkout path.

### Operating-system prerequisites

Follow the current [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your host system.

- Windows: install Microsoft C++ Build Tools with Desktop development with C++. Tauri uses WebView2; it is already present on current Windows 10 and Windows 11 installations. MSI generation may require the Windows VBSCRIPT optional feature.
- macOS 10.15 or newer: install Xcode, or Xcode Command Line Tools for desktop-only development, then launch/initialize the selected toolchain.
- Debian/Ubuntu Linux:

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

For Arch, Fedora, openSUSE, Alpine, NixOS, and other distributions, use the package list on the official Tauri prerequisites page instead of substituting Debian package names.

## Build and run

All commands run from the repository root.

### Browser development

```sh
pnpm dev
```

This rebuilds development WASM before Vite starts, preventing a stale Rust module from being served. Vite normally listens on `http://localhost:1420`.

### Native desktop development

```sh
pnpm tauri dev
```

### Development validation

```sh
pnpm test:core
cargo clippy --workspace --all-targets -- -D warnings
pnpm check
pnpm audit:manual
pnpm build
```

These commands provide development feedback by running all workspace tests (including the complete physics suite), warnings-as-errors linting, Vue/TypeScript checking, the manual audit, a release Rust-to-WASM build, and the optimized Vite build. They do not create the native, browser-layout, interaction, performance, security, or release-evidence reports required for packaging.

`pnpm audit` is the generic audit for the current public release, 26.10. It validates the current static/manual gates and consumes the complete 26.10 reports generated by the release-preparation workflow below; it is not a substitute for generating those reports.

### Browser production preview

```sh
pnpm build
pnpm preview
```

### Native release bundle

```sh
pnpm tauri build
```

The Tauri build invokes `pnpm build` automatically before packaging. Result locations vary by operating system under `src-tauri/target/release/bundle/`.

### Complete 26.10 release from a clean checkout

Run the final release workflow on a qualified Windows host with Microsoft Edge and the prerequisites above. From a clean checkout, install the pinned dependencies, generate every required local report and the structured evidence tree, then package and independently verify the result:

```powershell
pnpm install --frozen-lockfile
pnpm prepare:v26.10
pnpm release:v26.10
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release-package.ps1 -Version 26.10 -MachineVersion 26.10.0
```

`prepare:v26.10` selects the 26.10 authority when needed, regenerates the manuals and references, runs Rust tests and clippy, TypeScript and static audits, template/readiness/history checks, the optimized Web and Tauri builds, exhaustive browser interaction and layout qualification, Windows editor/game/headless smoke, benchmarks, stability, dependency security and repository hygiene, then runs the 26.10 product audit and creates `release-audits/evidence-v26.10/evidence-manifest.json`. It stops at the first failed command. The generated `release-audits/` tree is intentionally ignored by Git and must be recreated for a clean checkout; never copy it from another source tree.

After reviewing that manifest and its explicitly pending external gates, `release:v26.10` packages public release **26.10** (machine version **26.10.0**) into `releases/v26.10/` with the eleven mandatory top-level artifacts: portable executable, MSI, NSIS setup executable, web ZIP, source ZIP, reference-project ZIP, release-evidence ZIP, release notes, exhaustive edit ledger, license, and `SHA256SUMS.txt`. Packaging first verifies a private staging sibling, then swaps it into place so a failed attempt does not delete the previous complete release. The final command independently extracts and validates that package. Publisher signing, matching-host Linux/macOS builds, real-device work, independent clean-machine/usability review, second-machine reproduction and a real-duration soak remain external until their own evidence exists.

### Headless export

```sh
pnpm export -- --project ./project.nova --target web --profile release --output ./Builds/MyGame
```

The CLI accepts `windows`, `linux`, `macos`, or `web`; desktop output requires the matching host player. It writes `nova-build-report.json`, `nova-content-manifest.json`, provenance, SBOM, dependency/size/deployment reports, and—when enabled—`nova-patch-manifest.json`. Use `--compression store|balanced|maximum`, `--architecture x86_64|aarch64`, `--runtime game|headless-server`, `--no-incremental`, or `--no-patch`. Run `pnpm export -- --help` for the bounded argument contract.

### Export a game with Nova Player

1. Open **Project → Build Settings**.
2. Set the game name and select the target that matches the current desktop host, or select **Web**.
3. Order the included scenes and choose the startup scene.
4. Leave the output field blank for `Documents/Nova_A Builds/<GameName>`, or enter an explicit directory.
5. Choose **Build** or **Build & Run**. Build & Run is available for desktop targets.

The default desktop development export is intentionally two files:

```text
MyGame/
├─ MyGame.exe       # MyGame on Linux; MyGame.app on macOS
└─ game.nova-pak
```

On Windows and Linux, **Package game data into executable** creates a single player executable. macOS keeps the package inside the application bundle so app structure and signing are not corrupted. Desktop targets are host-native: create a Windows export on Windows, Linux export on Linux, and macOS export on macOS. Web export produces a deployable folder containing `index.html`, Nova Player modules/styles, and `game.nova-pak`; serve that folder over HTTP rather than opening `index.html` through `file://`.

## Physics property binding

Configuration changes cross Vue → `nova_wasm` as explicit retained-world commands. Fixed physics ticks remain inside Rust; reusable Float64 state buffers return runtime transforms and rope state to the renderer without unit conversion or per-body JavaScript object results. One configured world unit equals one meter; camera scale only converts world coordinates to pixels.

## Project compatibility

- New saves use **Nova_A Project Format 2**, schema 29, and engine version `6.9.0`.
- Persisted scenes, entities, components, and connections use UUIDs; runtime handles are never written to disk.
- Format migration and validation are centralized in `nova_format`, not scattered through editor components.
- v1.9 format-13 files, v1.8 format-12 files, v1.7 format-11 files, v1.6 format-10 files, v1.5 format-9 files, v1.4 format-8 files, v1.3 format-7 files, v1.2 format-6 files, v1.1.2 format-5 files, older object roots, and legacy top-level entity arrays continue to load. A migrated project is only written in Format 2 when the user saves it.

| Property | Solver/render behavior |
| --- | --- |
| Position, rotation, size | Used directly for world transforms, collision geometry, anchors, and rendering. |
| Linear/angular velocity | Integrated every substep and returned to the renderer. |
| Acceleration | Added directly to dynamic-body linear acceleration. |
| Density and mass | Density × exact shape area determines mass; editing mass updates density. |
| Automatic/manual inertia | Exact ellipse or convex-polygon inertia by default; manual inertia is respected when automatic calculation is disabled. |
| Global/local gravity and gravity scale | Combined and scaled for every dynamic-body substep. |
| Force and torque | Follow `F = ma` and `τ = Iα`; off-center impulses also create angular impulse. |
| Linear/angular/air damping | Applied as exponential decay at each stability substep. |
| Static/kinematic body type | Static bodies remain fixed; kinematic bodies integrate configured velocity without dynamic forces. |
| Restitution and threshold | Restitution applies only when closing speed exceeds the configured threshold. |
| Static/dynamic friction | Sequential impulses use static friction before clamped dynamic friction. |
| Sensor | Body-body contacts report overlap diagnostics without applying collision impulses; physical strings pass through sensor-only bodies. |
| Render sorting layer/order | Controls draw order only and never changes collision behavior. |
| Physics layer/mask/matrix | A contact is solved only when both collider masks and the project collision matrix allow the layer pair. A zero mask intentionally disables every contact. |
| Collider offset/rotation/shape | Collision geometry is independent from renderer geometry and uses its own local transform, material, sensor state, and shape. |
| Continuous collision, sleeping, freeze rotation | Continuous bodies request adaptive anti-tunneling substeps; eligible resting bodies sleep and wake on forces, impulses, contacts, connected motion, or transform edits; frozen bodies reject torque and angular impulse. |
| TileMap rendering/collision | Visible changed chunks submit atlas-backed sprites; merged static box, convex polygon, and one-way geometry uses the TileMap physics layer and mask. |
| Physics queries | Ray, overlap, and shape-cast queries use world units, precise collider geometry, physics-layer masks, sorted hits, and entity UUID results. |
| Joint components | Fixed, distance, revolute, prismatic, and spring constraints apply at configured anchors; connected-body collision and slider limits are explicit. |
| ParticleEmitter2D | Rate, burst, lifetime, velocity, gravity, rotation, scale, color, opacity, blend, and coordinate space feed the batched renderer during Play mode. |
| String route and anchors | Straight and normalized manual routes repatch after edit-mode transforms; center/surface/vertex/side anchors follow current geometry. Legacy automatic-curve records remain readable. |
| String stretch/bend/stiffness/damping | Applied by endpoint constraints or every physical-rope segment. Per-link constants are scaled so changing node count does not change the configured whole-string stiffness or damping. |
| String radius/density/collision | Radius controls continuous segment collision and rendered diameter. Linear density controls exact total rope mass. Source bodies are excluded; same-layer third bodies receive equal-and-opposite impulse and friction. |
| String failure tolerances | Configured equivalent masses are compared with calculated stretch/bend force using standard gravity. The selected link breaks and both remaining fragments continue simulating. |
| Bind / FixedJoint2D | Produces one compound motion state with combined mass and parallel-axis inertia. Internal overlap borders and contacts are removed; external impulses move the assembly as one body. |
| Color, texture, opacity | Renderer-only properties; they do not alter mass or collision geometry. |

## Numerical domain

Nova_A uses 64-bit floating-point values across the full frontend/WASM/backend path. Non-finite input is normalized. General physics magnitudes are bounded to ±`1e50`; positive geometry, mass, and density values have a minimum of `1e-6`.

Polygon collision geometry must be convex. The solver uses at least 8 adaptive substeps, up to 128 for fast motion, and 20 sequential impulse iterations per substep. These safeguards reduce tunneling and instability, but Nova_A remains a discrete real-time solver rather than symbolic or infinite-precision physics.

## Nova_A 4.5 production physics

Version 4.5 adds project-scoped Accurate/Balanced/Fast/Custom solver profiles, explicit dropped-time and sleep tuning, structured ray/point/overlap/sweep/nearest/contact APIs, World Boundary authoring, resolved sleep/wake and joint-break events, adjustable Rope2D segmentation, and a redesigned virtual Physics Monitor with sorting, pins, sparklines, constraint telemetry, capture export, and snapshot comparison. Project Health and Profiler now share physics budget/instability diagnostics, and viewport debug adds centre-of-mass, velocity, and force overlays.

Start with [the v4.5 physics contract](docs/PHYSICS_2D_4_5.md), [character controllers](docs/CHARACTER_CONTROLLERS_4_5.md), and [diagnostics](docs/PHYSICS_DIAGNOSTICS_4_5.md). Numerical tolerances, accelerated soak results, stress captures, platform comparisons, and honest external gates ship in the release-evidence archive.

## Nova_A 6.7 device input, Android delivery, and accessibility

Version 6.7 unifies touch/multi-touch gestures, safe-area-aware virtual controls, gamepad capture/calibration, haptics, orientation and explicit sensor permission under the existing saved Input Map. The Game view uses accessible virtual Button/Stick/D-pad controls; Settings adds rotated device previews and live device testing. Presentation exports semantic role/name/state/value/live/focus evidence and supports runtime text/caption scaling through 400%.

Android is now a discoverable optional Experimental target. Build Settings reports each JDK/SDK 35/build-tools/NDK/adb/template gate, validates least permissions and user-facing purposes, generates the manifest/resources, runs the validated local Gradle wrapper offline, and returns a real APK only after success. Install and logcat are explicit actions; signing secrets are never serialized. iOS remains matching-host/deferred. See [the v6.7 device/mobile/accessibility guide](docs/DEVICE_MOBILE_ACCESSIBILITY_6_7.md) and the [no-code touch reference](reference-projects/projects/creator-v670-touch-platformer/README.md).
