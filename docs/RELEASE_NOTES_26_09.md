# Nova_A 26.09 release notes

Machine version: **26.9.0**. All frozen Project, Script, Graph, Plugin, Package, Build, Network and Workspace contracts remain unchanged.

## Ultimate-performance and large-project work

- Worker jobs use generation-safe leases. Cancellation, timeout, crash and shutdown cannot make a busy worker accept a second job or let a stale reply mutate current state. Local fallback yields to a browser task before heavy work and preserves deterministic results.
- Stable component scheduling reuses versioned typed columns and avoids repeating component-map work for unchanged structure. Runtime commands remain ordered and bounded; presentation adaptation never changes fixed-step physics, scripts, animation clocks, controls or authored values.
- Management tools and bottom tools are split into independent chunks; speculative warmup is idle-only, sequential, cancellable and disabled on constrained hardware.
- Assets mount a true viewport window with overscan, while hierarchy, streaming, navigation and background queues retain bounded work and deterministic order.
- Performance evidence separates CPU frame time, queue time, worker time, cache/dirty work, RAF cadence, 1% lows and an explicitly labelled presentation-latency proxy.

## Collaboration correctness

- Change-list identity includes script, graph, localization and other asset source text. Change lists retain base/current fingerprints, generation and stale state.
- Semantic merge handles identity-bearing nested arrays without alphabetically reordering authored scenes or tracks. Delete/modify and graph conflicts keep exact paths; conflict/depth/node limits fail closed.
- Final merge output must pass canonical project validation. Local binary locks remain advisory and no implicit network operation was added.

## External evidence

Real low-end hardware, a wall-clock 72-hour soak, independent multi-user collaboration, matching-host builds, publisher signing, clean machines and second-machine byte reproduction remain pending external evidence.

