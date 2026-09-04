# Nova_A 26.01–26.10 coding manual

This is the authoritative implementation plan for the 2026 calendar-version cycle. Every release preserves existing features, animation, user data, deterministic fixed-step behavior, and the eleven-file release contract. Each item below names implementation, programmer audit, and normal-user check requirements.

## Rules for every release

- Creator-facing versions use 26.01–26.10; machine metadata uses 26.1.0–26.10.0. Project Format 2/schema 29 and the seven frozen contracts stay compatible until evidence demonstrates a breaking need.
- No control may be decorative. Every edit must map through validation, undo/redo, persistence/reopen, runtime or editor effect, export inclusion where relevant, localization, documentation, and automated evidence.
- No panel may overlap, disappear, clip meaningful text, force a whole-window horizontal scrollbar, or hide its primary action at 1024×640 through 4K, 100–200% UI scale, EN/DE/ZH, light/dark/high contrast, reduced motion, keyboard-only navigation, or long/pseudolocalized text.
- Performance work may cache, virtualize, coalesce, batch, lazy-load, or use bounded workers. It may not delete animation, feedback, visuals, simulation accuracy, or authoring capability.
- Each release runs TypeScript, Rust, WASM, Web, Tauri, templates/references, historical migration, script/graph parity, interactions, layout, accessibility, performance, stability, dependency/security, deterministic export, native smoke, evidence, exact artifact, checksum, and independent package verification gates. External evidence is never reported as local.

## 26.01 — calendar foundation, truthful inventory, templates, visual parity, and panel containment

Implementation:

- Introduce calendar release 26.01 with semantic machine version 26.1.0; centralize labels; widen only reviewed engine compatibility metadata to less than 27.0.0; retain schema 29 and all frozen APIs.
- Publish a code-derived inventory of every public operation and a comparison-led gap register. Add a seven-dimension binding matrix for all operations.
- Expand the launcher to a searchable, filterable, keyboard-accessible template library with category counts, feature tags, difficulty, estimated setup time, and detail preview. Grow the verified catalog from 12 to approximately 20 useful scenes, rendering/test labs, and playable games.
- Make selected Rhai assets follow the user into Visual mode. Create or resolve the exact linked graph, never a stale default. Convert lifecycle functions, API calls, literal inputs, exported/global variables, assignments, conditionals, bounded loops, functions, and supported expressions to editable blocks. Preserve unsupported syntax losslessly in bounded Rhai blocks. Saving either view validates and atomically updates the other; conflict, parse, and rollback diagnostics name both assets.
- Refresh every panel under one containment contract: semantic type roles, readable field floors, wrapping labels/buttons, fluid control columns, independent scrolling, responsive docks, visible primary actions, and stable empty/loading/error states.

Programmer audit: version mapping; historical 2.x–7.x fixtures; schema/API invariance; all public-operation bindings; all templates factory/schema/static-Rhai/WASM/build/accessibility/gameplay checks; graph↔Rhai semantic and byte-stable double round trips for variables/functions/if/else/repeat/API/entity calls; stale selection; dirty source; missing companion; collision and rollback; all Vue panels scanned for overflow/fixed-width/no-wrap hazards; full release gates.

Normal-user checks: open an existing template script, switch to blocks, edit a variable/if/loop/object movement, switch back and see exact valid Rhai; reopen and export it; browse/filter/create every template; use every workspace and panel at three locales/scales without clipped labels; complete one game using only blocks and one by mixing blocks/code.

## 26.02 — object-event workflow and gameplay authoring

Implementation status: completed in the 26.02 release candidate. The implementation guide is `OBJECT_EVENT_AUTHORING_26_02.md`; Visual Graph navigation/performance evidence is defined by `VISUAL_GRAPH_PERFORMANCE_26_02.md`; layout evidence is defined by `UI_LAYOUT_AUDIT_26_02.md`.

Implementation: add an optional Event Sheet per entity/component with Awake, Start, Update, Fixed Update, input, timer, signal, collision, trigger, UI, animation, and network events; attach Rhai/Graph actions without hiding the underlying assets; add an Object Blueprint asset, inheritance/composition validation, event search, and quick Sprite/Shape → Object → Event → Scene creation. Expand object/entity API coverage, dynamic spawn/query/group/tag/component operations, timers, coroutines/tasks, and deterministic random streams.

Programmer audit: lifecycle order, inherited/overridden event dispatch, duplicate callbacks, disabled entities, hot reload, prefab instances, deterministic seeds, 10,000-event scheduling, code/graph/event-sheet equivalence, save/export and migration.

Normal-user checks: build a controllable character, enemy spawner, score/win flow, and reusable object without leaving the guided workflow; then open the generated code/graph and understand every action.

## 26.03 — language, debugger, and visual compiler depth

Implementation status: completed in the 26.03 release candidate. The language, debugger, external-editor, and code↔graph behavior is specified in `LANGUAGE_DEBUGGING_26_03.md`; localized containment evidence is specified in `UI_LAYOUT_AUDIT_26_03.md`.

Implementation: strengthen optional Rhai type annotations and inference, structs/data resources, modules/imports, generics-like documented helpers where safe, async task inspection, expression watches, statement stepping, call stack, conditional/log breakpoints, live values on blocks, structural diff, semantic merge, conversion coverage report, and explicit Execute Rhai escape blocks. Add a real Language Server transport while preserving the lightweight built-in service.

Programmer audit: parser/type corpus, malformed/hostile input, statement map accuracy, breakpoint stability after edits, module cycles, deterministic task cancellation, graph debug mapping, external editor protocol and performance.

Normal-user checks: diagnose and repair logic in text and blocks, rename across a project, step through a collision, inspect object values, and resolve a code/graph conflict without data loss.

## 26.04 — asset pipeline, 2D content, and library ecosystem

Implementation status: completed in the 26.04 release candidate. The bounded dependency/content-library architecture, importer and reusable-resource contracts are specified in `ASSET_CONTENT_LIBRARY_26_04.md`; localized containment evidence is specified in `UI_LAYOUT_AUDIT_26_04.md`.

Implementation: asset dependency graph visualization; importer workers/cache; richer Aseprite/Tiled/TexturePacker/atlas/font/audio/localization pipelines; sprite animation slicing; nine-patch; vector/SDF paths; resource variants; thumbnail generation; content collections; reusable UI/theme/material/physics/input/animation libraries; offline template/package discovery with trust and provenance.

Programmer audit: golden and malformed importer corpora, reimport identity, moved/deleted sources, Unicode paths, 50,000 assets, deterministic hashes, dependency cycles, cache invalidation, package permissions, export stripping.

Normal-user checks: import and reimport a full art/audio/font pack, repair a moved source, apply a shared resource with one local override, and export with no missing assets.

## 26.05 — production rendering, animation, audio, and cinematic workflow

Implementation status: completed in the 26.05 release candidate. The unified rendering, animation, audio and cinematic behavior is specified in `PRODUCTION_MEDIA_26_05.md`; localized responsive evidence is specified in `UI_LAYOUT_AUDIT_26_05.md`.

Implementation: richer 2D materials/shaders, visual shader parity, render passes, texture streaming, lights/shadows/normal maps, particles/trails, post effects, pixel-art and high-DPI paths; animation curves/dope sheet/state/blend/rig tooling; audio buses/effects/spatialization/snapshots; cinematic preview/recording and deterministic frame capture.

Programmer audit: WebGL2/Canvas fallback goldens, device loss, shader limits, batch/cull correctness, animation/audio timing at variable display rates, memory/voice budgets, exported parity, low-end fallback without semantic changes.

Normal-user checks: author a polished animated scene with lighting, particles, audio mix, UI, and a skippable cutscene on Balanced and Low-end profiles.

## 26.06 — physics, navigation, AI, and simulation authoring

Implementation status: completed as a 26.06 release candidate. The authored/runtime contract, unit convention, simulation evidence and normal-user reference are documented in `SIMULATION_AUTHORING_26_06.md`; the complete localized layout gate is documented in `UI_LAYOUT_AUDIT_26_06.md`; output/template reliability is documented in `OUTPUT_BUILD_RELIABILITY_26_06.md`. Local automated completion does not close the explicitly pending hardware, matching-host, signing, soak or independent-usability gates.

Implementation: complete compound/chain/concave-static contacts, rotational CCD, stable stacks, motors/limits/break forces, rope/cloth-like constrained paths, authoritative units/evidence, terrain/navmesh workflows, steering/avoidance, behavior trees/HSM/utility AI, deterministic crowds, and visual simulation debugging.

Programmer audit: analytical force/impulse/energy/unit tests, manifold/fuzz corpus, 30/60/120 Hz determinism, NaN containment, layer/mask isolation, joints/ropes, 10,000 agents, navigation rebake/cancellation, replay checksums.

Normal-user checks: create compound shapes, ropes that collide correctly, a physics puzzle, and navigating enemies; confirm grid distance equals Inspector/runtime measurements.

## 26.07 — multiplayer, services, replay, and multi-instance play

Implementation: embedded 2/4/8-instance play, separate logs/Inspectors, authority and replication diff, prediction/reconciliation/rollback timeline, interest management, scene handoff, reconnect/late join, optional transport/identity/lobby/relay interfaces, encrypted transport guidance, replay protection, rate limits, deterministic replay/save, and server export.

Programmer audit: malformed packets, permission denial, version mismatch, loss/reorder/duplication, rollback convergence, disconnect cleanup, headless soak, package-absent behavior, secrets/provenance review.

Normal-user checks: one-click host/clients, simulate bad networks, inspect ownership/bandwidth, reconnect, and export client/server without affecting offline games.

## 26.08 — platform delivery, accessibility, and input completeness

Implementation: action-based keyboard/mouse/touch/gesture/gamepad/pen/sensor input; remapping/calibration/prompts; responsive safe areas; Android qualification workflow; matching-host Linux/macOS pipelines; Windows native accessibility bridge where possible; Web ARIA parity; localization/RTL/IME/formatting; scalable text and reduced motion; export diagnostics that teach required SDK steps.

Programmer audit: pointer/touch deduplication, physical key layouts, controller hot-plug, semantic snapshots, screen reader/keyboard, 200–400% text, locales/RTL, least permissions, clean matching-host builds where available.

Normal-user checks: no-code touch/gamepad setup, remap while playing, rotate/device previews, keyboard/screen-reader editor use, and honest platform blockers.

## 26.09 — ultimate performance, collaboration, and large projects

Implementation: measured cold/warm startup, lazy workspace loading, data-oriented dirty transforms, bounded reactive updates, worker animation/particles/navigation/import, batched runtime commands, streaming budgets, virtualized 100,000-entity/asset views, input-to-pixel metrics, adaptive presentation-only quality, semantic collaboration/change lists/ownership, and reproducible CI caches.

Programmer audit: before/after equivalence, races/cancellation/stale work, leaks, 10k/50k/100k fixtures, p95/1% lows, worker fallback, 72-hour external soak plan, deterministic exports, semantic merge round trips.

Normal-user checks: edit during imports/bakes, draw/drag/select without delayed pointers, switch all workspaces repeatedly on low-end hardware, resolve a real scene/graph conflict, and retain every animation/control.

## 26.10 — stable lightweight creator platform

Implementation: close the gap register or explicitly defer each item; freeze contracts only after migration/ecosystem evidence; consolidate UI naming/icons/empty states/errors; complete EN/DE/ZH task-based manual for every feature; publish API, SDK, migration, troubleshooting, support matrix, reproducibility, clean-machine, and independent usability evidence; ship representative full games made by code, blocks, and mixed authoring.

Programmer audit: every historical project/template/reference; all bindings and public contracts; TS/Rust/WASM/fuzz/security; code/graph/event parity; renderer/physics/audio/network determinism; plugin lifecycle; native/Web exports; performance/stability/memory; docs/key/link parity; exact reproducible package. Severity 0/1 must be zero.

Normal-user checks: independent beginners complete guided games from the manual and experts complete keyboard-first production workflows across all locales/themes/scales/input modes, low-end hardware, recovery/plugin failure/bad data, and exported builds. Record real observation and external gates honestly.
