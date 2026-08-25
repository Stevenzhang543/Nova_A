# Nova_A 4.8 performance captures

Open **Profiler** while Game preview runs. The frame timeline includes input, physics, scripts, animation, audio, UI, rendering, memory, allocation/job, GPU-pass, draw-call, and physics/audio counters. The proportional flame view shows category cost; markers, counters, and annotations are retained with the capture.

Choose **Capture performance**, then compare two saved captures. Comparison reports average/peak frame, GPU, draw-call, texture-memory, asset-memory, entity, and budget regressions. **Export capture + CI result** saves the versioned `nova-performance-capture` JSON and a compact pass/fail report.

Budgets live in project production settings: frame, rendering, audio, GPU, draw calls, texture memory, particles, and profiler overhead. CI passes only if every evaluated check passes. `Full`, `Low overhead`, and `Off` modes expose estimated profiler overhead. The remote-player field identifies the exported player source; local-host authenticated debugging policy still applies.

Capture files contain engine version 4.8.0, timestamps, frames, renderer snapshot, audio/particle snapshot, markers, counters, annotations, mode, overhead, remote peer, and evaluated limits. A benchmark or baseline is reproducible only with the project, capture, environment identity, and evidence hash.
