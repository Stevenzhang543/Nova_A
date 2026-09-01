# Nova_A 6.6 headless authority

Engine **6.6.0** · Project Format 2/schema 29 · Network Protocol 2

This reference configures an explicit-permission **Server**, native UDP at `127.0.0.1:45810`, deterministic fixed ticks, no renderer, bounded Protocol 2 messages, late join/save/replay, ownership cleanup and diagnostics. Build Settings selects the registered Windows headless template.

Build on Windows, launch the server, then configure a client copy to `udp://127.0.0.1:45810`. Native UDP is not encrypted; localhost qualification is not evidence for public deployment. Production use needs an independently reviewed encrypted tunnel/adapter, authentication provider, firewall/relay/NAT design and hostile-network review. Web and Android headless builds remain blocked.
