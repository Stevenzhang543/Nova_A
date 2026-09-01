# Nova_A 6.6 production multiplayer

Nova_A 6.6 turns the optional local-first networking foundation into an explicit production workflow. Networking remains off by default, needs the reviewed optional package, and cannot open a socket until the project grants permission. Local lobby discovery and hosting are user actions; Nova_A has no mandatory account, cloud, relay, analytics, NAT traversal, credential store, or implicit Internet request.

## Session and transport workflow

1. Install **Nova Networking** in Network Studio.
2. Enable networking and grant the project permission after reviewing the session mode, transport, endpoint, bind address, and limits.
3. For same-device development, choose **Local lobby**, then **Host local lobby** or **Discover local lobbies**. BroadcastChannel messages remain on the same browser origin/device.
4. For direct deployment, choose secure WebSocket (`wss://`), native UDP, or a registered reviewed adapter. Native UDP is unencrypted; use an independently reviewed secure tunnel if policy requires encryption.
5. Optional adapters must have a reverse-domain ID, semantic version, SHA-256 review identity, Whitelist review, HTTPS documentation/security links, and only `network.client`/`network.listen` permissions.
6. Optional authentication providers receive a frozen, bounded handshake context and create/verify a maximum 512-byte proof. Nova_A never stores provider credentials in projects, packets, saves, replays, logs, or diagnostics.

Protocol 2 is unchanged. The additive security envelope carries an epoch, nonce, issue time, and optional authentication proof. Parsing rejects malformed JSON, wrong protocol/session/schema/channel/delivery, unknown packet kinds, non-finite numbers, excessive depth/collection/string/payload/packet sizes, and secret-like keys. Runtime limits cover per-channel/global message rates, bandwidth, pending reliable messages, replay age/window, and peer count. Replayed, expired, future, or unauthenticated packets fail before gameplay dispatch.

Encryption guidance is deliberately honest: local same-origin traffic is classified as local-protected; WSS and reviewed encrypted adapters are transport-protected; WS and UDP produce a warning, or a build/runtime error when **Require encryption** is enabled. The authentication hook authenticates messages but does not encrypt them.

## Authority, interest, rollback, and scenes

- Each replicated entity selects server or owner authority, properties, interpolation, prediction, initial owner, scene, and relevance policy.
- Host/server or the current owner can transfer authority only when the project allows it and the target is connected. A disconnect/timeout returns owned entities to host/server authority.
- Interest management filters per-peer snapshots by scene and radius while **Always relevant** bypasses filtering. Local interest updates are finite, clamped, versioned protocol messages.
- Scene handoff is allowed only from host/server and goes through the normal deferred scene-loading pipeline. The receiving game records `network.scene_handoff` and retains its usual error/recovery behavior.
- Snapshot divergence and prediction corrections write bounded rollback entries. Applied property changes write bounded replication diffs. Neither diagnostic stream contains credentials or unbounded payloads.
- Multiplayer saves and replays keep bounded, versioned state. Late join receives a full snapshot/save from host/server; existing offline saves and replays remain valid.

## Editor multi-instance play

The Orchestration tab creates a deterministic 2–8 peer plan: one host and the remaining clients, each with a distinct player name, instance ID, Inspector identity, and optional log scope. **Build and launch** is Windows/Tauri-only and requires all existing safety gates: optional package installed, networking enabled, explicit permission granted, auto-start enabled, a valid Windows game build, and a built executable inside its output directory. The native launcher canonicalizes both paths and never enables networking or grants permission on behalf of the project.

Each launched player receives only bounded environment overrides for role, player name, session, instance, and log scope. Runtime overrides apply solely when an instance ID exists. They do not enable networking, change transport permission, or start a session. Separate logs use scoped log directories; per-peer cards provide separate Inspector identities and process IDs.

## Diagnostics and bad-network testing

Network Studio exposes peers and verification state, ownership, peer interest views, replication diffs, rollback timeline, channel totals, byte and packet rates, reliable pending/ack/resend/expiry, malformed/schema/rate/replay/authentication rejection, corrections, divergence, handoffs, disconnect cleanup, and packet summaries. The deterministic network simulator adds bounded latency, jitter, loss, reordering, and duplication without changing offline physics or rendering.

The release audit exercises malformed/version-mismatched packets, denied/revoked permission, adapter/provider review, replay age/nonce/window, rate and size bounds, deterministic bad-network decisions, authority transfer/release, interest/scene relevance, late join, reconnect, save/replay, rollback evidence, 2/4/8-peer local plans/soaks, headless/client export policy, optional-package exclusion, and unchanged offline play.

## Export policy and limitations

- A normal client/host game exports through the existing Windows/Web player path.
- A headless authoritative export requires explicit networking, permission, Server/Host role, and native UDP or a reviewed transport adapter. Web/Android headless export remains blocked.
- Removing/disabling the optional package keeps networking disabled and excludes its dynamically imported runtime from player traversal.
- Public Internet relay/NAT traversal, certificate and credential provisioning, hostile-network security review, cross-host long soak, external signing, clean-machine lifecycle, second-machine reproducibility, and non-Windows matching-host qualification remain external work. This local candidate does not claim them.

Project Format 2/schema 29, Protocol 2, Rhai API 2, Graph Format 1, Plugin API 2, Package Manifest 1, Build CLI 1, and workspace document 3 remain frozen. No feature, animation, shortcut, renderer path, physics behavior, offline workflow, or supported serialized path is removed.
