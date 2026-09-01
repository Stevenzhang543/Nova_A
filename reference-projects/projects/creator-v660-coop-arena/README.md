# Nova_A 6.6 co-op arena

Engine **6.6.0** · Project Format 2/schema 29 · Network Protocol 2

This two-player reference is playable and intentionally local-first. Open the project, install/verify Nova Networking, and review its already-saved explicit permission before Play. In Network Studio choose **2 instances → Build and launch**. The first process is Host; the second is Client. Focus either player and use **WASD** or a gamepad Move action. Host input moves the blue Host Player. Client input sends bounded `coop.move` RPCs; host/server moves the orange Client Player and replicates both authoritative transforms/velocities.

Use Orchestration to inspect verified peers, ownership, relevance radius, replication diffs and rollback timeline. Turn on 80 ms latency, 20 ms jitter, 5% loss, 3% reordering and 2% duplication; motion must recover without a fatal error. Stop one client and confirm stale ownership/input/replay state is cleaned. Reconnect/late-join, save/reload, then revoke permission and confirm networking refuses to start while ordinary offline Play still works.

Local lobby discovery is explicit and uses no Nova_A cloud. Internet play requires the user's WSS/reviewed adapter, authentication system, relay/NAT design and security review.
