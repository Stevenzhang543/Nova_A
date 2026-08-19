# Nova_A 3.4.0 release notes

Nova_A 3.4.0 upgrades the 3.0 physics surface into a documented production 2D workflow for platformers, top-down games, puzzles, and simulations. It retains existing project behavior while adding explicit body roles, materials, queries, stable events, a character workflow, expanded joints, named layers, simulation-quality controls, diagnostics, references, and measured conformance evidence.

## Physics behavior changes since 3.0.0

- Static, kinematic, character, rigid, and area/trigger roles are explicit. Physics-controlled transforms are owned by the fixed-step runtime; scripts use velocity, force, impulse, move-and-slide, or teleport APIs instead of silently overwriting a dynamic transform.
- Box, circle, capsule, and finite-segment shapes participate in native dynamics. Chain and concave polygons are visibly labelled query-only. Bodies may author multiple shape-local entries; native dynamics uses their deterministic compound envelope.
- Physics material assets carry density, friction, restitution, restitution threshold, and Average/Minimum/Multiply/Maximum pair-combine modes into the native solver.
- Ray, shape, point, overlap, and contact queries are available. Collision and trigger Enter/Stay/Exit phases are sorted by stable body pair and phase; disabled entities are excluded and one-way collision settings are enforced.
- Character movement reports floor, wall, and ceiling contacts and supports slope limits, safe margin, floor snap, exact-unit steps, moving-platform velocity, velocity state, move-and-slide, and a debug overlay.
- Distance, revolute, prismatic, weld, spring, rope, and motor joints expose supported limits, motors, break thresholds, gizmos, and diagnostics.
- Continuous collision, interpolation, sleeping, fixed-step/catch-up diagnostics, physics overlays, profiler counters, replay, and scene tests are integrated into Project Settings, Debug, and Profiler.
- Shape-cast normals now point outward from the obstacle. This fixes floor/ceiling/slope classification and makes query normals consistent with movement response.
- First-save Build Settings now includes every available scene, making a save/load/no-op save byte-identical.

## Collision-layer migration

Project Format 2 schema 24 upgrades schemas 5–23. Existing layer numbers, collision masks, and all 32 matrix bit rows are preserved exactly. Stable IDs 0–31 receive names, descriptions, and colors; renaming a layer never changes its bit. Existing projects therefore retain their collision behavior while gaining searchable names, presets, compact pair editing, and an advanced full matrix.

## Editor and layout

- Project Settings now has a focused Physics page for simulation, layers, materials, and conformance.
- The Inspector shows body ownership, named layer/mask controls, material assets, supported collider shapes, compound local shapes, and joint diagnostics.
- Toolbar controls use intrinsic horizontal sizing and wrapping/overflow rules, preventing Chinese labels and tool groups from collapsing into vertical characters or overlapping workspace controls.
- Character contacts, collider support, CCD, sleeping bodies, joint constraints, and layer colors are available in Debug/Profiler surfaces.

## Evidence and references

The release includes seven required physics reference projects plus JSON/SVG evidence for native 100/1,000/10,000-body measurements, deterministic replay, high-speed tunnelling, stable stacking, character conformance, and a 2,592,000-tick accelerated soak. The soak is twelve simulated hours, not a twelve-hour wall-clock claim. See `KNOWN_LIMITATIONS.md` for the exact boundaries.

## Compatibility

- Engine: 3.4.0
- Project Format: Nova_A Project Format 2, schema 24
- Minimum supported project schema: 5
- Plugin API: 2, with API 1 compatibility mode
- Windows release artifacts: portable EXE, MSI, and NSIS installer; also source, Web, references, evidence, checksums, license, notes, and edit ledger.
