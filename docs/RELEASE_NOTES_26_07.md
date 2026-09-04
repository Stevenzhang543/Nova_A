# Nova_A 26.07 release notes

Machine version: **26.7.0**. Project Format: **2**. Schema: **29**. Network Protocol: **2**. Rhai API: **2**. Visual Graph: **1**. Plugin API: **2**. Export Template: **1**.

## Added

- A bounded multiplayer session lifecycle with immutable admitted role/source binding, authority-assigned roles, capability/version negotiation, and cleanup by session epoch. Verified authentication hooks supply cryptographic peer identity; unverified WebSocket/adapter authority claims are downgraded, Direct native UDP authority is limited to the configured endpoint, and local loopback remains an explicit local-machine trust boundary.
- Reviewed optional identity, lobby, and relay service interfaces alongside the retained transport and authentication providers. All providers remain absent/off by default and cannot grant project network permission.
- Fixed-tick replication scheduling, bounded input normalization, reliable receive-gap protection, cancellable deterministic impairment delivery, stale-interest expiry, and per-peer replication baselines/diffs.
- Authoritative correction support and a rollback timeline that distinguishes bounded transform/rotation/velocity state-delta reconstruction from interpolation-only correction. Re-running input through physics/Rhai is not claimed.
- Ordered scene handoff and late-join baseline/ack flow, plus reconnect diagnostics and bounded live-delta queuing.
- Managed 2/4/8-instance local play with per-peer roles, UDP overrides, log scopes, Inspector identities, process status, stop/cleanup actions, partial-launch recovery, and an actual independent-process regression gate for every supported instance count.
- The `multiplayer-v2607-coop-rollback` and `multiplayer-v2607-headless-authority` reference projects with explicit local-network, replay, reconnect, export, security, and external-gate instructions.
- Focused 26.07 networking, interaction, history, layout, security, Windows, headless, product-audit, evidence, checksum, and exact-artifact release gates.

## Changed

- Snapshot cadence follows simulation ticks instead of wall time; timeouts and ping continue to use monotonic elapsed time.
- Network diagnostics use bounded/sampled views so an eight-peer session does not clone complete packet, diff, log, or rollback histories on every fixed step.
- Owner-only RPCs require an entity ownership scope. Older ambiguous owner contracts remain readable but fail validation until repaired instead of accepting every caller.
- Replay import normalizes its version-1 document to bounded fields, while save import validates the complete state and compatibility before atomic apply. Version-1 saves accept engines from 5.8.0 through current only with the current schema and session; future or malformed engines fail closed. The fast state checksum is documented as diagnostic rather than cryptographic.
- Headless/client export validation is aligned across editor, CLI, native backend, template identity, build report, provenance, and SBOM paths.
- Network Studio reorganizes sessions, protocol/security, replication, orchestration, replay, and diagnostics into readable responsive task groups. Per-instance **Logs** filters editor-observed network events, while the editor's **Inspector** opens that process's identity/status detail card. It does not focus/control the child or open its UI; the corresponding player's own Inspector toggle shows live network state and its bounded `editorState` log. Full process stdout/log-console controls are not claimed.
- Public and machine authorities advance from 26.06/26.6.0 to 26.07/26.7.0 while frozen serialized contracts remain unchanged.

## Fixed

- Malformed input payloads can no longer reach unsafe replay cloning.
- Extra, pre-handshake, source-mismatched, role-spoofed, replayed, far-future reliable, and owner-unauthorized traffic fails before gameplay dispatch.
- Invalid authentication proofs cannot consume the replay nonce window before proof verification.
- Stopping, reconnecting, or replacing a session cancels delayed simulated packets so stale deliveries cannot cross session generations.
- Multi-instance launch uses the executable returned by the build, cleans up an incomplete launch, and no longer treats an Inspector label as an attached Inspector.
- Native multi-instance launch now fails closed unless an adjacent current format-v2 build report uniquely identifies the Windows/x86_64 executable with its exact SHA-256 and size, and the embedded project independently passes the authorized Host/Server Direct native-UDP policy.
- Headless CLI export cannot bypass the package lock and explicit grants, project permission, automatic startup, Direct session, authority, transport, authentication, or encryption policy.
- Export packaging redacts local signing/notarization/deployment hooks and path-shaped package sources, rejects project-root symlink escapes, rejects already-embedded players and explicit unverified server players, and records the selected default player hash as a local unsigned observation.
- CLI web export now follows the player bundle's conditional dynamic-import graph: offline or package-absent projects omit optional networking/navigation/AI and Tauri-only chunks while ordinary static and enabled web-safe dependencies remain included.
- Exported players no longer expose unrestricted editor-only native networking/process/file commands; native UDP follows the embedded project's permission/session boundary.

## Preserved

No editor feature, animation, shortcut, scripting mode, renderer path, physics behavior, offline workflow, startup template, project field, or supported output was removed. Networking remains optional and cannot change ordinary offline Play when absent, disabled, or denied.

## Qualification boundary

These notes describe the 26.07 candidate contract. A release claim is valid only when the corresponding behavior report passes; a source token or five-second process-alive smoke does not prove rollback convergence, authority security, multi-peer service behavior, or authoritative server traffic. The local server check covers a WebView-backed runtime with its world renderer disabled; a truly no-window service binary and graceful service-control shutdown remain unqualified. Publisher signing and a signed player-template registry, hostile public-network review, real relay/NAT deployment, second-machine reproduction, disposable clean-machine lifecycle, non-Windows matching-host builds, independent usability/accessibility/security observation, and a 72-hour multi-peer soak remain `pending-external` until independently captured.
