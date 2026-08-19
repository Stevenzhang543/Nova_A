# Nova_A 3.5.0 known issues and qualification boundaries

There are no open S0 or S1 issues in the completed local release gates.

- S2 — Debugger stepping pauses at safe callback boundaries because the embedded Rhai VM adapter does not expose arbitrary statement suspension. Line/function/conditional/log breakpoints, stack frames, watches, evaluation, and break-on-error remain available.
- S2 — Script allocation values are deterministic estimates; use duration and call counters as the authoritative profiler measurements.
- S2 — Windows installers are not Authenticode-signed because no publisher certificate was supplied. Verify `SHA256SUMS.txt`; Windows may display an unverified-publisher warning.
- S2 — Linux and macOS clean-machine installers must be produced and qualified on matching hosts.
- S2 — The bounded stability smoke passed, but a 24-hour wall-clock soak remains an external release-engineering gate.

Existing documented 2D physics and platform limitations remain in `docs/KNOWN_LIMITATIONS.md`.
