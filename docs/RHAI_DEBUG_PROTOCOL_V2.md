# Nova Rhai Debug Protocol v2

Nova_A 4.6 exposes one bounded JSON request/response protocol for the built-in Script Studio and trusted local exported players. It is an integration contract, not an unrestricted remote console.

## Session and security

- Remote debugging is disabled by default and requires both **Enable remote debugging** and **Allow exported players**.
- The listener accepts loopback hosts only (`127.0.0.1`, `::1`, or `localhost`). A 32-or-more hexadecimal-character token is required and compared without early mismatch exit.
- The player and editor exchange protocol version `2`; rejected host, token, or player-policy attempts enter the bounded audit trail.
- Values are JSON-safe, depth/length bounded, and evaluated against a paused frame snapshot. Debug evaluation cannot access files, processes, network, DOM, editor objects, or runtime mutation APIs.

## Requests

`initialize`, `threads`, `stackTrace`, `scopes`, `variables`, `evaluate`, `continue`, `stepIn`, `next`, `stepOut`, `pause`, `restart`, and `disconnect` are stable v2 operations. Each request has an ID and receives either a result or a stable `NOVA-DEBUG-*` error.

Breakpoints persist with source UUID, line, optional function, condition, hit count, log message, enabled state, and group. Nova evaluates them only at safe callback boundaries. Stack frames retain source UUID/line, entity identity, callback, locals, and task/thread identity, so source navigation remains deterministic.

Generated-source adapters may provide a bounded source map. Nova accepts at most 50,000 mappings, requires finite one-based lines, non-negative columns and project-relative non-traversing source paths, sorts accepted mappings deterministically, and reports invalid/excess entries with `NOVA-DEBUG-SOURCEMAP` diagnostics.

## Failure behavior

Disconnect, destroyed objects, stale frames, invalid expressions, exceptions, recursive callbacks, or hot reload never corrupt the running world. The debugger reports the condition and either remains paused on a valid frame or cleanly disconnects. Exception policy is `never`, `uncaught`, or `all`.

The executable security and behavior report is `release-audits/v4.6.0-debug-protocol.json`.
