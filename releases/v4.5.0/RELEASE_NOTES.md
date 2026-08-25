# Nova_A 4.5.0 release notes

Nova_A 4.5 turns the existing 2D solver into a documented production physics, character, Rope2D, query, and diagnostic workflow. Project Format 2 remains schema 29; no migration is required.

## Physics behavior changes that can alter motion

- Every project now stores a physics profile. Legacy scenes normalize to **Balanced**: 60 Hz, maximum 8 catch-up steps, minimum 8 substeps, 20 velocity iterations, 16 position iterations, interpolation, bounded time dropping, 0.001 m/s and 0.001 rad/s sleep thresholds, and 0.5 s time-to-sleep.
- Solver substep and iteration counts are no longer undocumented constants; selected profile values reach the Rust world. Accurate and Fast can therefore produce different contact/joint convergence than the old fixed setting.
- Dropped-time behavior is explicit. Drop records lost time, Preserve Backlog retains it, and Slow Motion bounds retained time. A project that changes policy can observe a different distance after a severely stalled render frame.
- Sleep thresholds/time are profile settings. Changing them alters when a body stops integrating and when sleep/wake callbacks occur.
- Rope2D now persists an explicit 3–32 segment count. Existing ropes normalize to 12 segments; changing the count changes bend/collision resolution and CPU cost.
- World Boundary authoring forces a static body. This prevents an unsupported dynamic boundary from silently moving.
- Body sleep/wake and joint/Rope break events are now forwarded and resolved to stable entity/connection UUIDs.

No documented physics property, renderer behavior, feature, control, or animation was deleted. The raw 32×32 matrix moved out of the beginner path but remains under Advanced. No template-only tutorial overlay was added to global chrome.

## Added

- Accurate, Balanced, Fast, and Custom project-scoped profiles with fixed rate, interpolation, catch-up, time policy, substeps, solver iterations, sleep, and diagnostic budget.
- Static, Dynamic Rigid, Animatable/Kinematic, Character, and Area/Trigger role descriptions and stable movement ownership.
- Structured ray, point, overlap, sweep, nearest, and contact query APIs with masks, sensor policy, exclusions, bounds, sorting, and enriched results.
- World Boundary collider choice and declared support for rectangle, circle, capsule, segment, polygon, chain, boundary, and compound authoring.
- Stable script-export metadata for controller speed/jump/gravity/slope/step/snap, rigid-body damping/gravity scale, and Rope segment/compliance/damping/break fields.
- Rope2D segment-count control, connected-collision policy, performance warning, and constraint telemetry.
- Virtual Physics Monitor body/collision/constraint/capture views, sorting, pins, 60-sample sparklines, deltas, capture JSON export, and snapshot comparison.
- Center-of-mass, velocity, and force viewport overlays; physics budget and scale warnings in Project Health.
- Six version-pinned references: platformer, top-down, queries/triggers, joints, Rope2D, and diagnostics.
- English, German, and Chinese manual chapters plus API, character, diagnostic, and known-boundary documents.

## Qualification

The release archive includes versioned analytical tolerances/results, Rust workspace tests, normalization/ordering fixtures, character and joint/Rope fixtures, 20,000-body telemetry stress, accelerated 24-hour-equivalent step soak, monitor/API mapping, Windows installer/portable smoke, browser layout evidence, and checksums. The genuine wall-clock 24-hour player run, second-host bit comparison, clean disposable-VM installer lifecycle, publisher signing, and external browser/platform runs remain explicitly pending external gates; they are not represented as completed.

