# Nova_A 26.07 multiplayer, services, replay, and server export

Nova_A 26.07 keeps networking optional, local-first, and disabled by default. Opening a project, opening Network Studio, importing a replay, or selecting a server preset must not open a socket. A session may start only when the reviewed networking package is installed, the project setting is enabled, the project network permission is granted, and the creator explicitly connects or enables **Start with game runtime**.

Project Format 2/schema 29, Network Protocol 2, Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, and Export Template 1 remain frozen. New session metadata is additive and capability-negotiated. A peer that cannot safely negotiate the required schema or feature set is rejected with an actionable diagnostic rather than silently downgraded.

## Safe session lifecycle

1. Install and enable **Nova Optional Networking**.
2. Open **Network Studio → Session**. Select Local lobby or Direct connect, review the bind/endpoint, then grant the project permission.
3. Select Host, Client, or Server. The authority admits peers and assigns their effective role; a remote packet cannot make itself Host or Server merely by claiming that role. An unverified WebSocket/adapter Host or Server claim is downgraded to Client.
4. Connect explicitly. Gameplay packets are ignored until the peer has completed the bounded hello/authentication/admission sequence. The admitted role, transport source, and accepted peer identity are immutable for that session epoch. Direct native UDP accepts authority only from the configured endpoint. Local loopback may accept a same-process-route identity within the explicitly local-machine trust boundary; that is not remote authentication.
5. Disconnect explicitly or stop Play. Reliable windows, delayed simulation deliveries, replay nonces, interest views, ownership, peer baselines, and process diagnostics are released with the session.

The maximum peer count, packet bytes, payload bytes, messages per second, pending reliable packets, retry count, reliable receive gap, replay age/window, input fields, diagnostic history, and delayed-delivery queue are all bounded. Malformed, excessive, stale, duplicated, out-of-session, out-of-order, unauthenticated, or unauthorized traffic fails before gameplay dispatch.

## Transport and optional services

- **Local lobby** is same-device/same-origin development through `BroadcastChannel`; it is not Internet discovery.
- **Native UDP** is direct and unencrypted. It is suitable for localhost qualification, not a claim of secure public deployment.
- **WebSocket** is a client connection. Use `wss://` for transport encryption. Routing multiple logical peers requires a reviewed relay adapter that binds provider identity to the Nova session identity.
- Reviewed **transport**, **identity**, **lobby**, and **relay** providers declare stable IDs, versions, publisher/review identity, permissions, capabilities, security documentation, cancellation, and cleanup behavior. No provider is selected automatically, and no Nova_A cloud/account/relay is mandatory.
- A successfully verified authentication hook supplies cryptographic peer identity for the bounded signed context defined by that provider. It does not encrypt UDP or plain WS. Without a verified hook, an adapter/WebSocket role claim cannot establish Host/Server authority. Secret keys, tokens, cookies, authorization values, private keys, endpoints, and bind addresses are excluded from project-facing diagnostics, replay, and session saves.

Use a reviewed encrypted transport or an independently reviewed secure tunnel for public traffic. Credential provisioning, DDoS protection, anti-cheat, NAT traversal, public matchmaking, and relay operations remain application/service-owner responsibilities.

Headless CLI output accepts only the matching-host Nova_A player built at the default reviewed location. An explicit `--player` is rejected for headless output until Nova_A has a signed template-hash registry, and any candidate player that already ends in an embedded NOVAPK footer is rejected to prevent nested or stale project payloads. File-backed assets are canonicalized before reading; a symlink or junction that resolves outside the project directory fails closed.

## Authority, RPCs, and replication

Every replicated object has an explicit authority policy and property list. Host/server authority is assigned by the authority. Owner-only RPCs carry an object scope and are accepted only when the admitted sender owns that object. Authority transfer is reliable, bounded, and limited to an admitted target; disconnect returns owned objects to host/server according to project policy.

Snapshots use the fixed simulation tick rather than wall-clock scheduling. Stable UUID ordering and per-peer baselines make replication diffs inspectable. Interest management filters non-always-relevant objects by scene and radius, expires stale views, and applies entity/packet budgets. Scene handoff and late join use an ordered sequence: authorize, load the allowed scene, apply the validated baseline, acknowledge it, then admit live deltas. Live traffic is never allowed to race an unapplied baseline without a bounded queue.

The 26.07 rollback path is deliberately bounded: it restores the authoritative replicated transform, rotation, and velocity at a fixed tick, then reapplies the recorded transform/rotation/velocity state deltas through the later journal frames to reconstruct the present state. A timeline counter or transform blend alone does not satisfy even this bounded contract. The implementation does **not** rerun buffered `InputSnapshot` values through physics or Rhai, so nonlinear input/physics/script rollback and replay of arbitrary side effects remain unqualified and deferred. Such scripts or extensions must remain non-predictive and use interpolation/authority correction instead.

## Deterministic replay and session save

The version-1 multiplayer replay document records bounded engine/protocol/schema/session identity, tick rate, peers, ordered input snapshots, fixed ticks, authoritative checksums, and packet-summary checksums. Import normalizes those fields to documented bounds and keeps version-1 documents readable. Playback validates strict tick order and supplies immutable normalized frames to the caller; it does not itself rerun physics, Rhai, authority transfer, or scene changes. Initial authoritative state, deterministic seed/settings, and full nonlinear simulation replay remain required future work before Nova_A can claim a production-grade deterministic gameplay replay.

A version-1 session save accepts an engine version from 5.8.0 through the current engine only when the current schema and current session identity also match. Future, malformed, wrong-schema, wrong-session, duplicate, or invalid state is rejected before one atomic apply; the world is never partially mutated. Deterministic saves use fixed-tick metadata; wall-clock capture time, when retained for display, is excluded from deterministic identity. Nova's fast checksum is a divergence diagnostic, not a cryptographic signature. Tamper/provenance claims require SHA-256 plus an independently managed signature or authenticated provider.

## Embedded multi-instance play

**Orchestration** builds once and launches a bounded 2-, 4-, or 8-instance plan: one Host and the remaining Clients. Each instance receives an explicit instance ID, role, player name, session, native-UDP bind/endpoint override, log scope, and Inspector identity. The launcher uses the executable path returned by the build, including a locked-file fallback name; it does not reconstruct a guessed filename. Before spawn, the native backend requires the adjacent `nova-build-report.json`, report format 2, current engine version, Windows/x86_64 host, one unique relative executable record, and exact executable byte length and SHA-256. It also decodes the embedded project and independently rechecks enabled/authorized automatic networking, explicit client/listen grants, Host/Server authority, Direct session mode, and native UDP. A caller-supplied working directory alone can never authorize an arbitrary executable.

The **Logs** action filters Network Studio's bounded, editor-observed network events to the selected instance ID; it is not OS stdout/stderr capture. The editor's **Inspector** action opens the selected process detail card with identity, role, endpoint, bind address, PID, and status; it does not focus or control the child process and does not open that player's UI. Use the Inspector toggle inside the corresponding player window to see that player's live network state and bounded `editorState` log. The player log currently does not provide pause, filter, copy, clear-view, or follow-tail controls. The named **Stop** action terminates an instance; simply opening or closing Logs/Inspector does not. A partial launch failure terminates the processes started by that request. Closing the editor cleans up editor-owned test instances without granting network permission to the built game.

## Client and server export

Normal game export retains the existing Windows/Web behavior. Web output traverses static player dependencies, but feature-gates dynamic networking, navigation, and AI entries against the serialized project/package state and omits Tauri-only dynamic entries. Thus an offline or package-absent browser build does not ship unavailable optional networking or native-only chunks. A headless-server export is accepted only for a supported native template and a project with the networking package installed and locked, explicit `network.client` and `network.listen` grants, networking enabled, project permission granted, automatic runtime startup, Direct session mode, Host/Server authority, and native UDP. The reviewed adapter interface remains available to editor/runtime integrations, but the 26.07 CLI rejects an adapter/provider-dependent server build because it cannot yet prove that provider was statically packaged. CLI and desktop validation must agree, and the native backend independently receives/attests the runtime mode.

The exported server is locally checked for the embedded package footer/hash, template identity and player hash, renderer/audio/UI suppression, a fixed-tick loop, structured status, and real client traffic. The local gate mirrors the native NOVAPAK header/index/codec/length/hash checks, connects and reconnects separate client processes on dynamically allocated loopback ports, and requires admitted authority plus fixed ticks and authoritative snapshot traffic. Merely remaining alive for five seconds is a process smoke, not proof of an authoritative server. The local harness terminates the process after observation; graceful service-control shutdown remains unqualified. On Windows, a WebView-backed player with its world renderer disabled remains a stated limitation until a no-window service/console template is independently qualified.

Exported players must not inherit unrestricted editor-only native commands. Native UDP access is bound to the embedded project's package/permission/session policy. Because 26.07 has no signed external player-hash registry, headless CLI `--player` input fails closed; the matching-host default player hash is recorded as a local unsigned observation—not publisher attestation—and any candidate that already contains an embedded project is rejected. Asset resolution remains inside the project root after symlink/canonical-path resolution. Local signing/notarization hooks, deployment destinations, and path-shaped package-source locations are redacted from `game.nova-pak`.

## Qualification and commands

Run the focused gates before aggregate audit/evidence:

```text
pnpm references:v26.07
pnpm manual:v26.07
pnpm build
pnpm tauri build
pnpm audit
pnpm verify:v26.07:networking
pnpm verify:v26.07:processes
pnpm verify:v26.07
pnpm verify:v26.07:interactions
pnpm verify:v26.07:history
pnpm verify:v26.07:layout-contract
pnpm qualify:v26.07:layout
pnpm security:v26.07
pnpm benchmark:v26.07
pnpm stability:v26.07
pnpm verify:v26.07:windows
pnpm verify:v26.07:headless
pnpm audit:v26.07
pnpm evidence:v26.07
pnpm release:v26.07
```

Local evidence must distinguish behavior tests, source contracts, process smoke, and external qualification. Publisher signing, hostile public-network review, a real relay/NAT deployment, second-machine reproduction, disposable clean-machine lifecycle, non-Windows matching-host builds, independent accessibility/usability review, and a 72-hour multi-peer soak remain `pending-external` until their artifacts exist.
