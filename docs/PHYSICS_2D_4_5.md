# Nova_A 4.5 production 2D physics

Nova_A runs a retained Rust `f64` physics world at a project-defined fixed rate. The fixed world is authoritative; render interpolation only smooths completed states. The default unit mapping is one world unit = one metre, one second = one simulation second, angles in radians, force in newtons, torque in N·m, impulse in N·s, and energy in joules.

## Body roles and ownership

| Role | Authored transform while running | Force response | Intended use |
| --- | --- | --- | --- |
| Static | yes, followed by synchronization | no | level and world-boundary geometry |
| Dynamic rigid | only through physics/teleport | yes | simulated objects |
| Animatable / kinematic | animation or script | no | moving platforms and authored motion |
| Character | `Physics2D.moveAndSlide` | controlled character response | platformer/top-down actors |
| Area / trigger | authored by its body role | no contact impulse | sensors and effect volumes |

Dynamic bodies own their transform during Play. Use force/impulse for continuous changes and `Physics2D.teleport` for discontinuities. Teleports and nonzero applied force wake sleeping bodies. Character input is sampled outside the physics helper; the resulting desired velocity is submitted once per fixed step.

## Shapes and properties

Rectangle, circle/ellipse, capsule, segment, convex polygon, chain, world-boundary, and compound authoring are stable. Chain and concave geometry are query/static authoring paths where the Inspector labels solver limitations; Nova_A does not silently substitute a dynamic shape. World Boundary is static by construction. Compound children share the parent body's mass state and transform ownership.

Stable properties are density (`kg/m²`), explicit mass (`kg`), inertia (`kg·m²`), local collider offset/rotation, friction, restitution, restitution threshold, gravity scale, linear/angular damping, sleep state, fixed rotation, and continuous collision. Non-finite values normalize at the project boundary; positive-only values have documented lower bounds.

## Profiles and time policy

- **Accurate:** 120 Hz, 12 minimum substeps, 32 velocity iterations, 24 position iterations, backlog preservation.
- **Balanced:** 60 Hz, 8 minimum substeps, 20 velocity iterations, 16 position iterations, bounded time dropping.
- **Fast:** 60 Hz, 4 minimum substeps, 12 velocity iterations, 8 position iterations, slow-motion recovery.
- **Custom:** stores all settings without replacing them with a preset.

Profiles are project scoped and serialized into project physics settings. Maximum catch-up prevents a stalled UI frame from requesting unbounded physics work. `Drop` records lost seconds, `PreserveBacklog` keeps the accumulator for later frames, and `SlowMotion` bounds the retained accumulator to one fixed step. CCD can raise substeps above the profile minimum for a fast body.

The sleep thresholds and time-to-sleep are profile settings. The physics budget is diagnostic, not a simulation shortcut. The same project/profile/input/build/platform has stable fixed-step and callback ordering. Cross-platform bitwise floating-point identity is not promised; use replay checksums to detect drift and authoritative networking for distributed truth.

## Queries

`Physics2D` offers legacy convenience methods and structured `rayQuery`, `pointQuery`, `overlapQuery`, `sweep`, `nearest`, and `contactQuery`. Structured options contain `layerMask`, `includeSensors`, `excludeEntityUuids`, `maximumResults`, and `sort`. Results include entity UUID, hit point, normal, distance, body type, collider type, sensor flag, and physics layer. Masks always address physics layers, never render layers.

Collision events are ordered by stable body pair and lifecycle phase: enter/start, stay, exit/end. Triggers use the same ordering. Body sleep/wake and joint/Rope break notifications contain their stable object or connection identity after the runtime handle is resolved.

## Joints and Rope2D

Distance, revolute, prismatic, weld, spring, motor, and Rope constraints share local anchors, connected-collision policy, damping, motor/limit fields where meaningful, break force/torque, and live tension/strain. Rope2D adds explicit 3–32 segment count, compliance/stretch, bend controls, linear density, node collision radius, endpoint ownership, collision enablement, and a break-link result. Rope nodes do not collide with their endpoint owners; enabled Rope collision still interacts with other compatible-layer bodies.

Higher Rope segment count improves bend resolution and increases constraints/contacts. Use Physics Monitor to watch tension, strain, break state, contact count, dropped time, and frame budget.

## Diagnostics and authoring

Physics Monitor uses a virtual list and detail pane, not one card per object. It supports sortable body metrics, pins, 60-sample speed sparklines, collision force/impulse details, joint/Rope telemetry, captures, JSON export, and snapshot comparison. Debug overlays cover colliders, contacts, normals, AABBs, sleep, centres of mass, velocity/force vectors, character classifications, joints, and Rope nodes. Project Health displays dropped-time, contact/body/constraint scale, and physics-budget warnings.

The 32×32 matrix remains under Advanced. Beginner authoring uses named layers, descriptions, colors, presets, searchable names, and compact pair controls.

## Numerical qualification

Versioned tolerances and analytical results ship inside `Nova_A-v4.5.0-release-evidence.zip`. Gravity, exponential damping, restitution, momentum, energy, query ordering, joints, Rope strain, character fixtures, CCD/thin geometry, large/tiny coordinates, compound colliders, and stress results are machine-readable. A fast accelerated soak is included; the real wall-clock 24-hour gate is reported honestly as external unless the release environment actually completes it.

