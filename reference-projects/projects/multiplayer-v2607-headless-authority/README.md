# Nova_A 26.07 headless authority

Engine **26.7.0** · Project Format 2/schema 29 · Network Protocol 2

This reference reuses the co-op world so an exported authority has real scripts, two replicated rigid bodies, an RPC contract, interest data, deterministic inputs/checksums, late join and scene handoff state to serve. It is explicitly configured as a Windows **headless-server**, Server role, Direct session, native UDP on `127.0.0.1:46810`, package enabled and locked, `network.client` plus `network.listen` granted, project permission granted, and auto-start enabled.

Use the matching co-op project as a client on `udp://127.0.0.1:46810`. Native UDP is unencrypted; this is a localhost qualification fixture, not public-deployment guidance. The 26.07 Windows server is a WebView-backed player with its world renderer disabled, not a separately qualified no-window service. The automated local gate requires admission, fixed ticks, authoritative snapshots and reconnect traffic. RPC behavior, graceful service-control shutdown, a signed player-template registry, public relay/NAT, hostile-network review, signing, clean-machine lifecycle, and the 72-hour soak remain separate manual or external gates.
