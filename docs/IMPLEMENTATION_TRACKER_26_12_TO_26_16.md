# Nova_A 26.12–26.16 implementation and qualification tracker

This task continues the tested 26.11 development checkout. Each version is implemented, audited and snapshotted before the next version is integrated. Outputs belong under `releases/v26.12` through `releases/v26.16`. A source snapshot identifies the actual dirty/untracked authored files; an unrelated Git HEAD is not its source identity.

The complete requirements remain in [the implementation manual](ROADMAP_26_11_TO_26_20.md). This tracker does not narrow them or turn pending work into passes. The release-requirements image was not present in the received message; exact names/formats have been requested. The existing eleven-artifact packaging contract is the provisional preparation baseline.

## Separation and change discipline

- Preserve the 26.11 fixes and all existing project/template identities.
- Record each version's source manifest, changes, implementation consequences, behavioral tests, observed user workflows, performance results and remaining external checks separately.
- Finish a version's source snapshot before integrating later-version edits. Build binaries from that version's sources and verify embedded versions and checksums; do not relabel stale artifacts.
- Keep Graph Format 1, Project Format 2/schema 29 and other frozen APIs unless an explicit, tested migration is required. Additive language metadata must validate and must not silently disappear in a supported save path.
- Every changed authored file must appear in the version's edit ledger. Generated outputs are recorded separately.

## 26.12 — language and conversion

- [x] Span-preserving lexer/parser, shared typed IR, comments/strings/modules/exports/scope/binding identity.
- [x] Editable arrays/maps, access/assignment, functions/returns, branches, operators, supported loops and declared sandbox limits.
- [x] Generated API/node matrix covering actual signatures, overloads, returns/defaults/handles/callbacks/packages.
- [x] Structural/source-backed/unpreservable conversion preview and precise code/graph diagnostics.
- [x] Golden/malformed/truncated/shadowing/recursion/generated corpus and real VM differential values/commands/logs/errors.
- [x] User-built code/visual example, repeated switching, syntax repair, module edits, custom returns, save conflicts and cancellation. Fresh disposable-browser reports record 18 authoring scenarios, seven code-game checks and six blank-visual game checks, including actual file save/reopen and replay; they do not claim every possible interaction combination.
- [x] All21 local gates and the independently verified eleven-artifact26.12 release. Frozen source digest: `0d824ccfc9a79c7800fdec95a4f41bd9282b937172becc31d543cc733b2888a4`; final directory `releases/v26.12`. External gates remain explicit in its evidence.

## 26.13 — graphs and every workspace

- [x] Measured bounds, nested control regions, deterministic disconnected placement, data/wire lanes and reroutes.
- [x] Undoable selected/full layout, retained manual positions/selection/viewport, compact/expanded nodes and searchable symbols.
- [x] Keyboard wiring/navigation, focal zoom, snapping, gesture history and responsive/maximized/restored panels.
- [x] 100/1,000/10,000-node latency, cancellation/worker fallback, cycles/large blocks/nested loops and save/reopen.
- [x] Full SFC conditional/control inventory and development browser dock/locale/scale workflows,177 recorded panel states with zero remaining findings. Physical assistive technology is unavailable and remains external; this does not certify every state combination.
- [x] All21 local gates and the independently verified eleven-artifact26.13 release. Frozen source digest: `9170494e5f33de82367fe32c7bf057317b0d9156ba279ec12b4b1c0e8217554a`; final directory `releases/v26.13`. External gates remain explicit.

## 26.14 — objects, events and dynamic runtime

- [x] Blueprint inheritance/overrides/composition, signals, deferred lifetime and lifecycle ordering.
- [x] Actual Rhai arrays/maps/function values/closures and bounded callback scheduling.
- [x] Shared command/validation ownership for code/graphs/event sheets; debugger/watch/hot-reload/test-runner improvements.
- [x] Ownership/provenance/runtime-versus-authored UI with author navigation.
- [x] Cycles/stale handles/duplicate subscription/nested lifetime/order/rollback/cancellation/play-stop tests.
- [x] Reusable enemy family, instance override, UI/collision connection, pooling, paused hot reload and undo/reopen:8 authoring and5 runtime development workflows,42 introduced layout states. Actual versioned export checks belong to the final production gates below.
- [x] All21 local gates and the independently verified eleven-artifact26.14 release. Frozen source digest: `14c2e47c1a69b005dc6e857a839b2503f8e2e0a21b839831bdc1ec2a28656aa1`; final directory `releases/v26.14`. Earlier client-startup/manual-label failures remain recorded; external gates remain explicit.

## 26.15 — assets and rendering

- [x] Stable reimport identity, folder moves/atlas reorder/missing dependencies, resource inheritance/variants and build closure.
- [x] Actual browser pixel evidence for lighting/normal/shadow/particle/camera/render-texture/material/fallback,36 programmer groups. Matching native rendering/player comparison is part of the production gates below.
- [x] Library previews, requirements/inputs/expected outcomes/manual links; asset browse/preview/details and cancel/recovery.
- [x] Golden imports/failure retention/limits/shader fallback/context loss/bounded cache/deterministic package tests.
- [x]14 actual asset-authoring groups,36 new locale/theme/scale layout states,40 library startup runs and actual lit-template complete Web ZIP/player workflow; corrected UI foundation values have dedicated checks. Final native/export comparisons use the actual15 build below.
- [x] All21 local gates and independently verified eleven-artifact26.15 release. Frozen source digest: `ea991793f21e0afd9d5331b3994aa1d538c99fe70204dd10aee09421b7b78b83`; final directory `releases/v26.15`. Native renderer/actual saved-project native comparison passed. Earlier viewport and audit-peer startup failures remain recorded.

## 26.16 — animation, audio and interface

- [x] Tracks/curves/transitions/blending/rigs/constraints/retargeting/root motion reach runtime evaluation.
- [x] Shared animation/audio/timeline clock, buses/effects/spatial/streaming and scrubbing.
- [x] Responsive themes/localization/IME/accessibility/focus, readable/resizable timeline, modes/routing/meters/anchors/safe area/overflow.
- [x] Fixed-frame/integer-sample timing, boundaries/time scale/pause/seek/loop/end/disposal/captions/fonts, every track/UI field save/export.
- [x] Animated localized menu/cutscene with music/captions/skip, IME, touch/keyboard focus, reopen/export.
- [x] Repeatable final performance measurements, relevant regressions and resource cleanup; no unmeasured “ultimate” claim.
- [ ] Final integrated common/focus/user/native gates and verified release artifacts. Reviewed implementation,32 authoring workflows,54 additional layout surfaces, complete EN/DE/ZH lessons, five references and exhaustive ledger are integrated; exact-source executed gates determine final qualification.

## Consequences assessed before the first 26.12 code changes

The lexer/IR is a new source of syntax truth. Imported scripts must keep exact trivia and evaluation order, particularly integer arithmetic, implicit returns, short-circuiting, exports and scope shadowing. Typed graph nodes will have explicit structural children and editable fields; unsupported syntax must remain visibly source-backed or stop conversion. Existing graph-authored programs retain their compiler path and serialization compatibility. New language metadata must have bounds and explicit validation rather than silent truncation. Release scripts must accept the requested sequential versions above .12 and reject mixed-source/stale binaries.
