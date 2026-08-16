# Nova_A 3.0 benchmark methodology and results

Nova_A publishes machine-readable evidence in `release-audits/v3.0.0-benchmarks.json`. Run `pnpm references`, a production build, and then `pnpm benchmark:v3` on the target machine.

Measured headless metrics are physics throughput, Rhai language-analysis/hot-reload latency, deterministic asset decode/hash/compression time, deterministic platformer export time, and available artifact sizes. Web evidence includes the JavaScript file count, aggregate raw/gzip bytes, and largest production chunk so a bundler advisory is visible instead of hidden. The report includes OS, architecture, Node version, CPU count, memory, exact workload, samples, median/p95 where applicable, and exceptions.

Interactive editor cold start, idle working set, frame-time p95, and workspace-switch p95 require an instrumented native/GPU session. The script records them as `null` with a corrective plan instead of inventing values. Those values only become release claims when an attached result from the published reference machine exists.

## Budgets and honest exceptions

The roadmap budgets remain targets: ≤3 s editor cold start, ≤2 s medium-project open, ≤15 MB empty standalone engine code before game assets/runtime prerequisites, ≤300 MB empty-editor working set, ≤100 ms workspace response p95, ≤500 ms small-script reload, 10,000 visible static sprites at 60 FPS on the named integrated-GPU profile, finite physics, and deterministic replay checksums.

Any measured miss or unmeasured interactive metric is a published exception. The corrective plan is to capture native startup/memory and browser/native GPU traces in CI/reference-hardware runs, then optimize only with user-visible quality settings—never by silently removing animations, collision, precision, or render quality.
