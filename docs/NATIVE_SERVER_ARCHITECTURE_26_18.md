# Nova_A 26.18 native server architecture and rollback boundary

Status: architecture decision and implementation design, not a shipped windowless executable. The current `headless-server` persisted identifier remains compatible. Its implementation is a renderer-disabled desktop WebView player. No GUI-free startup claim is made.

## Existing execution boundary

`src-tauri/src/main.rs` invokes the Tauri application. `src/PlayerApp.vue` loads a NovaPak, waits for the world WASM runtime, starts GameplayRuntime and uses a window timer in server mode. It omits WorldCanvas, but still requires the WebView, JavaScript, DOM and desktop application. `src/runtime/gameExporter.ts` requires explicit networking/autostart and an authoritative desktop role. `src/runtime/productionRuntime.ts` lazily binds optional networking, converts accepted inputs to gameplay signals and forwards RPC/scene events. `src/runtime/networking.ts` currently owns Protocol 2, peer lifecycle, replication and authority in TypeScript.

Rust `crates/nova_runtime` owns fixed-time scheduling and physics orchestration independently of the editor. `nova_script` provides the Rhai engine and `nova_format` supports serialization, but these alone do not execute the full TypeScript gameplay host, entity components, event sheets, assets, navigation, scene transitions and network contract. A Rust program that merely opens UDP and advances physics would not run existing multiplayer games faithfully.

## Decision and proposed entry point

A genuine native server is a separate future binary, provisionally `nova_server`, depending on nova_runtime, nova_physics, nova_script and nova_format, with no Tauri, WebView, wasm-bindgen host or renderer dependency. Do not rename the existing preset. Introduce a new explicit export target only after the parity gates below pass. The design adds no dependency or project schema change in 26.18.

The proposed entry point accepts a package path, bind address, role and an explicit permissions/configuration file. It validates the complete package and supported component/API capability manifest before opening any socket. Unsupported gameplay must fail with a named capability and entity/script location; it must never silently drop components. Configuration contains provider identifiers, with secrets supplied separately through an appropriate protected host facility and omitted from logs/packages.

Startup order: validate package and permissions; construct deterministic entity/scene registry; load asset data and Rhai modules; register the same supported host APIs; initialize physics; bind reviewed transport/authentication; publish readiness only after the world and transport are ready. The process loop advances a monotonic fixed scheduler with bounded catch-up, receives bounded input queues, performs authority checks, runs event/script/physics stages in the documented order, and emits snapshots after state commits. Shutdown stops admission, closes transport, drains bounded pending work, flushes logs and exits with an explicit status.

Protocol 2 initially stays wire-compatible. Port its packet codec and admission/ACK/replay behavior behind fixtures shared with TypeScript; do not implement a second loosely similar protocol. Entity identity, authority, property masks, scene identity, reliable windows and baseline atomicity must match exactly. A protocol change requires its own negotiated version and migration design.

Logs should be structured records with process/session/peer/tick/severity fields, bounded rotation and redaction. A read-only inspection endpoint is opt-in and authenticated. Editor instance navigation consumes those records by exact process identity, with a disconnected state; process metadata must remain distinguishable from live world inspection.

## Required parity and no-GUI gates before shipping

1. Run the same package in editor, current player and native binary; compare supported entity state, ordered events, script outputs, scenes and physics hashes at each fixed tick.
2. Include code, blocks and mixed versions of the same game, remote input, authority transfer, late join, disconnect/rejoin and save restoration.
3. Reuse malformed-packet, epoch, retry, impairment, queue and baseline tests against both implementations. Capture actual independent processes and endpoints.
4. Launch on an isolated machine without a display session or installed WebView runtime. Inspect process modules/dependencies and verify no GUI process/window is created; readiness and graceful termination must work through the documented CLI.
5. Exercise missing/corrupt packages, denied bind, provider failure, shutdown during connection, script exceptions, memory/time budgets and interruption recovery. Verify exact exit status and bounded logs.
6. Freeze the binary's source/toolchain and package it separately only after matching-host and user workflows pass. Linux/macOS are not certified by Windows results.

## What can currently rewind

| State or effect | Current behavior | Requirement for full simulation rollback |
| --- | --- | --- |
| Replicated position, rotation, velocity | Recorded transform deltas can be reapplied after a correction; enabled field masks and parent-first world transforms apply. | Tick-indexed authoritative restore plus deterministic re-execution, with a defined missing-history policy. |
| Saved enabled/transform/velocity/angular velocity | Multiplayer save validation stages state before mutation. Live transport sequence queues and clock survive manual restoration. | Full world snapshot schema, identity/lifetime and scene registry checkpoint. |
| Physics solver contacts, warm starts, sleeping, joints and RNG | Not restored by the network transform-delta routine. | Serializable solver state and repeatable platform-specific step evidence. |
| Rhai scopes, modules, closures and queued script work | Not replayed by transform correction. | VM checkpoint or deterministic state reconstruction and exact host-call ordering. |
| Entity creation/deletion and scene transitions | Not reversed by transform correction. | Ordered lifetime/scene journal with reversible identities. |
| Input and authority transitions | Bounded recorded/accepted inputs and explicit authority state exist; this is not a complete simulation journal. | Stable per-tick input selection, ownership revisions and deterministic transfer ordering. |
| Audio, UI, particles and animation events | Not re-executed by network delta replay. | Separate presentation effects with stable IDs and suppression/deduplication. |
| Filesystem, network, plugins and external services | Cannot be undone by restoring transforms. | Commit horizon/outbox and idempotency keys; irreversible effects only after confirmation horizon. |

Do not extend rollback by rerunning arbitrary gameplay frames: that would duplicate external effects and still omit solver/VM state. The proposed journal records inputs, RNG, lifecycle, authority and host commands before deterministic execution, and commits external effects only after the rollback horizon. Until that is implemented and audited, full simulation rollback remains unsupported.

## 26.18 evidence scope

The focused programmer tests use actual runtime modules and explicit in-memory fixtures. The process audit uses three separate Node processes and real localhost UDP with packet loss, duplication and reordering, a disposable local authentication fixture, populated replication and authority transfer. Neither constitutes Rust native server or public-internet certification. Browser audits use real keyboard/mouse input in Edge software rendering. Native OS observations and public-service trials require their own evidence.
