# Nova_A 26.18 networking field and binding matrix

Generated from the actual NetworkStudioPanel.vue controls. This inventory describes bindings and validation; execution evidence remains in the separate programmer and actual-user audits. Schema29 and Protocol2 are retained.

## Shared authoring path

Persistent controls update productionSettings and commit through normalization and project history. Number drafts use capture validation before lazy model assignment; invalid drafts restore the bound authored value. Save/reopen uses production settings serialization. Connection-identity edits stop the current transport and require Reconnect; live ownership/property and RPC changes are synchronized on runtime updates. Transient selectors and actions do not pretend to be saved project fields.

| Binding | Control | Minimum | Maximum | Step | Persistence/history | Source line |
| --- | --- | --- | --- | --- | --- | --- |
| settings.networking.enabled | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 17 |
| settings.networking.autoStart | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 20 |
| settings.networking.sessionMode | select |  |  |  | Project settings; normalize / Undo / save / export | 21 |
| settings.networking.role | select |  |  |  | Project settings; normalize / Undo / save / export | 22 |
| settings.networking.sessionName | input |  |  |  | Project settings; normalize / Undo / save / export | 24 |
| settings.networking.playerName | input |  |  |  | Project settings; normalize / Undo / save / export | 25 |
| settings.networking.maxPeers | number | 1 | 64 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 26 |
| settings.networking.transport | select |  |  |  | Project settings; normalize / Undo / save / export | 32 |
| settings.networking.transportAdapterId | select |  |  |  | Project settings; normalize / Undo / save / export | 33 |
| settings.networking.endpoint | input |  |  |  | Project settings; normalize / Undo / save / export | 34 |
| settings.networking.bindAddress | input |  |  |  | Project settings; normalize / Undo / save / export | 35 |
| settings.networking.reconnect | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 37 |
| settings.networking.reconnectMaxAttempts | number | 0 | 32 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 38 |
| settings.networking.lateJoin | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 39 |
| settings.networking.services.identityProviderId | select |  |  |  | Project settings; normalize / Undo / save / export | 56 |
| settings.networking.services.lobbyProviderId | select |  |  |  | Project settings; normalize / Undo / save / export | 57 |
| settings.networking.services.relayProviderId | select |  |  |  | Project settings; normalize / Undo / save / export | 58 |
| channel.id | input |  |  |  | Project settings; normalize / Undo / save / export | 72 |
| channel.delivery | select |  |  |  | Project settings; normalize / Undo / save / export | 73 |
| channel.maximumPayloadBytes | number | 32 | 65507 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 74 |
| channel.messagesPerSecond | number | 1 | 2000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 75 |
| channel.priority | number | 0 | 100 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 76 |
| settings.networking.maximumPacketBytes | number | 512 | 65507 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 82 |
| settings.networking.maximumMessagesPerSecond | number | 1 | 10000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 83 |
| settings.networking.maximumPendingReliable | number | 1 | 4096 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 84 |
| settings.networking.reliableRetryMs | number | 10 | 5000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 85 |
| settings.networking.reliableMaximumAttempts | number | 1 | 32 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 86 |
| settings.networking.bandwidthKbps | number | 8 | 1000000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 87 |
| rpc.name | input |  |  |  | Project settings; normalize / Undo / save / export | 92 |
| rpc.channelId | select |  |  |  | Project settings; normalize / Undo / save / export | 93 |
| rpc.direction | select |  |  |  | Project settings; normalize / Undo / save / export | 94 |
| rpc.authority | select |  |  |  | Project settings; normalize / Undo / save / export | 95 |
| rpc.payloadSchema | select |  |  |  | Project settings; normalize / Undo / save / export | 96 |
| rpc.maximumPayloadBytes | number | 2 | 65507 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 97 |
| rpc.callsPerSecond | number | 1 | 1000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 98 |
| settings.networking.snapshotRate | number | 1 | 120 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 109 |
| settings.networking.interpolationMs | number | 0 | 2000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 110 |
| settings.networking.rollbackFrames | number | 0 | 600 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 111 |
| settings.networking.reconciliationThreshold | number | 0 | 1000 | .01 | Project settings; normalize / Undo / save / export | 112 |
| definition.authority | select |  |  |  | Project settings; normalize / Undo / save / export | 118 |
| definition.ownerPeerId | input |  |  |  | Project settings; normalize / Undo / save / export | 119 |
| definition.properties | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 120 |
| definition.properties | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 120 |
| definition.properties | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 120 |
| definition.interpolate | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 121 |
| definition.predict | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 122 |
| definition.alwaysRelevant | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 123 |
| definition.interestRadius | number | 0 | settings.networking.interest.maximumRadius | 0.1 | Project settings; normalize / Undo / save / export | 124 |
| settings.networking.authentication.mode | select |  |  |  | Project settings; normalize / Undo / save / export | 133 |
| settings.networking.authentication.providerId | input |  |  |  | Project settings; normalize / Undo / save / export | 134 |
| settings.networking.authentication.requireVerifiedPeers | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 135 |
| settings.networking.security.requireEncryption | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 136 |
| settings.networking.security.maximumPacketAgeMs | number | 1000 | 120000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 137 |
| settings.networking.security.replayWindow | number | 64 | 16384 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 138 |
| settings.networking.interest.enabled | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 143 |
| settings.networking.interest.defaultRadius | number | 0 | 1000000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 144 |
| settings.networking.interest.maximumRadius | number | 1 | 1000000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 145 |
| interestX | number |  |  | any | Panel selection or command input; not project history | 146 |
| interestY | number |  |  | any | Panel selection or command input; not project history | 146 |
| settings.networking.allowAuthorityTransfer | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 151 |
| authorityEntity | select |  |  |  | Panel selection or command input; not project history | 152 |
| authorityPeer | select |  |  |  | Panel selection or command input; not project history | 153 |
| settings.networking.allowSceneHandoff | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 159 |
| handoffScene | select |  |  |  | Panel selection or command input; not project history | 160 |
| handoffPeer | select |  |  |  | Panel selection or command input; not project history | 161 |
| handoffSpawnTag | input |  |  |  | Panel selection or command input; not project history | 162 |
| settings.networking.multiInstance.peerCount | number | 2 | 8 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 168 |
| settings.networking.multiInstance.separateLogs | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 170 |
| settings.networking.multiInstance.separateInspectors | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 171 |
| settings.networking.simulation.enabled | checkbox |  |  |  | Project settings; normalize / Undo / save / export | 212 |
| settings.networking.simulation.latencyMs | number | 0 | 10000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 213 |
| settings.networking.simulation.jitterMs | number | 0 | 10000 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 214 |
| settings.networking.simulation.lossPercent | number | 0 | 100 | .1 | Project settings; normalize / Undo / save / export | 215 |
| settings.networking.simulation.duplicatePercent | number | 0 | 100 | .1 | Project settings; normalize / Undo / save / export | 216 |
| settings.networking.simulation.reorderPercent | number | 0 | 100 | .1 | Project settings; normalize / Undo / save / export | 217 |
| settings.networking.simulation.seed | number | 0 | 4294967295 | 1 (HTML default) | Project settings; normalize / Undo / save / export | 218 |
| replayA | select |  |  |  | Panel selection or command input; not project history | 223 |
| replayB | select |  |  |  | Panel selection or command input; not project history | 224 |
| saveAsset | select |  |  |  | Panel selection or command input; not project history | 231 |

## Runtime ownership by group

| Group | Applying code and limits |
| --- | --- |
| Session / permission / identity / transport | productionRuntime.ts optional-package gate; networking.ts startup, generation checks, peer/session identity and permission enforcement; networkServices.ts optional reviewed provider lifecycle. |
| Channels / RPC contracts / security | production.ts normalization, networkProtocol.ts payload/rate/reliable bounds, networking.ts channel identity/admission/authentication/epoch/ACK processing. productionRuntime.ts refreshes live RPC listener names. A generic object schema still requires game-specific validation. |
| Replication / owner / fields | networkProduction.ts authority synchronization and transfer; networking.ts fair bounded snapshots, parent-first field correction/interpolation and reconnect cleanup; networkReplay.ts atomic masked baseline restoration. |
| Interest / scene handoff | networking.ts bounded spatial interest and admitted authority handoff; productionRuntime.ts and GameplayRuntime.ts forward scene transitions. Interest coordinates are transient commands; definitions and radius settings persist. |
| Simulation / replay / save | networkProtocol.ts deterministic impairment, networkReplay.ts bounded replay/save and checksums, networkRollback.ts recorded transform-delta replay. Full physics/VM/external-effect rollback is unsupported. |
| Multiple instances / logs / Inspector | NetworkStudioPanel.vue builds/launches native players through Tauri commands and associates exact instance IDs. Editor logs describe editor observations; process metadata is not live world inspection. PlayerApp.vue exposes the launched player network view. |
| Diagnostics / export | networking.ts bounded event/packet/history counters; networkReplay.ts diagnostic redaction; gameExporter.ts/buildSettings.ts explicit target/permission/runtime prerequisites. Snapshot counters describe the most recent target, not all peers combined. |

## Actual visible actions

Every click binding present in the panel is listed below. Session and native process actions retain their permission/prerequisite checks; build/launch/stop controls are unavailable in an ordinary browser.

- `activeTab = tab.id`
- `installNetworking`
- `grantPermission`
- `revokePermission`
- `connect`
- `reconnect18`
- `disconnect`
- `hostLocalLobby`
- `discoverLocalLobbies`
- `joinLocalLobby(lobby.sessionName)`
- `addChannel`
- `removeChannel(channel.id)`
- `addRpc`
- `removeRpc(rpc.name)`
- `replicateSelected`
- `removeReplication(definition.entityUuid)`
- `publishInterest`
- `transferAuthority`
- `handoffSceneToPeer`
- `setPeerCount(count)`
- `buildAndLaunchInstances`
- `refreshLaunchedInstances`
- `stopLaunchedInstances`
- `openInstanceLogs(instance)`
- `openInstanceInspector(instance)`
- `stopNetworkInstance(instance)`
- `selectedInstanceId = ''`
- `recordReplay`
- `finishReplay`
- `compareReplays`
- `captureSessionSave`
- `restoreSessionSave`
- `downloadDiagnostics`

## Acceptance evidence

Programmer: verify-v26.18-networking.mjs reproduces sequencing, replay, ownership, cancellation, malformed baseline, field masks, reliable exhaustion, payload work bounds,2000entity pages, hierarchy and live RPC behavior. verify-v26.18-network-process.mjs runs actual separate UDP processes with impairment and populated state. The common exported authority audit exercises actual Windows output and rejected-session cleanup.

User: verify-v26.18-network-user.mjs uses separate visible browser windows, permission dialogs, keyboard movement, disconnect/rejoin, late-join state, owner edits, Undo/Redo and saved project reopening. verify-v26.18-network-export-user.mjs downloads actual Web outputs and checks byte/scene equality and live player behavior. verify-v26.18-network-layout.mjs measures controls across locale/theme/scale/width. These tests qualify their observations; they do not prove all possible projects or hardware are error-free.

Teaching: MULTIPLAYER_LESSON_26_18.en.md, .de.md and .zh.md; NATIVE_SERVER_ARCHITECTURE_26_18.md defines the renderer-disabled server and non-rewindable state boundaries.
