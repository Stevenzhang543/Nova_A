# Phase II engine capability audit — 26.34

Baseline da2182569b7dddb227e7623ce38bf92485d88807 was clean. The Phase II attachment was reread, including definition of done and new-user validation. Investigation preceded edits: current Rust all-target tests and real WASM/frontend build passed. Three parallel audits traced core/physics/save, rendering/media and input/workflow/profile families.

## Repository ownership and architecture

- src/world: TypeScript entity/component/scene model and world-to-WASM bridge.
- src/runtime: game systems, scripting host, lifecycle, assets/resources, save and export services.
- src/renderer: Canvas2D/WebGL2 backends and camera/material/light/render graph infrastructure.
- src/assets and src/projects: asset database/import pipeline and project/schema/archive lifecycle.
- src/store/physics.ts: editor authoring/history/play orchestration; a major shared integration boundary to inspect carefully.
- src/components, src/layout, src/panels, src/ui: Vue editor and centralized presentation system. PlayerApp is a separate exported-game entry.
- crates/nova_math, nova_physics, nova_runtime, nova_script, nova_format: Rust math/solver/runtime/Rhai/schema implementations. nova_wasm exposes the browser bridge; nova_headless is physics-oriented, not assumed to be a full game runtime. nova_core is a compatibility crate.
- src-tauri: native filesystem/window/project/build operations.
- scripts/tests/reference-projects: automated checks, fixtures, reference games and build/release tooling.
- godot-master is third-party reference source; node_modules, target, dist and nova_core/pkg are dependencies/generated outputs; releases contains immutable historical packages. They are not parallel maintained engine implementations.

The reproducible SOURCE_INVENTORY.json indexes 435 owned source files / 95,590 lines and 653 verification/audit entrypoints. Import/symbol indexing is not a claim that all branches have been reviewed or executed.

## Audit findings and consequences

1. Nested save map keys were sanitized into collisions, losing Unicode/space keys. Preserve exact nested own-data properties, including prototype-looking names; keep public root key/slot normalization and v2 compatibility.
2. Async load applied data before final cancellation and commit serialized state twice. Stage validation/migration, apply only after cancellation and project/session guards, and share one custom snapshot. Cancelling or switching projects cannot publish stale data.15 new and10 retained tests execute actual save modules. Arbitrary custom callback side effects cannot be rolled back.
3. Particle editor preview set authored autoplay=false. Completion now lives in runtime state, preserving serialization; loop/one-shot/reset/disabled preview checks cover consequences.
4. Camera dead zones ignored zoom/subviewport and rotated axes. Shared half-extents use actual render scale/viewport; fullscreen zoom1 semantics stay compatible. Numerical tests include zoom, rotation, fullscreen and subviewport.
5. Wheel events from native/editor UI reached gameplay and consumption was ambiguous. Mark each game input canvas, reject already consumed or unrelated HTML/SVG DOM sources, forward unhandled bare-canvas events once, and keep keyboard/programmatic host behavior. Seven module checks and actual authored browser scroll scenario cover both paths.
6. Empty/invalid profiler captures and unavailable GPU timers could pass as zero-cost measurements. Keep capturev2 and legacy fields, add measured/unavailable/estimated statuses, reject invalid samples, and exclude heuristic overhead from measured certification. Eight focused cases and localized panel labels cover consumers.
7. Advanced font switches have no rendering consumer. Retain data for compatibility, add EN/DE/ZH availability copy beside existing controls, and classify those modes DEFERRED. Browser scalable fonts remain supported.

## Integration coverage

The final FEATURE_MATRIX.md gives every A–Z/AA category owners, priority, supported scope and residual limits. CAPABILITY_CATALOG.md lists all declared editor operations/component primitives/Rhai APIs/graph definitions. Required representative scenarios execute template generation→migration→load→save/reopen with compiled WASM and actual runtime systems; real browser tests separately create projects, import, author reusable nested objects, edit/undo/redo, play/input/stop, save/reopen and run an independently downloaded game. No private engine edits make demos work.

## Architectural boundaries

Signed TRS is retained: exact shear needs an affine representation and compatibility design. Navigation is bounded grid/flow-field; arbitrary navmesh is advanced. Lighting normal response and particle collisions are approximations. Native JSONL is bounded physics-only; renderer-disabled WebView authority remains distinct. No fresh claim of physical device/accessibility/audio certification, all hardware performance, all possible inputs or zero bugs. Unchanged architecture is not rewritten merely because another engine differs. The final audit matrix classifies these boundaries rather than presenting metadata/types as implementation.

The representative top-down audit also reproduced a native interpolation feedback defect: syncing velocity/shape changes resent the displayed previous pose and rewound solver movement. World now retains native position/rotation separately, preserving unchanged physics pose while honoring explicit transform writes, teleport, character movement, origin shift and reset/destroy. Real WASM tests cover Interpolate/None and irregular timing.
