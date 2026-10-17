# Measured idle behavior

On the same Windows host, headless Edge with software rendering and concurrent audits, the26.22 baseline ran301128ms and the26.23 observation ran331245ms including30s in an actual background tab. These are diagnostic observations, not isolated hardware FPS benchmarks or long-duration certification.

| Observation |26.22 baseline|26.23 candidate|
|---|---:|---:|
| Script CPU duration in30–60s window |4.338460s|4.192572s|
| Script CPU duration in270–300s window |8.588391s|4.253815s|
| Idle DOM nodes, steady first/last |506/506|507/507|
| Idle listeners, steady first/last |388/388|399/399|
| Script→Design navigation after idle |1005ms|1038ms|

The before-run CPU increase matches the independently reproduced profiler capacity cliff: reactive front removal shifted thousands of entries. Replacing that trim with a raw bounded slice preserves order and reactive notification without those shifts. Separate controlled microbenchmarks and exact sequence/reactivity tests support causality; the browser observations alone cannot isolate concurrent load.

The new background test activates a real second tab, observes hidden state for30s, returns to the editor, observes visible state and resumed frames, then navigates successfully. Heap varies with garbage collection; it is not evidence of universal absence of leaks. DOM/listener counts are stable within each run; the absolute count differs because the new controls have owners. Physical OS suspend, GPU resource accounting on all drivers, workers/timer behavior in every feature, old PCs and long soaks require further26.27/platform measurements. No effects, output-resolution settings or default animations were removed.

Evidence: original release-audits/v26.23-idle-baseline.json (development baseline) and current release-audits/v26.23-idle-resume.json, with retained failed lifecycle-diagnostic attempts. Final source-bound qualification reruns the current audit and records its own timing.
