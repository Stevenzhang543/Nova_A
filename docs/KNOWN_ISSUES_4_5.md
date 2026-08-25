# Nova_A 4.5 physics known boundaries

- Cross-platform floating-point state is not guaranteed bit-identical. Callback order and same-environment replay are stable; exported replays should validate checksums.
- Concave and chain collider data is stable for query/static workflows, but arbitrary concave dynamic decomposition is not a stable solver contract.
- Rope2D uses a finite particle/constraint discretization. More segments improve appearance and collision detail at a measurable CPU cost.
- Browser scheduling can delay frames in background tabs. Fixed-step policy records or bounds that delay; it cannot make a throttled tab real-time.
- The release evidence includes an accelerated long-step soak. A genuine wall-clock 24-hour run is an external release gate until a qualified runner result is attached.
- Stable Tier-1 qualification is Windows x64 and the documented web browser matrix. Other platforms retain their declared support tier.

