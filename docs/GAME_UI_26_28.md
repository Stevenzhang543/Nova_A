# Game UI production closure — 26.28

This change preserves the existing component/schema, UUID references, layout solver, native input bridge, text shaping path, theme inheritance and serialized event names. It fixes observable input/rendering defects rather than introducing a parallel editor-only menu implementation. The editor Game view and exported player import the same `GameUiRuntime`.

## Files changed/added

- `src/runtime/gameUi.ts` — reconcile interaction owners after modal scope, visibility or interactivity changes; cancel stale presses, drags and input remapping; clear stale text ownership; track stick edges per controller and remove disconnected records; mirror slider/progress fill and slider handle consistently with existing RTL pointer values; share keyboard/controller slider adjustment with RTL screen-direction semantics; localize accessibility description/state/value and tooltip shorthand using the current control locale.
- `scripts/verify-v26.28-game-ui.mjs` — run six change-linked checks against bundled current runtime/components/layout/localization/native bridge modules; emit versioned machine-readable evidence and nonzero exit on failure. Canvas commands and Gamepad API snapshots are controlled fixtures, explicitly not physical-device qualification.
- `docs/GAME_UI_26_28.md` — consequences, reference comparison, verification instructions and remaining narrower contracts.

## User-visible consequences

Opening a modal, hiding/removing a focused control, or disabling it can no longer leave that control accepting background keyboard activation. A remapping button behind a new modal cannot capture the next key. Native IME composition remains native: unfinished composition is neither submitted nor interpreted as Enter activation. If focus becomes invalid, navigation starts from the next explicit user navigation action; the engine does not invent a modal autofocus target.

A held stick on controller one moves focus once even when controller two is connected and idle. Disconnected controller edge state is discarded. Horizontal D-pad/stick and keyboard arrows adjust a focused slider using the same change callback. In RTL, right moves the handle right and decreases the value; pointer input, handle and filled region now agree. Up/down retain spatial navigation. Existing one-edge-per-deflection behavior remains; there is no newly claimed hold-repeat acceleration.

Whole-label `{key}` shorthand now also applies to tooltip text and authored accessibility descriptions, state and value. EN/DE/ZH language changes are evaluated on the next render, and missing translations use the existing source-locale fallback. Password values continue to be masked. Literal prose and dynamic author content are not guessed or machine-translated; missing keys without any authored/source fallback remain diagnosable rather than being silently deleted.

## Targeted reference review

Read local `godot-master/scene/gui/control.cpp` around `Control::set_focus_mode` and focus-owner scope logic: Godot releases invalid focus rather than keeping a removed focus owner. Nova now likewise validates current modal/visibility/interactivity scope before accepting interaction. Read `godot-master/scene/gui/line_edit.cpp` IME activation/position ownership; Nova retains its native HTML input bridge for browser selection/composition rather than reimplementing an OS IME in a canvas. These are behavioral comparisons, not copied source or a claim of Godot Control/TextServer parity.

The broader typography contract still uses the browser shaping/font stack, grapheme-aware layout and authored font fallback. It is not Godot's independent TextServer. Real font availability, OS IME candidate placement, physical controllers, iPhone touch and screen-reader speech require actual matching devices. No external device results are inferred from the module fixtures.

## Executed checks

Run `node scripts/verify-v26.28-game-ui.mjs` (also accepts the parent gate's unused `--qualification-release=26.28`). The report is `release-audits/v26.28-game-ui.json` with engine version, timestamp, six individual outcomes and precise scope.

1. Open a modal while an underlying button owns focus and an input-remap session; background activation/remap stays blocked and foreground event binding remains operational.
2. Disable a focused text input; reject stale scene commits, navigate to the next button, and retain composing Enter/Unicode commitment through the real native bridge.
3. Feed two controller snapshots repeatedly; one held stick moves once despite another idle pad, and disconnect/reconnect produces a fresh edge.
4. Feed RTL pointer endpoints and inspect the actual runtime handle drawing coordinates and endpoint values.
5. Send RTL keyboard and controller direction input; inspect slider values and exact `on_value_changed` dispatch count.
6. Switch EN/DE/ZH on the same runtime instance; inspect accessibility strings and actual tooltip draw text, including source fallback.

All six passed in development on 2026-09-26. The final release gate must rerun them on the frozen source; development results do not substitute for release evidence. Initial host-fixture failures (missing navigator.platform, omitted asset generation invalidation, and preview intentionally suppressing tooltips) remain in `.cache/v2628-game-ui*.log`; corrections were to fixture setup, not assertions or product behavior.

The parent release workflow separately exercises real browser IME/touch/keyboard, authored menu/captions/music save/reopen/export and localized panel layout. These module results alone do not establish those outcomes. No unrelated full-template or cross-platform audit is required by these localized runtime changes.

## Media binding/history acceptance

Additional source path: `scripts/verify-v26.28-media-bindings.mjs` — nine bounded checks against actual AssetDatabase import pipeline, physics history transactions, project serializer/loader and runtime readers. Run `node scripts/verify-v26.28-media-bindings.mjs`; output is `release-audits/v26.28-media-bindings.json`.

The current `creator-v2628-animated-menu` reference supplies animation, timeline, music and source-locale assets. For each of these four types, the test renames through `renameAsset` inside `beginHistoryTransaction`/`commitHistoryTransaction`, then calls actual Undo and Redo. It next replaces source bytes through `reimportAsset` with a real File and the actual import pipeline, then undoes/redoes and checks exact old/new source, UUID, path, import settings and artifact SHA-256. After every operation it compares full serialized scenes, timeline animation/music references, animation property and target UUID. This retains authored event action bindings as well as displayed content.

The ninth check saves and reopens the complete project through `getSceneJSON`/`loadProject`, checks all four final sources, runs actual animation/timeline/localization readers, then seeks the retained title animation at one second and verifies the actual target Text opacity is exactly 62.5. Nine checks passed in development on 2026-09-26. The first attempt used the wrong fixture field `targetEntity` rather than the actual `targetEntityUuid`; its failing original log remains `.cache/v2628-media-bindings.log`, and the corrected complete run is `.cache/v2628-media-bindings-second.log`.

FileReader implements actual Blob-to-data-URI encoding, and the Audio host reports deterministic metadata; no physical sound playback or codec quality is claimed by this test. No product defect was found in these scoped rename/reimport/history paths and no extra product changes were necessary. Parent PCM and real browser export gates cover their separate media/runtime contracts.
