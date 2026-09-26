# 26.27 performance measurement protocol

## Evidence and scope

`scripts/measure-v26.27-performance.mjs` preserves the 26.26 production distribution and exact scene bytes in `.cache/performance-26.27/baseline-26.26/`. Both versions export their own actual Web player through `nova-export.mjs`. Completed measurement JSON files are immutable; a new `--run-label` creates a separate after run. The production scene is `creator-v2624-output-quality`, at a 1400 × 900 viewport and device scale 1, with unchanged authored quality. Each report records the complete distribution hashes, scene hash, hardware, observed canvas backing dimensions, API, default framebuffer samples and renderer identity.

This device uses headless Edge with SwiftShader in the automated fixture. CPU frame callbacks and delivered requestAnimationFrame intervals are measured independently; neither measures physical GPU completion or monitor presentation. GPU timings are not collected by this timing probe; Profiler may show valid timer-query values for its actual backend, including software rendering. Project-open and Design-return wall times include automation transport and 350 ms settling, so they are not physical input-to-pixel latency. Real old-PC, mobile, physical GPU and display claims require those devices.

## Immutable baseline

`release-audits/v26.27-performance-baseline.json` contains ten actual 30-second foreground idle windows (about 300.2 seconds), a 30-second background window and actual resume. Its initial active portions partially overlapped development tooling and renderer checks. It remains lifecycle evidence, not the uncontended before-performance conclusion. Its first project-switch implementation reloaded the page and therefore does not establish same-page disposal.

`release-audits/v26.27-performance-baseline-quiet.json` repeats only active editor, stopped Script, Design-return, actual exported player and three same-page project-switch pairs, while other builds and renderer tests were paused. No five-minute window was repeated unnecessarily.

| Quiet 26.26 window | Duration | callback CPU median / p95 / p99 (ms) | delivered interval median / p95 / p99 (ms) | total task CPU (ms) |
| --- | --- | --- | --- | --- |
| Editor playing | 15.016 s | 10.3 / 12.1 / 13.7 | 24.9 / 25.1 / 29.2 | 6886.8 |
| Script stopped | 30.070 s | 3.1 / 39.5 / 58.4 | 4.2 / 41.6 / 58.3 | 24720.4 |
| Exported player | 15.025 s | 8.3 / 10.2 / 11.0 | 8.3 / 12.5 / 12.6 | 14969.6 |

Quiet initial project open was 2637 ms, first Design return 1250 ms, and the next two returns 1503 / 1575 ms, including automation transport and settling. These numbers do not independently justify additional preload memory.

Quiet same-page switch samples had no outstanding object URLs or explicit live workers. Raw CDP listeners changed 784 → 1202 → 422, showing pending garbage collection matters; this is not automatically a leak. Heap usage likewise oscillated. After samples explicitly collect garbage before retained-resource checks, before the foreground idle sequence, and after each idle window. Collection is outside measured CPU windows; raw end counters remain preserved alongside `retainedAfterGC`, and listener assertions use retained samples. The report preserves this methodological difference.

## After runs and acceptance

`--run-label=development1 --smoke` is only a short diagnostic run. It cannot establish final performance improvement because durations differ. `--run-label=final` runs the full matched active windows and five actual idle minutes plus background/resume. Formal evidence is `release-audits/v26.27-performance-after-final.json`; until that file succeeds, final performance acceptance remains pending.

The final report embeds the immutable quiet baseline object and SHA-256, publishes positive and negative differences, and marks canvas/duration mismatches noncomparable. Task CPU is normalized per wall-clock second; raw median/p95/p99 values remain available. No worse quality is silently counted as optimization.

After-only instrumentation counts pending function timeouts and intervals; old baselines have no corresponding measurements. It adds small scheduling bookkeeping overhead. Repeated project switch checks bound net retained URLs, explicit workers, listeners, heap, live DOM and timers. Thresholds use measured baseline growth plus small tolerance; heap allows at least 32 MiB for GC variation. New timer growth budgets are 4 timeouts and 2 intervals; these are bounded regressions, not proof of absence of every leak. Resume navigation must complete within 15 seconds including transport/settling. Worker counts cover explicit termination and cannot certify self-closing worker state.

Profiler diagnostics present recorded-frame interval percentiles, actual backend/backing dimensions/AA, fallbacks, texture budgets and per-pass CPU submission cost. Heap growth uses real wall-clock time and remains a trend, not leak certification. Editor presentation preferences do not modify authored export quality.

## Bounded renderer fixture (separate from editor/player frames)

Three exclusive runs are retained under `release-audits/v26.27-renderer-isolated-{1,2,3}/renderer-staged.json`, ten assertions passed in each. They alternate before/after on SwiftShader, with 20 warm-up and 80 measured samples, 600 transparent triangles, 1500 resident textures, 800 × 450 backing, MSAA4 and post-processing retained.

| Run | whole renderer submission + gl.finish median / p95 / p99 before → after, ms | residency maintenance median / p95 / p99 before → after, ms |
| --- | --- | --- |
| 1 | 1.1 / 5.9 / 161.5 → 1.1 / 9.7 / 176.1 | .065 / .103 / .108 → .009 / .011 / .013 |
| 2 | 1.4 / 9.0 / 174.3 → 1.4 / 9.1 / 210.6 | .072 / .088 / .100 → .009 / .012 / .017 |
| 3 | 1.1 / 8.9 / 181.4 → 1.0 / 8.8 / 10.2 | .066 / .076 / .107 → .008 / .011 / .012 |

The local maintenance median used about 7.2–8.3 times less CPU. Complete renderer medians were largely unchanged, and tail spikes remain variable, including worse after tails in two runs. This is a local algorithm improvement, not a total-FPS gain. Other `renderer-repeat-*` development runs may overlap unrelated work and are excluded from this conclusion. Final frozen-build qualification re-executes the fixture independently.
