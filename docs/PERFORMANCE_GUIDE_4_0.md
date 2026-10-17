# Nova_A 4.0 performance guide

Profile before changing quality. Use Profiler traces for script, physics, animation, audio, render passes, jobs, memory estimates, streaming cells, and package activity; compare captures on the actual target.

- Keep fixed physics at the lowest rate that preserves gameplay, bound catch-up steps, prefer discrete collision, and enable CCD only for fast/small bodies.
- Batch compatible sprites/materials, use atlases, control particles/lights/shadows/render textures, and choose Nearest only for pixel art.
- Stream long audio and world cells within explicit budgets; set voice, memory, job, and cache limits.
- Avoid per-frame allocations and unbounded script/log/test collections. Use cancellable tasks and deterministic data structures.
- Use incremental builds while authoring; validate or clean caches for qualification. Strip unused assets only after reviewing dependency reports.

4.0 may not regress the established 3.9 budgets without an approved report. Browser timings do not substitute for GPU/OS measurements, and accelerated soak does not claim wall-clock hours.
