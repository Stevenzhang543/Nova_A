# Nova_A 3.9 benchmark methodology and results

Nova_A 3.9 publishes build/package/collaboration evidence in `release-audits/v3.9.0-benchmarks.json` and reruns the v3.8 world-data, v3.7 visual/audio, v3.6 presentation, v3.5 programming, v3.4 production-physics, v3.3 5,000-object authoring, and schema-23 50,000-asset evidence. Run `pnpm verify:v3.9` for deterministic locks, package attacks, source-control no-op output, platform policy and build-schema checks; `pnpm qualify:v3.9:layout` captures the three-language editor matrix. GPU FPS and platform I/O latency remain target-device measurements and are never inferred from Node timings.

## Nova_A 3.8 world-data results

The headless suite generates a 1,000,000-cell map, validates runtime chunk reads and coordinate transforms, exercises multi-atlas definitions, variants, transforms, animation, terrain, and per-tile data, and records elapsed time plus heap change. Navigation covers obstacle-aware grid A*, polygon A*, links, agent clearance, TileMap collision/cost sampling, flow fields, and avoidance. Streaming is driven through dependency-aware load/unload transitions under an explicit memory budget. Save tests cover deterministic migrations, journal/temp/backup commits, checksum corruption recovery, progress, and cancellation. Package removal and repeated world-data cycles verify that serialized content remains intact when optional runtimes are absent. Results are measurements from the named host recorded in each report, not universal hardware guarantees.

## Nova_A 3.7 visual/audio results

The headless suite records joined outline bounds/indices, 512 deterministic safe-shader fuzz cases, typed uniform serialization equality, bounded import/quality profiles, 10,000 sprite geometries, 10,000 particle normalizations, 10,000 lighting-response samples, mixer normalization, explicit fallback/recovery state, and editor/export setting equality. Rendering Diagnostics supplies the interactive draw/batch/break/triangle/overdraw/atlas/target/pass/GPU capture surface; Audio Profiler supplies device-specific voice/latency/underrun evidence.

## Nova_A 3.6 presentation results

The recorded Windows x64/Node 22.22.2 run passes all nine input device families, structured CSV/plural localization, three pseudo modes and RTL, animation easing/marker/command tracks, source-linked accessibility, and four responsive layout profiles. The browser qualification separately passes 273 panel/viewport states across English, German, Chinese and saves nine screenshots. These are regression and layout measurements; native GPU frame time remains a distinct target-hardware qualification.

## Nova_A 3.5 scripting results

On the recorded Windows x64/Node 22.22.2 host, 10,000 generated script inputs completed in 237.49 ms (42,107 cases/s). A deliberately invalid 5,000-line source produced 9,999 ranged diagnostics in 64.84 ms, below the published 10,000 ms ceiling. API generation verified 108/108 documented symbols, 108/108 examples, 93 host bindings, and no change from the archived API v1 contract. These are headless language/runtime measurements, not an editor GPU-frame-rate claim.

Measured headless metrics are physics throughput, Rhai language-analysis/hot-reload latency, deterministic asset decode/hash/compression time, deterministic platformer export time, and available artifact sizes. Web evidence includes the JavaScript file count, aggregate raw/gzip bytes, and largest production chunk so a bundler advisory is visible instead of hidden. The report includes OS, architecture, Node version, CPU count, memory, exact workload, samples, median/p95 where applicable, and exceptions.

Interactive editor cold start, idle working set, frame-time p95, and workspace-switch p95 require an instrumented native/GPU session. The script records them as `null` with a corrective plan instead of inventing values. Those values only become release claims when an attached result from the published reference machine exists.

## Budgets and honest exceptions

The roadmap budgets remain targets: ≤3 s editor cold start, ≤2 s medium-project open, ≤15 MB empty standalone engine code before game assets/runtime prerequisites, ≤300 MB empty-editor working set, ≤100 ms workspace response p95, ≤500 ms small-script reload, 10,000 visible static sprites at 60 FPS on the named integrated-GPU profile, finite physics, and deterministic replay checksums.

Any measured miss or unmeasured interactive metric is a published exception. The corrective plan is to capture native startup/memory and browser/native GPU traces in CI/reference-hardware runs, then optimize only with user-visible quality settings—never by silently removing animations, collision, precision, or render quality.
