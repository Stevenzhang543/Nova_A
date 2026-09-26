# Nova_A 26.30 native physics stdio host

`native-tools/windows-x64/nova_headless.exe` in the reference-project ZIP is a genuine native Rust process. It does not initialize a WebView, renderer, Rhai VM, project loader or network listener. It is an additional bounded physics integration tool; the existing renderer-disabled full-game authority remains available and distinct.

Build on a matching host with `cargo build -p nova_headless --release --locked`. Only Windows x64 is locally built and qualified. Linux/macOS recipes are external candidate builds, not published verified binaries.

Run `nova_headless.exe --version` or `nova_headless.exe --stdio`. Send one UTF-8 JSON object per line and read one response per line:

```json
{"id":1,"command":{"op":"hello"}}
{"id":2,"command":{"op":"configure","tick_rate":60}}
{"id":3,"command":{"op":"step","ticks":1,"gravity":0,"air_friction":0}}
{"id":4,"command":{"op":"snapshot"}}
{"id":5,"command":{"op":"shutdown"}}
```

A successful reply has `id`, `ok: true`, and `result`. Errors have `ok: false` and `error`. IDs must increase after every successful command; duplicate or reordered requests cannot repeat simulation steps. Rejected commands do not consume their ID. There is one stdin owner per process. Reconnecting means starting a fresh process and replaying your own validated configuration and command journal; the tool does not promise cross-platform bitwise determinism or full-state rollback.

Commands: `hello`, `configure {tick_rate}`, `upsert_body {handle,order,record}`, `destroy_body {handle}`, `colliders {handle,records}`, `upsert_connection {handle,order,record}`, `destroy_connection {handle}`, `step {ticks,gravity,air_friction}`, `query {query}`, `snapshot`, `reset`, `shutdown`. The hello response publishes record strides. Body/connection records use the existing `nova_physics` ABI; consult `crates/nova_physics/src/lib.rs`. Filtered query fields are defined in `crates/nova_physics/src/query/filtered.rs`. This is a low-level protocol, not a `.nova` loader.

Limits: 65,536 bytes per input line; 256 bodies; 512 explicitly tracked connection handles; 16 child colliders per body; 1–120 steps per request; 1–1000 Hz. Numeric records must be finite and within ±1e9. Explicitly destroy retired connection handles or reset to release their handle budget. Oversized lines terminate with exit code 2 before executing. Malformed JSON, unknown fields and invalid commands return errors. EOF and shutdown exit cleanly; commands queued after shutdown are not executed.

After body/collider/connection edits, snapshots return `configurationPending: true`, empty `state`, and null `checksum` until a valid step synchronizes the solver. Queries reject pending configuration. Snapshots are observations, not restore images: they omit complete contact caches, VM state, random state, navigation, streaming and audio. Events are drained on each step to bound retained event memory.

The parent application owns timeout, process disposal, authentication and any optional network bridge. Do not expose raw stdio commands as a public unauthenticated service. There are no filesystem or shell commands in this protocol. Windows integrations can launch with a hidden console using their process API; command-line users retain normal terminal I/O.

The focused release gate builds the actual binary and verifies separate-process replay, real motion, duplicate/reordered command rejection, invalid-input recovery, reset/shutdown/EOF, oversized-line termination, filtered-query synchronization, version identity and a live Windows process probe (zero window handle, no WebView child; the OS console host may exist). Its SHA-256 is recorded in `runtime/native-headless.json` in the evidence ZIP and checked against the binary in the reference ZIP during independent package verification. This is not an old-PC, clean-install or non-Windows qualification.
