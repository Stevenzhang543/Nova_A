# 26.18 multiplayer workshop

Use the separate `multiplayer-v2618-coop-host` and `multiplayer-v2618-coop-client` projects. Keep a disposable copy of each. They share scene, entity and script identities, and use two player slots. Extra clients do not create extra avatars. The networking package is optional; these projects start with permission and automatic startup withheld. Ordinary offline projects do not need a networking provider.

## Connect and observe

Open Host and Client in separate editor windows on the same browser origin, or corresponding local player windows. Keep both windows rendering: browsers may suspend animation updates in background tabs. Open Network Studio → Session. Grant network permission in each project, keep Local lobby and the same session name, then Connect Host before Client. Each peer list must show the other player's distinct identity. Local lobby uses the same device, origin and browser storage partition; two unrelated browser profiles or origins do not form an Internet session.

Play both projects. Focus the Host canvas and use WASD or arrow keys: Host Player moves. Focus Client: its bounded `coop.move` RPC requests movement of Client Player on Host, and the resulting state replicates to both. Stop restores authored editor state. If input does nothing, first inspect Play, canvas focus, permission, connected status, peer admission, RPC contract and the actual script errors. A transport being connected does not prove that the game is running.

## Ownership and property selection

Server authority means the host/server computes the object's replicated state. Owner authority means the named peer owns it; an empty owner does not let any client claim it. For an ownership experiment, select an object, add it in Replication, choose Owner and enter an admitted peer ID. Or use Orchestration → Authority transfer to transfer an existing assignment explicitly. Observe both peers' ownership diagnostics before moving it. Locally owned state must not be overwritten by the host's relay snapshot. The shipped co-op keeps server authority because its movement scripts ask the host to simulate the remote body.

Choose Transform, Rotation and Velocity separately. Regular snapshots and late-join restoration obey these choices. Transform here is position; scale, enabled state and angular velocity are not additional live replication fields. Full manual multiplayer saves record more state and restore that recorded state intentionally. Interpolate smooths remote enabled fields; Predict replays recorded transform deltas, not physics and scripts. Parent changes apply before child world transforms.

## Edit contracts and recover

Protocol cards expose named channels, reliable ordering or sequenced delivery, payload bytes, message rate and priority. RPC cards expose direction, authority, payload schema, bytes and call rate. A generic object schema does not validate each game-specific field: validate your RPC payload before using it in gameplay. RPCs must use their authored channel. Live additions/removals reach gameplay listeners on production ticks.

Numeric drafts commit on leaving the field. Try an out-of-range value, then repair it: the first edit must preserve the saved value and show an error; the repaired value must apply. Use Undo/Redo and Save Project, reopen and verify the same settings. Changing session identity, transport, authentication or channel identity ends the existing connection; use Reconnect after editing. Property and ownership changes remain live. Reconnect restores admission and baseline state, not arbitrary application history.

Disconnect Client, move Host, reconnect Client and inspect the current state and late-join count. A late join is an atomic validated baseline. Invalid ownership, metadata, byte bounds or checksums must reject it without partially changing the world. Reliable exhaustion reports an actionable failure and removes the peer's pending queues. Old epochs cannot resume gameplay within the tracked connection lifecycle. Optional verified authentication is required for security-sensitive adapters; a checksum is not authentication.

## Diagnostics, impairment and export

Simulation exposes latency, jitter, loss, duplicate and reorder percentages plus a repeatable seed. First establish a clean connection, then introduce modest impairment and compare peer identities, ACK/retry counts, rejected packets and bounded history. Duplicate rejection under a duplicate simulation is expected; distinguish it from a stalled reliable stream. Snapshot-page counters describe the most recently targeted peer: deferred entities are sent on later snapshot intervals, so a large world is not sent atomically every tick.

Instance Logs show this editor's observed events for that process; Inspector shows process identity/status. Inspect gameplay state and network events in the running player. These views are not a remote native debugger or captured child stdout. Export diagnostics for troubleshooting and check redaction before sharing.

Before exporting co-op players, explicitly enable permission and Start with game runtime, choose the intended role and session, and test the actual outputs together. Local lobby players must share the supported local origin/storage context; Windows direct UDP uses a host bind port and clients pointing at that host, with distinct client bind ports. The separate server reference is a Windows renderer-disabled WebView export. It still requires the desktop host/WebView; it is not a windowless Rust server. Read NATIVE_SERVER_ARCHITECTURE_26_18.md for the real native design and acceptance gates.

## Honest rollback and completion checks

Transform-delta replay does not rewind solver contacts, Rhai scopes, entity lifetimes, audio, UI, file writes, plugins or external services. Do not rerun arbitrary frames to imitate full rollback. Public matchmaking, relay and authentication services require explicit reviewed providers and independent infrastructure tests.

For your project, retain evidence of two distinct players moving, ownership edits, disconnect/rejoin, late join, invalid/valid edits, Undo/Redo, save/reopen, exported client/server behavior and logs. Compare the code, blocks and mixed reference variants: generated graphs must compile to the same source and execute the same gameplay. Generated reference files and passing unit tests alone are not user-workflow evidence.
