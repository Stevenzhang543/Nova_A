# Nova_A 6.8.0 large-world and low-end performance

Nova_A 6.8.0 is an optimization release with a strict compatibility rule: no feature, animation, visual component, shortcut, physics property, fixed-step rule, project field, or export path is removed. Performance claims below are local evidence, not promises for untested hardware.

## Runtime architecture

- `StableComponentScheduler` stores stable entity order and reusable typed transform columns. Component-kind indices are rebuilt only after a structural/component signature change; animation and particle runtimes use those indices instead of scanning unrelated objects.
- Hierarchy parent resolution is prepared once and uses UUID lookup rather than repeated full-array scans. Local/world transform mathematics and cycle protection are unchanged.
- `SpatialHash2D` supplies deterministic, sorted bounded-box queries. Navigation avoidance uses it while preserving the same neighboring-cell range, avoidance limits, layer rules, acceleration, and fixed delta.
- `BatchedCommandQueue` applies sequence-ordered, generation-checked work under both a command limit and a wall-time budget. `FrameBudgetQueue` provides priority, cancellation, stale-generation rejection, and deferred continuation for background work.
- World streaming keeps ownership, dependency closure, memory policy, save handoff, and transition semantics. Only the number of new transitions started in one frame is bounded; deferred cells remain requested and continue on later frames.
- Navigation baking yields at the background-frame budget between deterministic region artifacts and checks cancellation before and after each region.

## Worker contract

The job worker and its mandatory local fallback implement the same bounded pure operations:

1. JSON/CSV parsing, hashing, and comparison (existing contract).
2. Numeric animation-key sampling.
3. Particle position/velocity stepping.
4. Stable spatial-grid preparation.

Each keyed job has a generation. A newer generation or cancellation makes an older result stale, so it is rejected instead of mutating current editor/runtime state. Worker exceptions, unavailable `Worker`, timeout, queue overflow, and shutdown are explicit. Fallback use, queue wait, worker duration, cancellation, failure, and stale results are counted.

## Dirty data, cache, and allocation evidence

The performance runtime reports entity/component counts, dirty transform columns, cache hits/misses, bounded allocation estimates, queued/deferred commands, streaming processed/deferred work, main-thread time, worker time, queue wait, worst frame, 1% low FPS, input-to-pixel latency, and cold/warm startup. Reactive publication is limited to a configurable interval; raw frame sampling stays in bounded typed rings.

The Profiler is the authoritative UI. Capture before and after the same deterministic project and compare exported `.nova-perf.json`/CI evidence. Browser heap memory remains `n/a` where the platform does not expose it.

## Adaptive presentation quality

Adaptive quality uses hysteresis rather than changing on one spike. It may adjust only:

- renderer pixel-density scale;
- the number of *new* particles admitted by the existing presentation budget.

It never changes physics tick rate, timestep, solver settings, script callbacks, animation clocks, authored values, controls, effects, scene content, network simulation, save data, or exported feature availability. Disable it for fixed-fidelity comparison; enable it for a measured low-end presentation test.

## Editor responsiveness

Hierarchy rows remain virtualized with overscan, and Assets use a bounded incremental window. Search/filter changes reset the window rather than mounting every matching card. Long navigation and streaming work is cancellable and frame-budgeted. Selecting, dragging, drawing, switching workspaces, or typing search does not wait for a background generation to finish.

## Qualification matrix

Local release gates exercise:

- before/after equivalence and deterministic ordering;
- worker/local parity for animation, particles, and spatial preparation;
- cancellation, stale results, timeout/fallback source paths, and bounded queues;
- 10,000, 50,000, and 100,000 deterministic fixture descriptors;
- spatial query correctness and stable order;
- fixed-step semantics and feature/animation retention source audits;
- cold/warm startup, input-to-pixel, worst-frame, 1% low, cache, queue, and allocation fields;
- EN/DE/ZH at required editor viewports and 100–200% scale;
- templates, user interactions, Rust/WASM/web/native builds, exported-player smoke, dependencies, and exact eleven-file packaging.

Real low-end hardware, clean-machine lifecycle, publisher signing, second-machine reproducibility, matching-host builds, independent assistive-technology review, and a real 72-hour soak remain external until captured.

## Recovery

If responsiveness regresses, cancel active background work, return performance settings to their normalized defaults, capture the same project again, and compare phase evidence. A worker failure automatically takes the bounded local path. A stale result is never applied. Deferred streaming is not dropped. Project Format 2/schema 29 remains authoritative and unchanged.
