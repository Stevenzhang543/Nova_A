# Nova_A 26.29 streamed co-op client

Engine **26.29.0** · Project Format 2/schema 29.

Open this project and its opposite-role sibling in two same-origin browser windows. Grant local-session permission in Network Studio and connect both pages. Play both scenes; WASD moves this role. World Studio → Streaming shows the actual Stream Cell active; its separately loaded scene runs StreamReadout.rhai and changes the HUD to “Streamed landmark active | client | peers 1” once the opposite role has joined. Disconnect and reconnect the client to inspect late-join recovery.

Author the cell memory estimate and server-authority settings, save/reopen, enable network auto-start, and build Web. Serve host/client exports under one HTTP origin. Local BroadcastChannel needs no remote backend. This is not Internet multiplayer, full-state rollback, native UDP qualification, or an OS-independent binary.
