# Network runtime and delivery contract — 26.29

The networking runtime retains optional local/direct sessions, explicit permission, reviewed service/transport/authentication adapters, RPC declarations, bounded reliable delivery, replay protection, entity authority transfer, interest filtering, late-join baselines, reconnect, transform prediction/correction and diagnostic replay/save tools. This release closes a WebSocket lifecycle defect and makes the recovery/freshness contract visible. It does not turn the existing transform correction into complete deterministic game rollback.

## Files changed/added

- `src/runtime/networking.ts` — one-shot WebSocket opening completion shared by open/error/early close/timeout/explicit stop; cancel opening immediately on stop; detach socket handlers before close; record the monotonic application time, tick and sender of accepted authorized entity snapshot packets; clear those diagnostics on session reset/stop. No packet/schema or saved-project format change.
- `src/components/NetworkStudioPanel.vue` — expanded Diagnostics recovery-contract card with accepted snapshot age/tick/authority peer; accurately label the existing replay counter as reapplied transform frames; update age only while the diagnostic page is open and a snapshot exists; release its sole timer on tab/session changes and unmount. Existing ownership UI remains intact.
- `src/editor/networkCopy29.ts` — EN/DE/ZH text for recovery scope, snapshot age and exclusions, resolved from the current editor locale.
- `scripts/verify-v26.29-network.mjs` — five focused actual-module checks and a versioned JSON report. Host socket events are fixtures; connection startup/stop and packet processing are production code.
- `docs/NETWORK_26_29.md` — path ledger, user consequences, supported recovery contract, independent reference findings, targeted test results and remaining boundaries.

## Consequences and lifecycle

Previously, a socket closing before `open`, or Stop during an unfinished handshake, left the opening Promise and its ten-second timeout pending. Explicit close retained callbacks. Now all terminal paths settle once and clear the timeout, and Stop nulls all socket callbacks before closing. Old connection-generation guards remain; a late event cannot reopen or reconnect a stopped session. Errors after successful connection still notify the session so its configured reconnect policy can act.

The diagnostic snapshot age is local monotonic elapsed milliseconds since the latest authorized `snapshot` packet containing an applicable declared entity field was processed. It is not remote-clock latency, per-entity completeness or whole-world synchronization. An unauthorized sender, duplicate/reordered packet, unknown entity or packet with no applicable fields does not refresh it. The field is cleared on a new session or Stop. Late-join save baselines and manual save restoration are distinct operations and do not pretend to be snapshot-packet arrivals. Ownership is still shown separately per entity in Orchestration; the displayed last authority peer is just the sender of that last applicable snapshot.

## Exact recovery contracts

| Operation | Actual retained/restored state | Boundaries |
| --- | --- | --- |
| Authoritative correction | Declared replicated world position, rotation and linear velocity; local recorded transform deltas after the authoritative tick; configured interpolation/prediction | No solver/input/VM resimulation; missing matching base frame falls back to authoritative state with zero reapplied frames. History is bounded by configured 0–600 frames. |
| Manual `rollbackSnapshot` | Nearest recorded frame at or before the requested tick, restoring declared position/rotation/velocity parent-first | Clears local transform history, queued remote snapshots and interpolation targets. A live connection keeps its current network tick; it does not rewind transport sequences/epochs or replay side effects. |
| Multiplayer save/import | Enabled state, world position/rotation/scale, linear/angular velocity for known entities, with compatibility/schema/session checks and staged parent-first application | Not a serialized entire game/VM/physics-world checkpoint. Late-join baseline property masks restrict applicable fields. |
| Multiplayer replay | Tick-indexed peer input frames and authoritative/packet checksums; bounded validation, divergence comparison and callback-driven playback | A checksum/input log does not by itself prove complete deterministic world restoration. Actual solver and script equivalence require a separate complete simulation contract. |
| Reliable delivery/reconnect | Channel ordering, acknowledgement/retry windows, bounded queues, peer ownership/admission, fresh session epochs and stale-epoch rejection | Local/direct transport requires its declared host/service; built-in UDP is not encrypted. Reviewed authentication is only as trustworthy as its supplied implementation. |

Complete deterministic rollback would additionally require an atomic checkpoint of entity creation/deletion and component inventory; hierarchy and world streaming state; physics body/shape/joint state, contacts, warm-start/solver caches and sleeping islands; script VM globals/heaps/coroutines/timers; deterministic RNG seeds/counters; animation/controller/timeline clocks and event-fired sets; AI/navigation jobs; gameplay resources and authored mutable state; peer ownership/input queues and tick authority. It also needs deterministic resimulation and a commit-only side-effect journal for audio, file writes, UI notifications, outbound network operations and external service calls. Reapplying transform differences cannot establish those guarantees. Nova does not claim to have this full checkpoint/journal contract in 26.29, and no existing subsystem was removed to disguise that limitation.

## Reference review

Read local `godot-master/modules/multiplayer/scene_multiplayer.cpp` peer admission/disconnection: pending authentication is removed separately, replication/cache owners receive the peer-removal notification, and connected-peer state is erased. Read `godot-master/modules/multiplayer/scene_replication_interface.cpp::on_reset`: remote objects and peer information are released and synchronizer network IDs reset. These support explicit session ownership and symmetric cleanup as design criteria. No Godot source was copied and this review does not claim Godot multiplayer/rollback parity.

## Executed targeted tests

Development source at engine 26.29.0 on 2026-09-26:

- `node scripts/verify-v26.29-network.mjs` — **5/5 passed**: early remote close; stop while opening; normal connection cleanup and stale close; authorized snapshot diagnostics with duplicate/reorder rejection/reset; exact transform-delta result/missing-base fallback and all three locales. Report: `release-audits/v26.29-network.json`.
- `node scripts/verify-v26.18-networking.mjs --qualification-release=26.29` — **28/28 passed** against current modules, retaining the 26.18 regression identity. Includes protocol bounds, admission/authentication, anti-replay, reliable delivery, authority, save/replay, baseline, hierarchy correction, paged replication and disconnect/runtime checks. Report: `release-audits/v26.29-networking.json`.
- `node scripts/verify-v26.18-network-process.mjs --qualification-release=26.29` — **4/4 passed**, three independent Node processes and real localhost UDP with deterministic impairment: populated late join; authority transfer/owner transform; third-peer current baseline; disconnect/reconnect and retired-epoch rejection. All process cleanup checks passed. Report: `release-audits/v26.29-network-process.json`.

The first new fixture run failed on its incorrect `body.position` accessor and an arbitrary minimum Chinese-text character count; corrected to the actual `body.transform.position` and a language-neutral nonempty-content bound. Original failure remains `.cache/v2629-network.log`; passing run `.cache/v2629-network-second.log`. No product behavior was changed to satisfy those fixture errors.

Final freeze qualification must execute the selected scripts against the final source/build; these development results do not replace it. Parent UI/build checks cover actual Vue presentation. No claim is made for public internet service availability, TLS deployment/certificates, adversarial security certification, physical network devices, or other operating-system binaries from these local tests.

## Stream-scene export validation fix

The actual streamed-world browser export found a valid network entity in an included but unloaded authored scene blocked by `NET-REPLICATION-ENTITY`. The validator previously searched only the loaded physics world. This prevented export before the otherwise working streaming/late-join runtime could run.

- `src/runtime/productionValidation.ts` — resolve network bindings against included build scenes. Use current live entities for the active scene, including unsaved additions and deletions, and stored authored entities for inactive scenes. A declared scene UUID must exist, be included, and own the entity. An omitted scene UUID requires one unique included owner. Missing targets, excluded scenes, wrong scene declarations and ambiguous global entity UUIDs remain errors. During play, loaded stream members retain their authored ownership; genuinely duplicated active authored UUIDs remain ambiguous. Existing replication-definition, owner and interest checks are retained. No project schema or runtime packet change.
- `scripts/verify-v26.29-stream-build.mjs` — new targeted integration test loads the actual streamed host reference project and calls `validateProductionRuntime`, the validator used by the build/UI path, using real scene/build/editor/asset state and bundled physics WASM.

`node scripts/verify-v26.29-stream-build.mjs --qualification-release=26.29` passed **7/7** development checks: included unloaded target; excluded/missing scene; wrong scene/missing entity; unique versus ambiguous owner; unsaved active additions/deletions; genuine authored duplicates during play; and legitimate loaded stream ownership during play. Report: `release-audits/v26.29-stream-build.json`; latest log: `.cache/v2629-stream-build-second.log`. The final product edit preceded this passing run. Browser export must use a rebuilt bundle containing the fix, and final release qualification must bind the selected checks to the frozen source/build.
