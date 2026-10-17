# Nova_A 5.8 networking, replay, and services

Nova_A networking is an optional, local-first runtime package. A project does not load it, open a socket, discover peers, contact a service, or start automatically unless the package is installed, networking is enabled, the project permission is granted, and the user enables automatic start or presses Connect. Nova_A provides no mandatory cloud service.

## No implicit network

The package, project toggle, explicit permission and explicit start policy are four separate gates. Their safe defaults are off. Loading an old project, opening Network Studio, running a headless preset, importing a replay or inspecting diagnostics never opens a connection by itself.

## Start a local session

1. Open the bottom panel and choose **Network Studio**.
2. Install **Nova Optional Networking**. Review its runtime purpose before accepting it.
3. In **Session**, enable networking and press **Grant network access**. The main-app confirmation explains that local or explicitly configured connections may be opened.
4. Choose **Local lobby**, give the session and player clear names, choose Client, Server, or Host, and press **Connect**.
5. Start a second player with the same session name and schema. The peer list shows identity, role, and connection time. Local lobby uses only the same-origin `BroadcastChannel`; it is not Internet discovery.

For direct connect, choose WebSocket or native UDP and enter the endpoint explicitly. Native UDP hosts listen at **Bind address** and clients send to **Endpoint**. WebSocket is a client transport and requires a separately operated WebSocket service. Nova_A does not provision, deploy, or contact one.

## Design the protocol

**Reliable ordered** channels retry and acknowledge bounded lifecycle, event, and RPC data. **Unreliable sequenced** channels discard duplicates and older packets, which suits snapshots and recorded input. Every channel has an ID, payload-byte bound, message rate, and priority. Global packet, rate, pending-reliable, retry, and bandwidth limits apply before transport output. Invalid format, protocol, session, schema, channel, sequence, finite-number, depth, collection, and size data fails closed.

Add an RPC contract with a stable name, channel, direction, caller authority, payload schema, byte bound, and rate. Rhai and visual graphs use `network_rpc(name, payload)`; it cannot bypass the declared contract or project permission. `network_enabled`, `network_connected`, `network_is_authority`, `network_peer_count`, `network_local_peer`, `network_role`, and `network_tick` read one callback-boundary snapshot. A received RPC becomes the bounded gameplay signal `network.<rpc-name>` with `payload`, `sender`, and `tick` fields.

Do not place credentials in project networking data. Payload keys such as password, secret, token, API key, authorization, cookie, and private key are rejected from packets, multiplayer replay, saves, and diagnostic capture. Nova_A networking is not an authentication, matchmaking, relay, encryption, NAT traversal, or anti-cheat service; games must add independently reviewed services where those are required.

## Replication, authority, prediction, and rollback

Select a scene object, open **Replication**, and add it explicitly. Choose Server or Owner authority and only the properties required by gameplay: transform, rotation, and velocity. Server/host snapshots own server-authoritative objects; clients may submit owner-authoritative state. Remote values interpolate over the configured window. Predicted values extrapolate velocity and reconcile when position error exceeds the project threshold.

The fixed-step runtime records the exact local `InputSnapshot`, authoritative physics checksum, and replicated snapshot for the rollback window. A conflicting authoritative checksum records a divergence, restores the authoritative state, and counts replayed inputs. Use the Diagnostics counters and replay comparison to locate the first divergent tick. This is deterministic assistance, not a promise that arbitrary scripts, platform clocks, or external services are deterministic.

## Simulate poor links and compare replays

In **Simulation & replay**, enable deterministic latency, jitter, loss, duplication, or reordering and retain the seed. The simulator makes the same decisions for the same ordered packet stream and seed. Record a multiplayer replay while connected; the version-1 document stores protocol/schema identity, bounded per-peer input frames, authoritative checksums, and packet-summary checksums. Select two replay assets and compare them to report the first mismatching tick.

Capture a version-1 multiplayer save only during a connected session. It contains the current tick and explicitly replicated enabled/transform/velocity state, plus a checksum. Restoring validates format, protocol, checksum, bounds, and matching UUIDs before applying state. It does not serialize sockets, endpoints, credentials, secrets, arbitrary local state, or undisclosed entities.

## Late join, reconnect, and diagnostics

Enable **Late join & state handoff** on the authority. A newly discovered peer receives one bounded full replicated-state save. Reconnect uses capped exponential delay and stops at the configured attempt limit. Reliable packets stop after the retry limit rather than growing an unbounded queue.

**Diagnostics** shows byte and packet totals, bandwidth, drops, invalid data, rate limiting, pending/retried reliable messages, late joins, divergences, rollbacks, replayed inputs, events, and a bounded packet timeline. Export creates a local JSON document. Endpoint and bind fields are removed, and secret-shaped values fail validation. Nothing is uploaded.

## Headless authoritative build

Choose the **Headless server** build preset only for a desktop target. Project Health and Build validation require the optional networking package, explicit permission, enabled networking, Server/Host authority, and native UDP. The headless player retains the fixed-step world, input/replay, scripts, replication, diagnostics, and save state while omitting rendering. It does not open a connection unless the project explicitly enables automatic start or its runtime invokes Connect.

## Qualification boundary

The v5.8 local evidence covers two independent localhost processes, UDP protocol messages, reliable ordering, schema/rate/size/secret rejection, deterministic lag/loss decisions, late join, restart/reconnect, replay divergence, multiplayer save integrity, headless validation, and default no-network behavior. Public Internet NAT traversal, hostile-network review, cross-host long soak, production authentication, DDoS resistance, relay infrastructure, independently signed installers, and non-Windows matching-host qualification remain external gates.
