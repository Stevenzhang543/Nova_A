# Nova_A 6.5 production physics and renderer guide

Nova_A 6.5 keeps Project Format 2/schema 29 and every public 6.x API frozen. The release changes solver preparation and diagnostics, not authored project compatibility. Existing scenes load unchanged; exact child data is built at runtime and is not required in older project files.

## Exact compound bodies

Use **Inspector → Physics → Collider children** to add as many authored parts as the object needs. The editor accepts up to 32 authored children and the solver accepts up to 128 pieces after safe decomposition. Each child has a stable identity plus shape, local offset, size, rotation, sensor flag, physics layer and collision mask. The primary collider is child 0.

Rectangles, circles and convex polygons are exact. A static or kinematic Chain is converted to stable edge children. A simple static or kinematic Concave polygon is triangulated deterministically. A self-intersecting, degenerate or oversized path is rejected. Dynamic Chain and Concave shapes remain blocked because silently approximating them would change mass and contact behavior; divide the moving object into convex children instead.

Compound mass uses the area of every solid child. Compound inertia uses each child's local inertia plus the parallel-axis term for its offset from the body center. Sensors participate in overlap events but never add mass or collision impulse. A child contact event reports both body IDs and both child collider IDs.

### Cross and hexagram workflow

1. Draw two overlapping objects on the same physics layer.
2. Use Connection → Bind. The visible result uses the combined silhouette while the solver keeps both exact children.
3. Drag, rotate, resize and run the scene. Both pieces move as one body and contact another body at the correct child surface.
4. Open Connection again and choose Separate. The original objects, transforms and colliders return.

## CCD, contacts and sleeping

Continuous bodies use the smallest child extent and the farthest rotated compound radius. This prevents a fast or rapidly rotating outer child from tunneling when the body origin itself moves only a little.

Contacts have stable manifold feature IDs. The previous normal/tangent impulse is warm-started on the matching feature, then updated by the fixed-step solver. Touching awake bodies form deterministic sleep islands: an island sleeps only after all of its dynamic members satisfy the thresholds for the configured delay, and any wake-up propagates through the contact/constraint graph.

## Joints and Rope2D

Prismatic motors apply linear force along the configured joint axis. Revolute motors apply angular torque. Minimum/maximum limits are enforced in velocity and position phases. Motor and limit reactions count toward break force and break torque.

Rope2D keeps the two owner bodies excluded from rope collision. Rope particles collide with eligible third-party collider children using their individual layer, mask and sensor policies. Impulses travel through rope constraints into the two anchors and therefore into their owning bodies. Stretch and bend limits can split the rope; surviving segments continue to collide and transfer force.

## Authoritative debugging

Enable physics debugging to see the exact solver children, not a convex envelope. Child borders, compound union AABB, contacts, normals, CCD paths, anchors and rope segments use the same world-to-screen transform as the rendered object. One grid unit equals one Inspector position/size unit and one physics meter.

## Renderer diagnostics and quality volumes

Rendering diagnostics report frame CPU/GPU time, draw calls, per-pass draw/time, lights and shadow casters, particle CPU/GPU counts, resident textures, uploads, shader compiles/fallbacks and context-loss recoveries. Recommendations identify budget pressure and link it to the relevant quality control.

A quality volume is an axis-aligned camera region with a priority, a base quality preset and optional pixel-ratio, shadow, particle, post-process and texture-budget overrides. If several volumes contain the active camera, the highest priority wins; equal priorities retain stable authoring order. Outside all volumes the project-wide rendering settings apply. Volumes never delete effects or authored data—only their active runtime budgets change.

## Recovery and limits

- Fix a blocked dynamic concave collider by making the body Static/Kinematic or replacing it with convex children.
- Fix a malformed polygon by removing duplicate, crossing or collinear-only points.
- Fix missing collisions by confirming both child layer/mask pairs accept each other and that neither child is a sensor.
- Fix unexpected rope contact by checking the third body's child layer/mask; owners are always excluded.
- A shader fallback or context-loss counter above zero is actionable but recoverable. Inspect the named pass/material, reduce only the local effect if needed, and verify the fallback image before shipping.

## Release audit

Local qualification covers Rust/TypeScript/WASM/Web/native builds, analytical solver cases, child identity, Chain/Concave safety, CCD, warm stacks, sleep islands, motors/limits/breaks, rope policies, deterministic fixed-step runs, non-finite/fuzz rejection, diagnostics, quality-volume priority, template gameplay, localized layout, reference projects and Windows player smoke. Publisher signing, independent clean-machine lifecycle, second-machine reproducibility, matching-host non-Windows builds, independent hardware/accessibility review and a real 72-hour soak remain external gates.
