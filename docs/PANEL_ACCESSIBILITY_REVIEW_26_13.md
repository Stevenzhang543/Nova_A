# Eight-panel control and draft audit, 26.13

Integration notice: this journal preserves the original staged findings, failure results and pending-at-the-time entries. The reviewed files are now integrated for the26.13 candidate after26.12 was finalized. Final scope/status is in [26.13 release notes](RELEASE_NOTES_26_13.md) and its executed-gate evidence. Historical measurements are not relabeled as production qualification.

This audit reads the complete source of AnimationPanel, RenderingPanel, PresentationPanel, EventSheetEditor, AudioSystemPanel, MaterialGraphEditor, ParticleGraphEditor and GraphProductionPanel. Changes are prepared in the isolated 26.13 overlay while 26.12 is frozen. They become release changes only after integration and release qualification.

Before editing, the consequences were checked against the panel handlers and data bindings. Naming and container rules must not alter selected values, limits, enabled states, serialization, graph generation or asset identities. Reflow must leave fields reachable rather than remove them at narrow widths. Splitting nested interactive controls must preserve separate enable and selection actions. The two authorized behavior corrections protect text editing shortcuts and unsaved Event Sheets; these deliberately change when navigation or entity binding updates may occur.

## Concrete findings and changes

The original Animation asset picker, rendering light toggles and layer actions, presentation preset/locale/table controls, numerous icon buttons and multi-field labels did not give each native control a contextual name. The audit adds 190 explicit annotations recorded individually in `reports/panel-control-name-edits.json`, using existing translation keys or the small English/German/Chinese panel copy helper. Additional manual changes name the animation timeline mute control and particle module toggle, expose selected button states, remove an incorrect tablist role from GraphProduction navigation, localize Rendering navigation, and add the waveform slider's minimum/maximum values. The final source inventory records all 580 conditional native controls, including branches that are not initially rendered. Existing missing `amount` and `emissionShape` translations now use the localized helper.

Several panels based layout on the browser width even when embedded in narrow docks. Component container queries now use the width actually available to that panel. Animation inspectors, Rendering preview, Event Sheet priority/override fields and its details pane remain in the scrollable layout at narrow widths. Material and Particle columns stack; presentation and audio fields wrap locally. Diagnostic text wraps rather than losing essential prose to ellipses. The timeline and material graph remain deliberately scrollable editing surfaces.

Animation keyboard handling previously consumed copy, paste and Delete events originating in an input. The handler now yields to native inputs, textareas, selects, contenteditable descendants and custom textbox roles. Canvas shortcuts retain their previous operations.

Event Sheet opening, creation, quick-object creation, Open logic and the exposed `requestLeave()` now share a serialized transition guard. The existing confirmation service supports two buttons, so the interaction is explicit in two steps: **Save and continue / Discard or cancel…**, followed by **Discard and continue / Cancel**. Cancel retains the exact document and identity. Invalid/throwing saves, changes while a decision is pending, and concurrent transitions cannot replace the draft or start creation side effects. The target asset is rechecked before opening it. Requested global selection is restored when a switch is refused. Open logic uses the same guard. Discard before leaving restores the saved document, so a later destination failure cannot strand unsaved content marked clean.

The logic picker previously updated the selected entity's `scriptAsset` before the Event Sheet was saved, which made discard misleading. It now changes the draft only. The existing successful save/attach path applies the persisted logic binding. Direct Save catches persistence exceptions, reports the failure and retains the draft. The component exposes `requestLeave(): Promise<boolean>` for the ScriptWorkspace owner to await when switching authoring modes.

## Exact file ledger

| File | Changes |
| --- | --- |
| `src/components/AnimationPanel.vue` | Contextual names for asset/tangent selectors, playback, icon actions, track/key/frame/controller/blend/skeleton/timeline fields; pressed selection state and separate timeline mute input/selection button; import/use editable-target shortcut guard; component and inspector container queries, wrapped toolbar/prose, reachable stacked inspectors and scrollable narrow workspaces. No animation data or evaluation changes. |
| `src/components/RenderingPanel.vue` | Contextual names for lighting/post/streaming controls, shader source, uniforms/vector components, material layers, captures and volume actions; localized studio navigation; root/card container queries, wrapped headings/forms/layer actions and restored narrow preview card. Rendering handlers and serialization unchanged. |
| `src/components/PresentationPanel.vue` | Names for device, localization, table, translation, snapshot, audio bus, effect, automation, loop and ducking controls; waveform slider bounds; local container layouts and wrapped text/fields. Presentation, localization and audio handlers unchanged. |
| `src/components/EventSheetEditor.vue` | Names for document/event search and event controls; added inner responsive layout retaining every handler/detail field; shared save/discard/cancel guard for opening/creation/quick objects/Open logic/leave; target and draft identity checks; boolean safe-save result and visible failure logs; persisted-document restore on discard; deferred entity binding until save; exposed `requestLeave`. Existing document format, validation and creation APIs retained. |
| `src/components/AudioSystemPanel.vue` | Flexible, bounded embedded PresentationPanel layout; hide its otherwise empty header in audio-only mode. No script or audio behavior changes. |
| `src/components/MaterialGraphEditor.vue` | Named graph search, translated previously missing amount label, local container-based stacking and wrapped diagnostics; graph canvas stays scrollable. Graph handlers and generated material source unchanged. |
| `src/components/ParticleGraphEditor.vue` | Separate module enable input and selection button, contextual enabled label and pressed selection state, translated emission-shape label; local column/form reflow and wrapped diagnostics. Particle values, toggles and graph generation unchanged. |
| `src/components/GraphProductionPanel.vue` | Contextual routine/parameter/local/interface/event/library/watch/breakpoint/merge/refactor controls; button pressed states replace inappropriate tablist role; narrow form and diagnostic/reference/watch text wrapping. Production graph handlers and serialization unchanged. |
| `src/editor/panelControlCopy.ts` | New typed EN/DE/ZH copy for controls lacking an appropriate existing key and the Event Sheet decisions/errors; optional contextual label suffix. |
| `src/editor/panelAuthoringGuards.ts` | New editable keyboard-target predicate and serialized Event Sheet transition guard, including exact draft snapshots, save failure handling, stale refusal and pending-decision exclusion. |
| `scripts/verify-v26.13-panel-accessibility.mjs` | New full conditional native-control inventory, SFC script/template/style compilation, baseline binding/handler comparisons, dictionary registration checks, executed production shortcut and Event Sheet handlers plus transition helper regressions. Supports source and immutable baseline roots. Test-only dictionary export does not alter product modules. |
| `reports/panel-control-name-edits.json` | Individual record of each of the 190 automatic explicit-name additions: panel, original source line, tag, model/action and label expression. Lines describe the inspected baseline; later wrapping may move them. |
| `reports/panel-accessibility-verification.json` | Executed check results plus final 580-control source inventory with file/line/name-expression/model/naming provenance. Each entry explicitly has `observed: false`. |
| `docs/PANEL_ACCESSIBILITY_REVIEW_26_13.md` | This consequence assessment, edit ledger, reproducible evidence and remaining actual-user scenarios. |
| `docs/VERSION_26_13_WORKSPACES.md` | Appends the eight-panel/helper/verifier/evidence ledger without replacing other owners' records. |

## Executed evidence and limits

Run before integration:

```powershell
node .cache/development-v26.13/scripts/verify-v26.13-panel-accessibility.mjs --source-root=.cache/development-v26.13
```

Result: **40 checks passed**, including all eight SFCs' script, template and scoped CSS compilation. All native `v-model`, value/checked/disabled bindings and min/max/step limits match the 26.12 baseline. Six panels' script bodies also match after stripping only the localized-label import; Animation and Event Sheet have separately executed handler regressions for their authorized behavior changes. All referenced control-name dictionary keys exist in English, German and Chinese. English labels that legitimately equal their key (for example `keys`) are checked by dictionary membership rather than incorrectly treated as missing translations.

After promotion, compare against the frozen 26.12 source rather than the newly promoted files themselves:

```powershell
node scripts/verify-v26.13-panel-accessibility.mjs --baseline-root=<immutable-26.12-authored-snapshot>
```

These are compiled-source and production-function tests. They are **not** browser click tests, computed accessible-name certification, pixel geometry checks, screen-reader checks or exhaustive feature execution. The 580 source records are conditional controls, not 580 observed user interactions. The broader editor's external asset opening, project replacement and application shutdown are outside this local Event Sheet guard; their integration must be tested by the owner of those navigation paths.

The assembled application still needs actual browser verification at narrow and wide docks and EN/DE/ZH with 100%, 150% and 200% scale. Exercise the controls in each visible panel branch, verify that fields and prose are reachable, compare the browser accessibility tree, and capture screenshots. In particular, type/copy/paste/Delete inside animation text fields; select and toggle timeline/particle rows separately; edit an Event Sheet then try open/create/quick-object/Open logic/mode switches with Save, Discard, Cancel, invalid callbacks and persistence failure; verify that discard restores saved logic and that cancellation creates no assets or entities. Workspace navigation that can unmount an authoring panel also needs an explicit draft-retention check.
