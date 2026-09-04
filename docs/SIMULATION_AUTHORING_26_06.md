# Nova_A 26.06 simulation authoring contract

This document is the authoritative contract for the 26.06 physics, navigation, and AI authoring surface. It separates locally verified behavior from qualification that still requires the packaged desktop application or long-running hardware.

## Units and ownership

- The exact scale contract is **1 grid unit = 1 m**: one grid unit and one Inspector distance unit equal one metre in the solver. Time is seconds, mass is kilograms, force is newtons, impulse is newton-seconds, and torque is newton-metres.
- The Inspector presents angles in degrees. The world model and Rust solver store radians; the editor converts once at the Inspector boundary.
- A dynamic rigid body owns its simulated position, rotation, linear velocity, and angular velocity while Play is running. Discontinuous motion must use the teleport API. Kinematic bodies accept authored velocity.
- Physics layers and masks are 32-bit values. A connection transmits force only when both owners are on the same physics layer. A disabled collider, obstacle, region, agent, behavior tree, or state machine is absent from its runtime system.

## Physics authoring

- Box, circle/ellipse, three- or four-point convex polygon, compound convex children, and retained child contact identity are exact solver shapes. Capsules and finite segments use their documented bounded convex representation.
- Static or kinematic `Chain` geometry becomes finite edge children. Static concave polygons are validated as simple polygons and deterministically ear-clipped. A repeated, crossing, non-finite, or degenerate polygon is blocked rather than silently converted to a hull. Dynamic chain or concave ownership is blocked; use convex compound children.
- Translational and rotational continuous collision detection use the farthest compound child surface to choose bounded adaptive substeps.
- Contact islands sleep together. Sensors report contacts but do not contribute mass or collision impulses.
- Fixed/weld, distance, rope, revolute/motor, prismatic, and spring joints use local anchors. Motors and limits are solved in the joint axis or angle. Break force observes peak linear reaction during a fixed step; break torque observes peak motor/angular reaction. A rope joint is a maximum-distance constraint and remains slack below that distance.
- `Rope2D` simulates sampled nodes, excludes both owner colliders, collides with eligible third-party bodies, transfers impulses to its anchors, and keeps both fragments simulated after a break. A cycle of Rope2D connections is the supported cloth-like constrained path. World Studio creates these cycles with a valid 1.18 maximum stretch ratio.

## Navigation authoring

- A region may use a bounded grid or polygon visibility graph. Grid queries support A*, hierarchical A*, and weighted flow fields. Diagonal travel has geometric cost and cannot cut blocked corners.
- Region traversal cost, per-area terrain multipliers, tile navigation cost, links, clearance, layer, and mask participate in path selection. Start and goal must be inside the selected compatible region.
- Dynamic grid cache age uses simulation time during Play, so replay results do not depend on wall-clock frame rate. Manual baking is cooperative and can be cancelled inside a large region; a cancelled partial grid is never published.
- Agents use acceleration-limited steering, stopping distance, deterministic target selection, path smoothing, periodic repath, and priority-aware local avoidance. Candidate neighbors are distance-then-UUID ordered and capped at 32. Exact overlaps choose a UUID-stable separation direction.
- Navigation and AI accept at most 10,000 active agents. Repaths are round-robin capped at 256 per fixed tick; AI ticks are round-robin capped at 2,048. Excess agents are reported, not processed unpredictably.

## AI authoring

- Behavior-tree v1/v2 documents support sequence, selector, utility selector, conditions, typed blackboard conditions/writes, spatial perception, actions, and waits.
- Document normalization requires unique node IDs, an existing root, existing child references, bounded depth, and an acyclic reachable graph. Perception and blackboard collections are bounded.
- Hierarchical state-machine v1/v2 documents require unique states, an existing initial state, valid parents and transition targets, and acyclic ancestry. Initial entry runs root-to-leaf `onEnter`; updates run root-to-leaf; a transition exits leaf-to-common-ancestor and enters common-ancestor-to-leaf.
- Parsed documents and node/state indices are cached by exact asset source. Tick accumulation uses fixed-step elapsed time rather than a presumed 60 Hz render frame.
- The simulation debug panel exposes physics, navigation, AI, authoring-readiness, and deterministic replay checksums. Evidence capture is O(1) while disabled and intentionally records at most 600 full-state frames when enabled.

## Direct local evidence

Run `cargo test -p nova_physics` and the TypeScript check before packaging. The Rust suite directly covers force/acceleration/torque laws, SI distance scale, 30/60/120 Hz gravity velocity, damping, elastic scale invariance, layer/mask isolation, malformed-number containment, compound identity/inertia, rotational CCD, stable sleep islands, joint anchors/motors/limits/break torque, rope slack, rope owner exclusion, third-body rope collision, anchor impulse transfer, deformation, density, and broken fragments.

The following implementation paths are the auditable evidence for editor/runtime binding:

- `src/runtime/physicsGeometry.ts` validates and decomposes collider authoring into exact retained solver children.
- `src/world/World.ts` writes bodies, collider children, joint kinds, anchors, limits, motors, break thresholds, and Rope2D nodes into the retained WASM world.
- `src/runtime/navigation2d.ts` owns terrain/path/steering/avoidance, deterministic budgets, cooperative cancellation, profiling, and visual debug paths.
- `src/runtime/aiTools.ts` owns bounded behavior trees, blackboards, perception, utility AI, HSM lifecycle, scheduling, and graph traces.
- `src/runtime/simulationAuthoring26.ts` produces blocking/review diagnostics and state checksums that include body, constraint, rope, navigation, blackboard, behavior-node, and HSM state.
- `src/components/WorldToolsPanel.vue` is the authoring and live-debug surface.

## External qualification gates

The following are not truthfully certified by unit tests alone and remain release gates: a packaged desktop run of the 26.06 reference project; visual ruler-versus-Inspector measurement; playable physics-puzzle and navigating-enemy checks; rope/cloth visual quality; cancellation interaction; 10,000-agent frame-time capture on minimum hardware; replay checksum comparison across two clean launches; multi-hour soak; and Windows installer/export validation. Store those results in release evidence and do not convert an unrun gate into a passing claim.
