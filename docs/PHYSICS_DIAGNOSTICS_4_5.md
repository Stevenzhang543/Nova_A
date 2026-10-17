# Physics diagnostics and capture format

Open Physics Monitor while Play or Pause is active. Body rows are virtualized so large scenes do not create thousands of DOM cards. Search matches name, role, body mode, and layer. Sort by name, speed, measured acceleration, force, kinetic energy, or contact count; the arrow reverses the order.

Pin stores up to 256 body UUIDs for quick visual identification. A body's speed sparkline retains 60 physics samples and its delta is measured against the preceding recorded fixed state. Collision Timeline stores the latest 500 lifecycle events with point, normal, incoming/resulting relative velocity, direction change, impulse, force, and penetration. Stay events replace the preceding stay entry for the same pair so they remain live rather than flooding the timeline.

Constraints lists joints and Rope2D with endpoints, live tension, strain, segment count, collision policies, break state, and broken link. Captures contain a step, runtime diagnostics, body table, constraint table, and collision window. Compare computes per-body speed, energy, and contact deltas. Exported files use `nova-physics-capture` version 1 and declare units.

Profiler overlays and Project Health warnings share the same runtime data. Budget warnings mean the measured physics cost exceeded the selected profile budget; dropped-time warnings identify accumulator policy activity. High body/contact/constraint warnings mark a validated authoring-range boundary rather than claiming a crash.

Debug overlays are independently switchable: colliders, contacts, normals, AABBs, sleeping fill, centers of mass, velocity vectors, force vectors, character floor/wall/ceiling normals, joint anchors, Rope nodes, and per-layer colors.

