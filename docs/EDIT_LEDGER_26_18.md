# Nova_A 26.18 edit ledger

Baseline cdfcb3a. No releases or existing authoring features removed. This ledger contains the deterministic path-level manifest of every changed/added authored file. Generated reports/build outputs are separate.

| File | Edit and consequence |
| --- | --- |
| docs/IMPLEMENTATION_TRACKER_26_18.md | Added complete milestone implementation, programmer/user/layout/teaching and eleven-artifact acceptance checklist. Unexecuted gates remain unchecked. |
| docs/VERSION_26_18_MULTIPLAYER.md | Added baseline, active ownership map, initial suspected defects, planned consequences and evidence discipline. No runtime change. |
| docs/EDIT_LEDGER_26_18.md | Added this per-file change record. No runtime change. |
| scripts/verify-v26.18-networking.mjs (planned) | Reproduce reliable send rejection, replay admission and baseline atomicity in real runtime modules before fixes. Programmer fixtures only; failures retained. |

| src/runtime/networking.ts | Stage outgoing sequence numbers until queue admission; prevent rate-refused retries from being replay-poisoned; bind admitted epochs; stage baseline authority validation before entity mutation. Reconnect and broader transport audits remain pending. |
| src/runtime/networkProduction.ts | Validate ownership collection shape, exact bounds and entry types before staging; reject malformed lists atomically. |

The networking regression is now added (not merely planned). Fixture corrections refresh reset settings, use a valid entity UUID and fill the actual queue. Initial failed reports are retained.

| src/runtime/networkServices.ts (planned) | Close a reviewed service handle returned after its opening signal was aborted; prevent late handles from reviving a stopped session. |

Second/third batch additions to networking.ts: guard startup/service awaits and stale callbacks, detach Stop state before awaiting cleanup, enforce incoming replication properties and established authority, synchronize authored ownership edits, block traffic after permission revocation, enforce RPC channel identity, and preserve live reliable queues/time during manual state restoration. networkProduction.ts adds ownership-definition synchronization that preserves unrelated runtime transfers. networkServices.ts planned cancellation fix is now implemented. Regression script now covers 14 cases; failures are retained separately.

| src/runtime/networkProtocol.ts (planned) | Retain bounded expired reliable records for explicit runtime peer-failure cleanup, without changing the existing due-retry return contract. |

Recovery/bounds additions: networking.ts now handles fresh lifecycle epochs with bounded retirement, commits replay nonces only on processing/buffering, holds multi-chunk baseline admission through complete queueing/ACK, validates final baseline before ACK, refuses invalid scenes/unknown replicated identities, sizes escaped chunks and pages large live snapshots fairly with page/deferred counters. networkProduction.ts supports non-committing replay checks. networkProtocol.ts retains bounded expired records and enforces shared payload traversal work. All new error paths are explicit; Protocol 2 is retained.

| src/components/NetworkStudioPanel.vue (planned) | Label and reflow protocol/RPC/replication fields; lazy numeric validation; reconnect and configuration-change behavior; explicit role/server/rollback/instance evidence explanations and replication-page counters. |
| src/editor/networkLabels18.ts (planned) | Add matching EN/DE/ZH workflow labels and localized recovery summaries; keep raw technical diagnostics available separately. |
| src/editor/networkForm18.ts (planned) | Reject invalid numeric drafts during capture before v-model/history/runtime changes, restoring the currently bound authored value. |
UI planned entries are now implemented. Added scripts/verify-v26.18-network-layout.mjs: actual keyboard/mouse numeric-draft checks and six-tab locale/theme/scale/viewport measurements and screenshots. This adds audit coverage only; no production behavior changes.

NetworkStudioPanel.vue: defer normalization/history to nextTick after lazy model change handlers; prevents valid numeric changes reverting. Layout audit fixture corrected to add a custom channel and select RPC card three. Initial failed reports retained.

networkForm18.ts: delay reactive error clearing until after native change dispatch, with revision guard against a newer invalid edit. NetworkStudioPanel.vue: remove obsolete82px field width, constrain two-column tracks and size tabs to their text.

Added scripts/network-peer-v26.18.mjs and scripts/verify-v26.18-network-process.mjs: isolated real UDP process audit using actual startNetworking, populated replicated entity, ownership transfer, late join, reconnect/retired epochs and cleanup under impairment. Adapter metadata belongs only to this disposable fixture; no production provider installed.

networking.ts: owner-mode objects no longer accept host relay corrections while the local peer holds ownership; explicit transfer and server-owned correction remain. Networking regression adds the observed ownership overwrite case. Process fixture now supplies explicit local HMAC test authentication and avoids host loopback; no production authentication provider added.

Added docs/NATIVE_SERVER_ARCHITECTURE_26_18.md: source-grounded current runtime boundary, actual renderer-independent binary design, startup/shutdown/permission/protocol plan, parity/no-GUI gates and complete rewindable/non-rewindable state matrix. Architecture only; no new executable or runtime feature claim.

NetworkStudioPanel.vue: opt its measured grids out of the global narrow-grid fallback using the existing attribute and component-specific class names; place coordinate action below two fields. No global CSS change.

productionRuntime.ts: refresh gameplay RPC bindings when the authored contract-name list changes during ticks. Networking regression now adds/removes a live contract and checks actual gameplay listener delivery.

networkReplay.ts: optional field-mask staging after complete save validation, before atomic parent-first mutation. networking.ts supplies replication masks for late join; manual saves still restore all recorded fields. Focused regression covers velocity-only baseline and preserves position/enabled state.

Added scripts/generate-v26.18-core-references.mjs and its six new reference-projects/projects directories (creator-v2618-code-game, creator-v2618-blocks-game, creator-v2618-mixed-game, server-v2618-headless-authority, multiplayer-v2618-coop-host, multiplayer-v2618-coop-client), each with project.nova, README.md, expected-output.json and test-controls.json. Retains historical inputs and stable linked graph identities; generated references require execution audits.

| package.json | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| Cargo.toml | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| Cargo.lock | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| src-tauri/Cargo.toml | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| src-tauri/Cargo.lock | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| src-tauri/tauri.conf.json | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| src/projects/projectFormat.ts | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| src/i18n.ts | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| crates/nova_format/src/lib.rs | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |
| tests/fixtures/migrations/public-schema-expected.json | Set current26.18/26.18.0 metadata; no dependency or public-schema change. |

Added scripts/lib/networkAudit18.mjs and scripts/verify-v26.18-network-user.mjs: separate same-origin editor pages in one audit browser, genuine file chooser, permission dialog and connect actions. DOM observations and screenshots only; no direct application-state mutation.

Network user audit now covers actual focused keyboard movement on separate co-op bodies and disconnect/rejoin. Same-origin page helper supplies Enter text events consistently with the established audit harness; panel actions use visible maximized controls.

Added complete EN/DE/ZH MULTIPLAYER_LESSON_26_18 workflow lessons and scripts/generate-v26.18-teaching.mjs. Regenerated manual/MANUAL.en.md, manual/MANUAL.de.md, manual/MANUAL.zh-CN.md and manual/index.html with an additive18 lesson, current title and preserved earlier lessons. Documents explicit roles, same-origin limits, property masks, valid/invalid drafts/history, live RPC, reconnect, impairment, exports, diagnostics and rollback/native-server limits.

scripts/lib/browserUserAudit.mjs: capture accepts an optional attached page client, retaining default behavior and adding second-window screenshots to the existing evidence manifest. User audit corrects owner field selector and uses this capture path.

scripts/verify-v26.07-headless.mjs: preserve positive connected/admitted checks; recognize explicit exhausted-retry closure for wrong-session test only withzero pending reliable traffic. Strengthen negative admission to zero received traffic/latejoins and completely unchanged sentinel entities. Report status and pending count.

networking.ts: clear every unadmitted reliable packet on bootstrap exhaustion and suppress due resends after connection failure; focused regression reproduces a later queued packet surviving the original timeout.

generate-v26.18-core-references.mjs and regenerated co-op host/client directories: update stale HUD instructions, add two stable coordinate-label entities and10Hz exported-state Rhai readout callbacks, verify exact structural graph conversion, and correct player names in README/expected controls. Gameplay movement and replicated UUIDs remain.

Added scripts/lib/networkExportAudit18.mjs and scripts/verify-v26.18-network-export-user.mjs: actual UI grants/autostart and Web ZIP downloads, independent package/file hashes and complete scene comparison, then run only extracted downloads in separate same-origin windows and verify live Rhai coordinate readouts and keyboard movement.

Network export user audit now saves the edited project through actual menu/download before comparing exported scenes, so normalized loader defaults are included in the authored baseline. Keeps all entity/component/connection comparison strict; retains downloaded .nova inputs with evidence.

Added scripts/generate-v26.18-field-manual.mjs and docs/NETWORK_FIELD_MATRIX_26_18.md: deterministic inventory of every declared Network Studio model/control and click action, bounds, persistence/history, runtime owning files, applying mechanisms and acceptance evidence. No blanket feature-completeness claim.

NetworkStudioPanel.vue/networkLabels18.ts: permit fractional transient interest coordinates and label X/Y in EN/DE/ZH. Field matrix regenerated with step=any. Layout audit now populates owner and authentication conditional fields; export audit uses explicit keyboard menu activation after closing transient menus.

Network layout audit now covers all three session-role explanations, authored Owner field, RPC card and authentication-hook conditional provider field across432locale/theme/scale/viewport surfaces, plus invalid-then-valid numeric drafts and fractional coordinates. Removed temporary input-event trace instrumentation.

Networking regression records real per-group duration and host identity and adds2000entities ×720updates with a600-frame history bound, measured median/p95/max and heap observations, plus Stop cleanup. This is a networking workload, not a physics/renderer or universal-performance claim.

Added verify-v26.18-focus.mjs and verify-v26.18-authoring.mjs: fresh runtime/process/native/WASM/reference and browser bundles, enforcing six current references and432 layout observations. networkAudit18.mjs now records second-window uncaught exceptions; both co-op audits assert none. Three lessons and generated manuals clarify background-tab suspension and require two rendering windows.

README.md and README.zh-CN.md now identify26.18 and link current multiplayer documentation; historical sections remain. Added RELEASE_NOTES_26_18.md covering fixes, UI, six references, evidence requirements, performance measurement scope and retained external/server/rollback limits.

## Files changed/added — deterministic path-level manifest

This table is relative to baseline cdfcb3a. Earlier paragraphs retain reproduction and intermediate-edit history. No source file was deleted; previous release directories remain untouched. Generated native/Web/WASM outputs are rebuilt and packaged separately; they are not source edits.


Final lifecycle fix: networking.ts failed-start cleanup captures old services before awaiting the old transport and generation-guards recovery. verify-v26.18-networking.mjs adds an actual failed-adapter/slow-close/replacement-service regression. Release notes and implementation journal update28group coverage and preserve candidate1 reproduction. No new source paths.

Additional file scripts/network-peer-v6.6.0.mjs: pace180 exercised ticks at16ms instead of1ms and provide8192Kbit/s instead of1024 for the8-peer connectivity workload. Original oversubscribed failure retained; reliable-expiry/backpressure tests remain strict. Lifecycle fixture identifies the replacement provider after adapter creation (instance2), confirmed against candidate1 snapshot; traced fixed implementation passes.

Export audit reliability: verify-v26.18-network-export-user.mjs uses the documented Ctrl+S shortcut with viewport focus for each authored baseline download. Candidate2 retained a missing Client download with unsaved UI state; separate menu-save user audit passed. Byte/scene comparisons remain unchanged.

Export audit additionally waits for the visible Saved status, cleared dirty marker and finished task before starting Build; download creation precedes completion of the asynchronous save transaction. networkExportAudit18.mjs uses keyboard Project/Build activation and waits for the visible menu. This records completed user operations rather than racing them.

Export replication check now records both live coordinate readouts at100ms intervals for at most5seconds after the existing600ms settling wait, requiring the same0.5-unit agreement and independent movement. Captures/observations are written before assertions, preserving failures. Candidate3 passed both package comparisons but failed the fixed600ms agreement observation; its report is retained.

- `Cargo.lock` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `Cargo.toml` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `crates/nova_format/src/lib.rs` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `docs/EDIT_LEDGER_26_18.md` — Record every edit and this exhaustive path inventory.
- `docs/IMPLEMENTATION_TRACKER_26_18.md` — Track milestone and release requirements; distinguish pending qualification.
- `docs/MULTIPLAYER_LESSON_26_18.de.md` — Add complete localized co-op authoring/export/recovery lesson with tested two-window requirement.
- `docs/MULTIPLAYER_LESSON_26_18.en.md` — Add complete localized co-op authoring/export/recovery lesson with tested two-window requirement.
- `docs/MULTIPLAYER_LESSON_26_18.zh.md` — Add complete localized co-op authoring/export/recovery lesson with tested two-window requirement.
- `docs/NATIVE_SERVER_ARCHITECTURE_26_18.md` — Design renderer-independent server entry point and full rollback parity gates; no unimplemented feature claim.
- `docs/NETWORK_FIELD_MATRIX_26_18.md` — Inventory79 bound controls and33 actions, persistence and runtime ownership.
- `docs/RELEASE_NOTES_26_18.md` — Document current supported behavior, release checks and explicit limits.
- `docs/VERSION_26_18_MULTIPLAYER.md` — Record source ownership, reproduced findings, pre-change consequences and evidence.
- `manual/index.html` — Retain historical teaching; add current EN/DE/ZH multiplayer lesson and26.18 identity.
- `manual/MANUAL.de.md` — Retain historical teaching; add current EN/DE/ZH multiplayer lesson and26.18 identity.
- `manual/MANUAL.en.md` — Retain historical teaching; add current EN/DE/ZH multiplayer lesson and26.18 identity.
- `manual/MANUAL.zh-CN.md` — Retain historical teaching; add current EN/DE/ZH multiplayer lesson and26.18 identity.
- `package.json` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `README.md` — Update current version overview and links; retain historical feature sections.
- `README.zh-CN.md` — Update Chinese version overview and links; retain history.
- `reference-projects/projects/creator-v2618-blocks-game/expected-output.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/creator-v2618-blocks-game/project.nova` — Add separate26.18 project with stable scene/script/graph identities; co-op references include runtime coordinate readouts.
- `reference-projects/projects/creator-v2618-blocks-game/README.md` — Add setup, expected behavior and explicit reference limitations.
- `reference-projects/projects/creator-v2618-blocks-game/test-controls.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/creator-v2618-code-game/expected-output.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/creator-v2618-code-game/project.nova` — Add separate26.18 project with stable scene/script/graph identities; co-op references include runtime coordinate readouts.
- `reference-projects/projects/creator-v2618-code-game/README.md` — Add setup, expected behavior and explicit reference limitations.
- `reference-projects/projects/creator-v2618-code-game/test-controls.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/creator-v2618-mixed-game/expected-output.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/creator-v2618-mixed-game/project.nova` — Add separate26.18 project with stable scene/script/graph identities; co-op references include runtime coordinate readouts.
- `reference-projects/projects/creator-v2618-mixed-game/README.md` — Add setup, expected behavior and explicit reference limitations.
- `reference-projects/projects/creator-v2618-mixed-game/test-controls.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/multiplayer-v2618-coop-client/expected-output.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/multiplayer-v2618-coop-client/project.nova` — Add separate26.18 project with stable scene/script/graph identities; co-op references include runtime coordinate readouts.
- `reference-projects/projects/multiplayer-v2618-coop-client/README.md` — Add setup, expected behavior and explicit reference limitations.
- `reference-projects/projects/multiplayer-v2618-coop-client/test-controls.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/multiplayer-v2618-coop-host/expected-output.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/multiplayer-v2618-coop-host/project.nova` — Add separate26.18 project with stable scene/script/graph identities; co-op references include runtime coordinate readouts.
- `reference-projects/projects/multiplayer-v2618-coop-host/README.md` — Add setup, expected behavior and explicit reference limitations.
- `reference-projects/projects/multiplayer-v2618-coop-host/test-controls.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/server-v2618-headless-authority/expected-output.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `reference-projects/projects/server-v2618-headless-authority/project.nova` — Add separate26.18 project with stable scene/script/graph identities; co-op references include runtime coordinate readouts.
- `reference-projects/projects/server-v2618-headless-authority/README.md` — Add setup, expected behavior and explicit reference limitations.
- `reference-projects/projects/server-v2618-headless-authority/test-controls.json` — Add machine-readable expected outcomes or actual-user controls for this reference.
- `scripts/generate-v26.18-core-references.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/generate-v26.18-field-manual.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/generate-v26.18-teaching.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/lib/browserUserAudit.mjs` — Allow screenshot capture of a second real page client; preserve default capture behavior.
- `scripts/lib/networkAudit18.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/lib/networkExportAudit18.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/network-peer-v26.18.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/network-peer-v6.6.0.mjs` — Pace the retained connectivity workload at16ms per tick and8192Kbit/s for8peers; preserve bounded retry/backpressure tests and the original oversubscription failure.
- `scripts/verify-v26.07-headless.mjs` — Require unchanged sentinel state and empty queues when wrong-session bootstrap retries close; report status explicitly.
- `scripts/verify-v26.18-authoring.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/verify-v26.18-focus.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/verify-v26.18-network-export-user.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/verify-v26.18-network-layout.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/verify-v26.18-network-process.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/verify-v26.18-network-user.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `scripts/verify-v26.18-networking.mjs` — Add26.18-specific generator or fresh runtime/process/browser audit; retain exact inputs, outcomes and evidence boundaries.
- `src-tauri/Cargo.lock` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `src-tauri/Cargo.toml` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `src-tauri/tauri.conf.json` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `src/components/NetworkStudioPanel.vue` — Responsive labeled cards, role/recovery/limits/diagnostics, live connection-identity reset, valid numeric history and fractional coordinates.
- `src/editor/networkForm18.ts` — Reject invalid numeric drafts before mutation; defer validation-message cleanup until event completion.
- `src/editor/networkLabels18.ts` — Add EN/DE/ZH field, role, limit and recovery labels.
- `src/i18n.ts` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `src/projects/projectFormat.ts` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.
- `src/runtime/networking.ts` — Fix reliable admission/replay/epoch/cleanup, cancelled startup, authority/live edits/RPC channel/permissions, atomic chunked masked baseline, paged snapshots and hierarchy interpolation. Preserve live queues/time during manual restoration.
- `src/runtime/networkProduction.ts` — Validate atomic ownership restore, synchronize authored ownership and preview replay admission.
- `src/runtime/networkProtocol.ts` — Bound expired retry records and payload traversal work.
- `src/runtime/networkReplay.ts` — Apply selected replicated property masks to validated baseline restore; preserve full manual-save restore.
- `src/runtime/networkServices.ts` — Close a provider handle that resolves after cancellation.
- `src/runtime/productionRuntime.ts` — Refresh gameplay RPC bindings after authored names change.
- `tests/fixtures/migrations/public-schema-expected.json` — Update Nova_A machine/public version to26.18.0/26.18 only; retain dependency versions and public schema.

Release-format correction: this final inventory uses the exact unique path-list format required by the independent package verifier. Earlier edit/reproduction history remains intact; no engine behavior changed.
