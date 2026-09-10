# Nova_A 26.18 release notes

Engine **26.18.0**, Project Format **2**, public schema **29**, Network Protocol **2**. This separate multiplayer milestone preserves earlier releases, all40 library starters and the public contracts.

## Multiplayer behavior

Reliable sequences are allocated after admission; size, bandwidth and window refusals cannot leave an unsent ordered gap. Temporary receive refusal does not consume replay admission. Retry exhaustion removes the failed peer and clears pending bootstrap traffic with an actionable reason. Session epochs reject retired identities within bounded history. Permission revocation stops traffic; RPC delivery obeys its authored channel, and live RPC-name edits refresh gameplay bindings.

Startup, adapter callbacks and optional service completion respect cancellation. Late join validates bounded escaped chunks, checksum, scene/entity identity and ownership before atomic restoration, and defers gameplay until every baseline chunk is acknowledged. Invalid completion is not acknowledged. Snapshot pages cover the supported2000 replicated entities without exceeding packet/collection bounds; the configured cadence is per page, so larger worlds take multiple intervals.

Authored authority edits apply live; unrelated property edits preserve explicit runtime ownership transfer. Unassigned owner objects cannot be moved by arbitrary clients. Local owners retain their movement against host relay snapshots. Position, rotation and velocity masks apply to snapshots and late-join baseline. Parent-first world correction and velocity interpolation preserve hierarchy. Manual save restoration retains the live network clock and reliable queues.

## Editor and teaching

Network Studio uses labeled responsive channel, RPC and replication cards, readable tabs, explicit Host/Client/Server explanations, reconnect, and packet/page diagnostics. Invalid numeric drafts preserve the authored value; valid edits participate in Undo/Redo. Fractional transient interest coordinates are accepted. Connection-identity edits stop the old session before reconnect. EN/DE/ZH instructions distinguish editor-observed instance logs and metadata from an external process debugger.

Six current references are separate: Code/Blocks/Mixed Coin Trail, native renderer-disabled authority, and co-op Host/Client. The co-op pair exposes distinct HostPlayer/ClientPlayer controls and10Hz Rhai coordinate readouts in the exact exported players. Keep both local windows rendering; browsers can suspend background tabs. Extra clients share the teaching ClientPlayer slot; this is a two-player reference, not a general lobby allocator.

Complete lessons: [English](MULTIPLAYER_LESSON_26_18.en.md), [Deutsch](MULTIPLAYER_LESSON_26_18.de.md), [中文](MULTIPLAYER_LESSON_26_18.zh.md). [Declared-field and action inventory](NETWORK_FIELD_MATRIX_26_18.md) records persistence, bounds and runtime bindings; [edit ledger](EDIT_LEDGER_26_18.md) lists every changed source file.

## Qualification and performance

The release plan requires all21 common production gates plus fresh26.18 focus and authoring bundles tied to the frozen source. Focus includes28 networking regressions, real independent UDP processes with loss/duplicates/reordering, late join, owner transfer, reconnect and cleanup, inherited2/4/8-process checks, and compiled native/WASM/Rhai and graph compatibility. User checks cover two real browser windows, independent player movement, disconnect/rejoin, owner editing, Undo/Redo, save/reopen, exact downloaded Web packages and live exported players. The changed-panel matrix has432 locale/theme/scale/viewport surfaces plus numeric interaction checks. Native exported authority is exercised through actual localhost UDP admission/reconnect and negative policy/corruption/session cases.

The focus report measures2000 entities across720 updates with600 retained history frames, including median/p95/max duration and host identity. Stop must clear history and pending traffic. This workload measures networking and transform history, includes allocation/GC and machine load, and excludes the physics solver and renderer. It does not promise universal frame rates or a long-soak memory result. Fresh numerical results and screenshots reside in the packaged evidence; intermediate failures remain in the workspace.

## Explicit boundaries

Full simulation rollback remains unavailable: transform history does not rewind arbitrary Rhai state, physics internals, audio, files or external effects. [Native server architecture](NATIVE_SERVER_ARCHITECTURE_26_18.md) designs a renderer-independent entry point and its parity gates. The shipped renderer-disabled server still uses a Tauri/WebView process; it is not a GUI-free CLI server.

Local lobby requires matching origin/profile/storage partition. Public relay, matchmaking, NAT and authentication providers remain optional and require real infrastructure and separate qualification. Checksums and lifecycle epochs are not cryptographic authentication. Native GUI automation was unavailable on this host; browser input evidence is labeled accordingly. Independent accessibility/security review, signing and disposable install/uninstall, matching-host platforms, public-network trials and real-duration soak remain external.

Packaging requires exactly11 files under releases/v26.18 and independent checksum/source/build/evidence verification. This source document defines the release contents; only the final executed-gates and package-verification reports establish completion.
