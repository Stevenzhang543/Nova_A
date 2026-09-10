# Nova 26.18 Co-op client

Public release **26.18** · Engine **26.18.0** · Project Format 2/schema 29.

This two-player localhost teaching project starts with permission withheld and automatic connection disabled. Grant permission and connect explicitly in each disposable player. Both projects share scene, entity and script identities; their role/player label differs. Additional clients share the Client Player teaching slot; this is not an eight-avatar game.

1. Open the host and client projects in separate players. In Network Studio grant permission explicitly, then connect Host first and Client second. **Expected:** Both share the exact local session name, report distinct peer identities and no mandatory public provider.

2. Play and use WASD or arrow keys in each focused player. **Expected:** Host controls Host Player; Client sends bounded coop.move RPCs for Client Player. Both replicated bodies are visible in both players.

3. Disconnect Client, move Host, reconnect Client, and observe peer and late-join diagnostics. **Expected:** Old queues and peer ownership are cleared. Client restores current replicated state; it does not reset Host to its initial position.

4. In a disposable copy choose owner authority for a replicated object, set an admitted owner identity, and exercise explicit authority transfer. **Expected:** Only the current owner publishes owner state; host relay does not overwrite the owner. Server authority remains the shipped co-op default.

5. Change a custom channel limit, enter an invalid number, repair it, Undo/Redo, then save and reopen. **Expected:** Invalid numeric drafts preserve authored state. Valid settings and replication field selection survive history and reopening.

6. Export both game players with explicit automatic networking enabled and compare their movement; separately export server-v2618-headless-authority on Windows. **Expected:** Games match editor behavior. Server export is a renderer-disabled WebView, with per-player network diagnostics; no windowless-native claim.

Full physics/VM rollback and public internet are not provided by this reference. See docs/MULTIPLAYER_LESSON_26_18.en.md and the separately recorded user audits.
