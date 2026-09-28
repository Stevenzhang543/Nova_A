# Nova_A editor rebuild — edit ledger

This ledger describes the development UI rebuild requested after the published 26.32 release. Existing releases/26.32 artifacts are unchanged. Runtime/physics algorithms and project formats are outside this change.

## Root architecture and shared system

- src/main.ts: registers shared editor components and imports one editor style entry instead of four cascading global layers. Existing fonts, crash handling and external-link guard remain.
- src/ui/tokens.css: centralized semantic palettes, typography, spacing, radii, compact geometry, scale and overlay tokens; existing theme preferences retained.
- src/ui/editor.css: centralized native button/input/select/textarea primitives, shared structural chrome, focus, scrollbars, maximize behavior and async workspace presentation.
- src/ui/register.ts: registers and types shared Vue primitives.
- src/ui/components/UiButton.vue: native event-compatible SVG/text commands, tooltip and accessible-name fallback from label/aria-label/title.
- src/ui/components/UiPanelHeader.vue: one compact title/description/actions header.
- src/ui/components/UiTabs.vue: labelled native tabs, selected state, tab IDs/control relationships, manual or automatic arrow/Home/End keyboard activation.
- src/ui/components/UiTreeRow.vue: shared row selection, indentation, disclosure and actions; native events remain on its root.
- src/ui/components/UiDialog.vue: shared focus-managed modal, named heading/custom-header accessible name, optional alertdialog role, close/Escape/backdrop behavior.
- src/ui/components/UiMenu.vue: shared menu roles, focus entry, keyboard movement and Escape close.
- src/ui/components/UiAsyncWorkspace.vue: keeps previous content until the incoming module resolves, discards stale navigation results, bounded view cache, loading/error/retry states, final unmount cancellation.
- src/App.vue: resolve-before-switch launcher/editor host; explicit project-session key disposes the complete editor and cached state when replacing a project.
- src/layout/EditorLayout.vue: persistent tool/dock/viewport hosts; removed workspace out-in fade/translation; shared async content; inspector empty state reserves width; bottom dock cached; floating dock actions become SVGs; shared shell geometry; removed physics-monitor transition.
- src/components/ManageWorkspace.vue: compact header/shared tabs, stable main host and cached async sections; preserves all seven sections and dirty indicators.
- src/layout/StatusBar.vue: compact token geometry and restrained task/status presentation, preserving all counters and task-center action.
- src/components/AutomationStudio.vue: source/results split, shared command header, preview/trace tabs, permission disclosure; original plan/apply/cancel/rollback logic retained; final unmount aborts active work.
- src/components/ProjectHealthPanel.vue: health list/details, separate readiness/data tabs and flat integrity rows; original checks/repair/backup/rollback actions retained. See reactive-loop correction below.
- src/components/PackageManagerPanel.vue: shared compact command header/status tabs, package/registry list and details, narrow-container stacking; removed three competing style blocks; preserved install/security/permission/offline/update/uninstall/rollback flows.
- src/components/CreatorLearningCenter.vue: compact shared header/tabs, guide browser and flat contracts/readiness/profile lists; original learning content, workspace navigation, completion and profile actions retained; status glyphs replaced with SVGs.
- src/components/StudioDraftConflict.vue: shared explicit keep/discard commands and compact comparison layout; conflict rules and both previews retained.
- src/components/TilemapPanel.vue: setup disclosure separated from painting toolbar; named SVG transform/copy/layer actions; shared property rows, compact palette/properties panes; atlas/region math, imported ownership, layers, baking/history/diagnostics retained. Hiding the cached panel disables paint activation.
- src/components/ImportedAssetBindings.vue: shared stacked source rows and named open-source SVG command; source resolution/history unchanged.
- src/components/TimelineButtonAction.vue: shared property row and token section; fixed undefined border token; callback preservation unchanged.
- src/components/ObjectOwnershipPanel.vue: flat provenance lists, shared refresh/create commands, SVG timer status and token geometry; ownership/locate/source behavior unchanged.
- src/components/AudioSystemPanel.vue: audio-only host hides the new shared presentation header/tabs; removes obsolete selectors so unrelated presentation modes do not leak into the audio tool.
- src/assets/editorReadability.css, editorStudio.css, editorForms.css: deleted after verifying zero application imports. src/assets/main.css remains exclusively for the separate exported player.

## Verification tooling and evidence

- scripts/audit-ui-system.mjs: reproducible Vue/CSS source inventory, native controls/events, component use, lifecycle and literal declaration evidence; explicitly not executed feature coverage.
- scripts/verify-ui-form-controls.mjs: nine real-browser checks of range/precise event paths, lazy commit, invalid/disabled input, atomic pending-draft validation, resource identity, stepping and 100–200% geometry. A minimal isolated Vite fixture avoids unrelated editor startup/file watching.
- scripts/lib/browserUserAudit.mjs: optional initial URL/readiness expression for isolated fixtures; existing application audit defaults unchanged.
- scripts/lib/worldAudit17.mjs: UI-workspace readiness recognizes the new presentation root while retaining the legacy selector.
- scripts/verify-ui-rebuild-navigation-user.mjs: cold/warm frame and node identity sampling, draft/filter persistence, actual source/graph/property saves, undo/redo and project replacement isolation. Graph view metadata is saved through its real asset command before project save, preserving the existing unsaved-draft guard.
- scripts/verify-ui-rebuild-layout-user.mjs: separate current-development route and screenshot audit, adapted to shared component selectors; historical versioned qualification script remains unchanged.
- docs/ui/UI_AUDIT.md: actual full-surface source findings, measured flicker causes and migration risks.
- docs/ui/UI_SPEC.md: implementation contract for shared native primitives, geometry, lifecycle and published-release immutability.
- docs/ui/DECISIONS.md: cascade replacement, resolved navigation, lifecycle and functional geometry decisions.
- docs/ui/MIGRATION.md: live milestone and verification tracker.
- docs/ui/UI_INVENTORY.json and release-audits/ui-rebuild: baseline/final static inventories and isolated browser evidence. Failed attempts are not passing evidence.

## Additional agent-owned per-file changes

# Form migration edit ledger — current development rebuild

## Implemented
- Added shared `UiPropertyRow`, `UiPropertySection`, `UiSlider`, `UiToggle`, and `UiNumberField` compatibility alias under `src/ui/components`.
- Added `src/ui/forms.css`, imported once by the centralized editor entry. Defines token-based 88px numeric controls, 128px slider tracks, shared value companions, property grids/sections, error and narrow-container behavior.
- Preserved `NumericExpressionInput` draft implementation in place. SVG vertical steppers replace glyph buttons; disabled and readonly inputs cannot step. Removed old numeric/path/limit scoped geometry.
- Replaced Settings private row/toggle primitives; replaced ConfigPanel private row/section/range presentation with shared controls while retaining metadata, recursive accessible naming, pin/modified filtering, property context menu/details, resource identity, history and selection gesture handling.
- ConfigPanel component toolbar now uses named SVG buttons for enable/reset/copy/paste/preset/reorder/remove. Component picker category/favorite icons now SVG. Empty inspector retains persistent width and displays localized no-selection status and create-object action.
- Migrated simple property labels and card-like form groups throughout Runtime/Gameplay/World component inspectors, Physics, World Tools, Network, Rendering, Presentation, Device Input, Build, and Settings. Native number/select/checkbox models remain native shared primitives per UI_SPEC22; no blanket behavior-changing input wrapper conversion.
- Migrated form panel headers/navigation to UiPanelHeader/UiTabs, preserving Presentation guarded async transitions and Network original tab/panel IDs and automatic keyboard activation.
- Migrated all 26 owned scalar ranges plus three coordinated graph ranges. Existing value/model/modifiers/input/change/pointer handlers preserved. VisualGraph zoom retains its dedicated numerical readout and uses track-only mode. Animation and bottom-panel ranges are owned by other agents.
- Removed 757 obsolete scoped rules/declarations for legacy control geometry, card chrome, rounded panels, typography and effects; retained domain canvas/source/table/spatial layouts. Remaining panel spacing uses shared tokens.

## Behavior protection
- Slider numeric companion routes through actual range input/change events, suppressing only its duplicate original text-input change bubble. Existing event.target.value handlers and ancestor history receive one change.
- Slider precise controls use equal min/max/step and inherit data-resource-key identity; navigation agent lazy semantics are preserved.
- Inspector toggle now updates from native checkbox change before that same change reaches the inspector domain commit owner.
- Native `.lazy.number` validation guards in world/network/physics remain intact.

## Verification so far
- Source audit complete in `.cache/ui-rebuild-form-audit.md`.
- Repeated `pnpm check`: no owned-form errors after repair of generated attribute quoting; latest checkpoint blocked only by peer AutomationStudio icon `edit` (root notified).
- Focused native-event, pending-draft, geometry and integrated visual verification pending; do not mark acceptance complete yet.

## Open work
- Finish remaining glyph actions and raw geometry cleanup after actual visual review.
- Clarify parent persistent-panel mechanism before adding visibility lifecycle suspension.
- Run focused slider/draft tests and integrated visual checks against rebuilt candidate.


---

# Secondary UI rebuild edit ledger

All edits below are confined to presentation/lifecycle behavior and preserve existing engine/runtime algorithms, command handlers, data bindings, security confirmations, and conversion guards. Each edited SFC template was compiled with vue/compiler-sfc immediately after its migration; final combined type/build and browser checks remain the acceptance gates.

- ConsolePanel.vue: shared SVG clear action; labelled filter toolbar/search; token-based filter widths, typography, spacing and log rows; removed duplicated primitive chrome. Console filtering behavior is unchanged; root bottom-panel KeepAlive retains the local filter.
- ScriptWorkspace.vue: shared labelled Code/Graph/Event tabs with existing conversion/save gates; shared confirmation actions; replaced tab/help chrome; cached the three authoring mode components so local pane/filter state survives a guarded mode switch. Parent project key invalidates the workspace cache across projects.
- ScriptStudio.vue: compact SVG create/save/find/focus/explorer/detail actions; discoverable text+SVG command menu; shared scrolling inspector tabs; replaced the local card/rounded control system with token-based panes and flat details. The source textarea/gutter share exact 22px line geometry to preserve breakpoint alignment. ResizeObserver disconnects while cached and resumes on activation without resetting drafts or selection. Source analysis and explicit runtime debugging retain their behavior.
- VisualGraphEditor.vue: compact SVG creation/save/history/navigation controls; discoverable command menu; replaced surrounding toolbar/palette/property chrome with tokens and flat sections. Canvas coordinates, node/pin hit geometry, minimap math, block geometry and routing remain local. Theme semantic variables replace fixed pin-category colors. Cached graph deactivation cancels live gestures/layout/routing, flushes pending visual/history edits, retains draft, disconnects geometry observers, cancels queued frames/compile timer, and resumes observation/routing/compile on activation without reopening/resetting the graph. Linked graph synchronization remains registered to avoid stale hidden models.
- EventSheetEditor.vue: shared toolbar/save/link/create/remove SVG actions; event asset SVGs; compact browser/handler/detail panes; flat event rows with responsive property wrapping. Provenance is now collapsed by default but fully available, rather than occupying the editing surface initially. Validation, inheritance, priority, selectors, callback editing, blueprint creation/instantiation and draft guards are preserved.
- ProfilerPanel.vue: shared header and separate scrolling tab row; SVG freeze/clear/capture/annotation actions; flat metric/property/test/data/runtime/network sections; container-based responsive layouts and bounded fields. Removed independent card styles and duplicated native control sizes. Explicit scheduled jobs, runtime sessions and networking are not stopped merely by hiding the pane.
- EcosystemStudioPanel.vue: shared header and separate scrolling navigation; SVG plugin lifecycle/status actions; flat package/trust/template/delivery/evidence sections and contribution/audit rows. Signing, deployment permission, import and update opt-in flows are unchanged. Tables scroll horizontally when actual data requires it; surrounding panes reflow.
- GraphProductionPanel.vue: shared scrolling tabs, SVG add/remove/debug actions and direction markers; flat routine/interface/merge/debug sections; responsive inline property controls. Graph signatures, debugger operations, history and merge guards are unchanged.
- MaterialGraphEditor.vue: shared panel header and SVG palette/remove/reset actions; token-based palette/canvas/properties layout; removed local hard-coded color/card/control system. Existing 150x66 node geometry and edge coordinate math remain unchanged. Shared slider migration/numeric binding adjustment was made by form_design.
- ParticleGraphEditor.vue: shared header/module selection controls; flat module/property/cost panes; standardized compact property and vector layout; removed prior local rounded card and control widths. Toggle and selection remain separate keyboard controls; particle normalization/cost algorithms unchanged.

Risk-focused verification required: persistent shell/no blank navigation frames; actual local draft/filter state across workspace and mode switches; isolated state after opening another project; graph pointer/zoom/history behavior after reactivation; source edit/save; all routed panels at 1366 with selected 1600/1920/profile checks. Do not rerun unrelated engine tests solely for these presentation changes.


---

# UI rebuild — owned surface edit ledger

Each row records one edited/new source file and its user-visible or lifecycle consequence. Root owns final migration/decision documentation and combined build/visual verification.

| File | Change and preserved behavior |
| --- | --- |
| `src/components/editorIconPaths.ts` | New original coherent outline SVG path registry; preserves existing icon names and adds semantic action icons. No Godot-copied geometry is used by the active icon component. |
| `src/components/EditorIcon.vue` | One scalable 16-unit SVG canvas, currentColor strokes, consistent token dimensions; exports EditorIconName. |
| `src/components/SceneSideBar.vue` | Shared panel header/tree row/icon controls; search plus advanced filter menu; 24px × UI scale virtual rows; all selection, rename, drag/drop, scene and visibility callbacks retained. |
| `src/components/SceneTabs.vue` | Compact tabs, shared scene/history/layer action buttons, SVG state icons, token menu geometry; scenes and layer settings retained. |
| `src/components/LayerBar.vue` | Compact horizontal layer strip replaces floating card; existing layer actions retained. |
| `src/components/ToolBar.vue` | Grouped icon tools and compact authoring/arrange/snap/view menus; removes inline mixed icon chrome. Shift+A and tool shortcuts now guard editable inputs, modals, non-scene and UI workspace. |
| `src/components/WorkspaceBar.vue` | Shared workspace/history controls, compact menus, one-line context; old oversized local control rules removed. |
| `src/components/ActionBar.vue` | Shared playback icons, intrinsic flex width, optional status text; preflight/play/pause/step/stop logic unchanged. |
| `src/layout/SideBar.vue` | Compact icon rail with accessible labels; hidden in Manage where root ManageWorkspace owns identical destinations; no unique action removed. |
| `src/layout/TopBar.vue` | Preserves native menu refs and menu controller; replaces check glyphs and local decorative chrome with compact token geometry. |
| `src/components/EditorBottomPanel.vue` | Persistent asset DOM and project-keyed KeepAlive dynamic tools; selected tool deactivates on close/tab switch. Cancels batch on project identity change/final unmount. Compact asset actions, folder hierarchy/leaf labels, thumbnail/list/details inspector; native import/model/drop handlers preserved; shared audio quality slider. |
| `src/components/ContentAssetInspector.vue` | Shared panel header/open-animation button, compact tabs and property/dependency rows; eliminates nested card chrome without changing asset transactions. |
| `src/components/AnimationPanel.vue` | Single asset creation menu, compact save/transport icons, shared sliders, structure/timeline/property layout. Canvas/keyframe coordinate rules retained. Deactivation retains draft/stops preview and record mode/releases recording ownership; activation restores recording ownership and pane measurements; hidden inspection timer is inert. |
| `src/components/ProjectManager.vue` | Recent-project list with command sidebar; shared creation/upgrade/read-only dialogs; template list with selected details replaces cards. Template requirements/features still available in selected detail. Existing migration, lock, backup and document callbacks retained. |
| `src/components/ConfirmDialog.vue` | Shared dialog and semantic warning icon; native cancel button ref retained so default cancel focus remains. |
| `src/components/ExternalChangeDialog.vue` | Shared dialog, readable change summary/list, unchanged editor/disk/compare/reload choices; dismissal keeps editor version. |
| `src/components/StudioStatusDialog.vue` | Shared version-labelled dialog with compact contract/channel/privacy rows; existing export consent and callbacks preserved. |
| `src/components/CommandPalette.vue` | Coherent semantic command icons and compact searchable list; native dialog/search refs and keyboard routing retained. |
| `src/components/CreateObjectPalette.vue` | Shared dialog, category SVG family, selectable type rows, semantic favorite control; keyboard Space selects without activating nested favorite button. |
| `src/components/ContextMenu.vue` | Shared keyboard menu and measured viewport clamping replace fixed menu bounds; entity/layer mutations and confirmation behavior retained. |
| `src/components/WorkspaceManager.vue` | Shared dialog and compact workspace list/settings layout; preset, custom, dock, import/export handlers retained. |
| `src/components/ShortcutEditor.vue` | Shared dialog, semantic search/reset controls, compact shortcut rows; capture/conflict/import/export logic retained. |
| `src/components/AccessibilityEvidencePanel.vue` | Flat evidence section, compact definition rows and SVG bridge/refresh actions; detection/download logic unchanged. |
| `src/components/AndroidDeliveryPanel.vue` | Flat toolchain/device/permissions settings, icon discovery/status, bounded inputs; deployment and signing logic unchanged. |
| `src/components/PluginSettings.vue` | Plugin rows, shared reload/remove controls, compact permission checkboxes; permission grants/runtime callbacks unchanged. |
| `src/components/SaveDataSettings.vue` | Shared load/save/clear actions, compact slot and status rows; cancellation/recovery and save callbacks retained. |
| `src/components/TeamWorkflowPanel.vue` | Primary changes/review column plus configuration column; compact merge and source-control settings; semantic conflict data and all handlers retained. |
| `src/components/ObjectBlueprintEditor.vue` | Shared dialog around native editorElement ref; compact property/composition/provenance rows; draft conflict and close/save/derive/instantiate behavior unchanged. |
| `src/components/CreatorOnboarding.vue` | Compact token dialog and original SVG step icons; existing dialog ref, focus and step keyboard behavior retained. |
| `src/components/ErrorRecovery.vue` | Shared error dialog and readable diagnostic content; continue/download/restart handlers retained. |
| `src/components/RecoveryCenter.vue` | Shared recovery dialog with snapshot list/details; restore/read-only/safe-copy/discard callbacks retained. |
| `src/components/ManualViewer.vue` | Compact manual header with shared reload/close icons; iframe content and reload identity retained. |
| `src/components/EditorFeedback.vue` | Compact token banners/toasts/nonmodal task center; cancellation, retry, diagnostics and task-resource actions retained; reduced-motion spinner handling. |
| `src/components/UndoHistoryPanel.vue` | Compact nonmodal history list, shared undo/redo/clear/close, semantic applied-state icons; history transactions unchanged. |
| `src/components/PhysicsRuntimePanel.vue` | Flat telemetry browser and shared monitor/freeze/sort/export actions; virtual rows now 48px × UI scale with identical JS/CSS contract, chart samples unchanged. |
| `src/components/SimulationStatusPanel17.vue` | Flat live diagnostics/property rows and compact token action spacing; runtime bake/cancel/origin operations unchanged. |
| `src/components/ConnectionBuilder.vue` | Shared dialog with compact object/path chooser and property rows; semantic SVG shapes; authored canvas preview, mouse math and form guards preserved. |
| `src/components/ScriptConversionPanel.vue` | Flat coverage/diagnostic rows with shared code/graph navigation icons; conversion gating and navigation payloads unchanged. |

## Verification to date

- Vue compiler parse/template compilation passed for primary assigned surfaces and the final support batch.
- Root combined typecheck initially reported only StudioStatusDialog unused version import; version is now retained in shared dialog title. Later support edits still require root combined check.
- No engine/runtime storage format changes. No release/version edits.
- Pending: actual browser visuals at scaled/narrow viewports, runtime actions and focus/keyboard interactions, root combined typecheck/build.

## Particular visual risks to review

- ToolBar popovers, scene settings flyouts, launcher template detail scrolling, bottom asset grids/detail mode, animation stacked panes and recording ownership after hiding.
- Asset virtual grid now uses matched 56 × scale rows, 4 × scale gaps and 40 × scale thumbnail dimensions; enlarged-text QA remains required.
- Context menu now measures dimensions; confirm first-open focus and bottom/right placement.
- Error/recovery shared dialog overlay stacking should be compared with any simultaneously open authoring modal.

## Source-review corrections

- Added missing close/add accessible labels in scene settings and replaced remaining forward arrow glyphs with SVG controls.
- Tree name/action minimum height now explicitly matches the 24 × scale row contract rather than inheriting 28 × scale toolbar controls.
- Animation inactive asset watchers cannot reacquire global draft-recording ownership.

## Later requested support surfaces

| File | Change and preserved behavior |
| --- | --- |
| `CreatorOnboarding.vue` | Compact token dialog, semantic SVG step icons; existing native dialog ref/focus and keyboard step handling retained. |
| `ErrorRecovery.vue` | Shared dialog and readable diagnostics; continue/download/restart actions preserved. |
| `RecoveryCenter.vue` | Shared dialog with snapshot list/details; read-only/copy/safe/restore/discard operations preserved. |
| `ManualViewer.vue` | Compact header with shared reload/close icons; iframe and reload identity unchanged. |
| `EditorFeedback.vue` | Compact token banners/toasts/nonmodal task center; task cancellation, retries and diagnostics preserved. |
| `UndoHistoryPanel.vue` | Compact list and shared undo/redo/clear/close; semantic applied-state icons. |
| `PhysicsRuntimePanel.vue` | Flat telemetry browser; shared monitor/freeze/sort/export; 48 × scale virtual rows matched in JS/CSS. |
| `SimulationStatusPanel17.vue` | Flat live diagnostics rows; bake/cancel/origin handlers unchanged. |
| `ConnectionBuilder.vue` | Shared dialog, compact object/path chooser and properties; original preview canvas geometry and form guards retained. |
| `ScriptConversionPanel.vue` | Flat coverage/diagnostic rows with shared code/graph icons; conversion gates and payloads unchanged. |

Later support batch Vue parse/template compilation passed. Physics row expressions reviewed after scaling.

- Confirmed fixed asset-row arithmetic would clip enlarged labels; corrected matching virtual stride/CSS rows/columns to UI scale before browser QA.

## Project Health hang correction

- Browser paused-stack evidence: `.cache/ui-rebuild-health-stack.json` shows graph normalization through `getSceneJSON` from Project Health computed snapshot evaluation.
- Source cause: `projectSource()` writes `sceneManager.activeScene.data` and asset pipeline dependency arrays. Both health and persistent asset-browser computed reads called this mutating serializer, allowing reactive invalidation feedback.
- New `src/editor/projectInspectionSnapshot.ts` uses a shallow snapshot refreshed by explicit project ID / history entries / asset generation / active scene watches and activation. Serializer internals are not tracked as computed dependencies.
- `ProjectHealthPanel.vue` and `EditorBottomPanel.vue` use that boundary; no validation category, repair action or serializer output was removed.
- `UiDialog.vue` adds optional `role` with default `dialog`; `ConfirmDialog.vue` and `ErrorRecovery.vue` restore `alertdialog` on the inner modal section.
- Exact route regression is pending rebuilt candidate; no timeout workaround was introduced.

### Project Health hang verification (2026-09-28)
- Confirmed the history store synchronizes entries by splice. Snapshot watch therefore reads `historyState.entries.slice()` plus `historyState.index`, covering ordinary, merged, undo, and redo transactions without a deep project watch.
- Frontend Vite build passed after the dependency correction (639 modules; retained dynamic-import/chunk-size warnings).
- `node .cache/ui-rebuild-health-probe.mjs` passed the exact fresh mixed project → Manage → Project Health → Learning Center route; no browser console errors. Both resulting 1366×768 screenshots were visually inspected: health rows/detail are readable and navigation returns normally.
- `node .cache/ui-rebuild-health-repeat.mjs` passed repeated navigation and a final responsiveness check; evidence `release-audits/v26.32-ui-rebuild-health-repeat.json`. This confirms the earlier >30-second event-loop stall is removed without extending timeouts or skipping health validation.
- Scope: browser production frontend, software-rendered Edge; this regression check does not independently qualify all health repair operations or native accessibility announcements.

### Complete rebuild visual traversal and corrections (2026-09-28)
- Added `scripts/verify-ui-rebuild-layout-user.mjs`: retains the original layout audit's edit/undo/redo/download, launcher, workspace, bottom-tool, Manage, dialog, fixture, locale/palette/scale, touch and collapsed-dock checks; updates migrated tab/dialog/UI workspace selectors; handles persistent hidden bottom content by visibility; adds1600×900 and1920×1080 destinations. `--final` writes separate final-candidate evidence; `qualifyRelease:false` marks source-rebuild scope.
- Added `scripts/verify-ui-rebuild-layout-corrections.mjs`:9 focused assertions for slider geometry/value, delivery hint separation, and platform badge containment across English1×, German1.5×, Chinese2×. Captures deliberately scroll examined rows into view without changing model state.
- Edited `src/components/BuildSettingsPanel.vue` scoped styles only: delivery checkbox + text pair now uses flex geometry, separate title/hint grid rows and token gaps; support badge column uses character-based width with wrapping and top alignment. Preserved every label, hint, binding and handler. Consequence: long translated hints occupy additional readable lines; panels retain their existing vertical scroll.
- Baseline197-route run passed10 checks with0 geometry failures and0 console errors. All197 screenshots reviewed via25 contact sheets; suspicious routes030/132/133 inspected full size. Shared slider issue sent to root and corrected centrally.
- Final targeted9 checks passed against the final shared label-width104px build; all9 captures visually reviewed. The final197-route geometry traversal is separately recorded to avoid overwriting baseline visual evidence.
- Review scope/metadata recorded in `release-audits/ui-rebuild-visual-review.json` and `.cache/ui-rebuild-visual-review.md`. No release version or installers changed by this audit work.
Final complete route traversal: PASSED197routes/10checks,0geometryfailures,0consoleerrors against final104px label-width build; final report has qualifiedRelease:null. Audit/style source work complete.

### Populated animation visual corrections (2026-09-28)
- Reviewed populated controller, rig and skin screenshots (`v26.32-ui-rebuild-animation-populated-2/3/4.png`) at full resolution. These exposed conditional authoring layouts not present in the197-route fixture.
- `AnimationPanel.vue`: restricted the state-machine SVG canvas sizing/positioning rules to its direct child SVG and its connection lines. Previously the descendant selector also stretched the Add State button's SVG across the entire canvas. Replaced that button with UiButton while retaining addState.
- `AnimationPanel.vue`: rebuilt controller layer editing as shared UiPropertyRow fields with explicit names/weight/mask/synchronization rows. Removed the old two-column minmax+auto layer grid that forced synchronized labels into overlapping columns. All v-models, candidate filtering, layer removal, and shared slider events are preserved.
- `AnimationPanel.vue`: separated Skin heading into a header and rig/weight-bone/falloff controls into stacked shared property rows; added token spacing and wrapping to the sidebar. Source Rig and rig-attachment fields also use shared stacked property rows so labels no longer touch dropdowns.
- No animation sampling, pose/weight math, state-node positions, transition geometry, preview, recording, or persistence code changed. Consequence: narrow sidebars gain readable vertical rows and may scroll farther.
- Vue SFC parse/template compile passed. Root owns populated browser tests and the next build; no competing audit/build was started by this agent. Fresh rendered verification remains required before marking these specific corrections complete.


## Tracked file change checklist

- scripts/lib/browserUserAudit.mjs
- scripts/lib/worldAudit17.mjs
- src/App.vue
- src/assets/editorForms.css
- src/assets/editorReadability.css
- src/assets/editorStudio.css
- src/components/AccessibilityEvidencePanel.vue
- src/components/ActionBar.vue
- src/components/AndroidDeliveryPanel.vue
- src/components/AnimationPanel.vue
- src/components/AudioSystemPanel.vue
- src/components/AutomationStudio.vue
- src/components/BuildSettingsPanel.vue
- src/components/CommandPalette.vue
- src/components/ConfigPanel.vue
- src/components/ConfirmDialog.vue
- src/components/ConnectionBuilder.vue
- src/components/ConsolePanel.vue
- src/components/ContentAssetInspector.vue
- src/components/ContextMenu.vue
- src/components/CreateObjectPalette.vue
- src/components/CreatorLearningCenter.vue
- src/components/CreatorOnboarding.vue
- src/components/DeviceInputPanel.vue
- src/components/EcosystemStudioPanel.vue
- src/components/EditorBottomPanel.vue
- src/components/EditorFeedback.vue
- src/components/EditorIcon.vue
- src/components/ErrorRecovery.vue
- src/components/EventSheetEditor.vue
- src/components/ExternalChangeDialog.vue
- src/components/GameplayComponentsInspector.vue
- src/components/GraphProductionPanel.vue
- src/components/ImportedAssetBindings.vue
- src/components/LayerBar.vue
- src/components/LimitNumberInput.vue
- src/components/ManageWorkspace.vue
- src/components/ManualViewer.vue
- src/components/MaterialGraphEditor.vue
- src/components/NetworkStudioPanel.vue
- src/components/NumericExpressionInput.vue
- src/components/ObjectBlueprintEditor.vue
- src/components/ObjectOwnershipPanel.vue
- src/components/PackageManagerPanel.vue
- src/components/ParticleGraphEditor.vue
- src/components/PathTextInput.vue
- src/components/PhysicsRuntimePanel.vue
- src/components/PhysicsSettingsPanel.vue
- src/components/PluginSettings.vue
- src/components/PresentationPanel.vue
- src/components/ProfilerPanel.vue
- src/components/ProjectHealthPanel.vue
- src/components/ProjectManager.vue
- src/components/RecoveryCenter.vue
- src/components/RenderingPanel.vue
- src/components/RuntimeComponentsInspector.vue
- src/components/SaveDataSettings.vue
- src/components/SceneSideBar.vue
- src/components/SceneTabs.vue
- src/components/ScriptConversionPanel.vue
- src/components/ScriptStudio.vue
- src/components/ScriptWorkspace.vue
- src/components/ShortcutEditor.vue
- src/components/SimulationStatusPanel17.vue
- src/components/StudioDraftConflict.vue
- src/components/StudioStatusDialog.vue
- src/components/TeamWorkflowPanel.vue
- src/components/TilemapPanel.vue
- src/components/TimelineButtonAction.vue
- src/components/ToolBar.vue
- src/components/UndoHistoryPanel.vue
- src/components/VisualGraphEditor.vue
- src/components/WorkspaceBar.vue
- src/components/WorkspaceManager.vue
- src/components/WorldComponentsInspector.vue
- src/components/WorldToolsPanel.vue
- src/layout/EditorLayout.vue
- src/layout/SideBar.vue
- src/layout/StatusBar.vue
- src/layout/TopBar.vue
- src/main.ts
- src/panels/SettingsPanel.vue

New shared components, icon paths, snapshot helper, audit scripts and documentation are listed above; this checklist is generated from the tracked diff and therefore excludes new files until added to Git. No commit or publication is performed.

## Final shared-system and verification corrections

- `src/ui/components/UiButton.vue`: preserve accessible names from label, aria-label or title; icon-only commands retain native tooltips.
- `src/ui/components/UiPanelHeader.vue`: title/description tooltips expose truncated full text.
- `src/ui/tokens.css` and `src/ui/forms.css`: improve slider contrast; scale track/thumb once; keep the standard track at 128 px with a bounded precision field; use a 104 px property-label column and bounded editor column. Narrow hosts stack fields instead of collapsing them.
- `src/ui/editor.css`: preserve hidden-element behavior, the existing reduce-motion attribute, full-selected-value overlay, and saved compact mode through 24 px shared control tokens.
- `src/panels/SettingsPanel.vue`: remove the competing wide label-column override; shared geometry and saved stacked-label preference now apply.
- `src/components/AnimationPanel.vue`, `PresentationSettingsPanel.vue`, `RuntimeComponentsInspector.vue`, and `src/panels/SettingsPanel.vue`: replace remaining routine preview/waveform/close/duplicate glyphs with original SVG icons.
- `src/components/AnimationPanel.vue`: use shared tabs for authoring modes; remove the local slider width override. Scope connection-canvas SVG dimensions to direct children so Add State icons retain standard geometry; migrate populated layer, skin, rig-source and attachment fields to shared rows. Existing asset bindings, handlers and math are preserved.
- `scripts/verify-ui-form-controls.mjs`: add the ninth saved compact/stacked-label preference check; correct the precision-edit test to commit using actual Enter before blur.
- `scripts/lib/browserUserAudit.mjs`: explicitly distinguish development bundle evidence from published-release qualification through the optional qualifyRelease flag.
- `scripts/verify-ui-rebuild-animation-user.mjs`: exercise populated clip/controller/rig/skin/timeline modes, bounded numeric fields, icon dimensions, docked captures, actual clip/project save and preview suspension. The preview fixture selects its target entity through the hierarchy before playback.
- `docs/ui/UI_INVENTORY.json`: regenerate after the final Animation changes; 101 source files, 730 native button sites, one native range, 222 native numeric sites, 1,388 literal visual declarations. These are source counts, not runtime feature coverage.
- `docs/ui/VERIFICATION.md`, `MIGRATION.md`, `UI_AUDIT.md` and `release-audits/ui-rebuild-visual-review.json`: record final evidence, screenshot review, corrected findings and explicit coverage boundaries.

### Final populated timeline correction

- `src/components/AnimationPanel.vue`: replace marker control overflow with a bounded two-row layout (name/remove, then wrapping time/color); use token-sized color swatches. All 15 timeline properties, including selected-clip fields, now use stacked shared rows while retaining conditions, models, options and actions. Group diagnostics with token gaps; wrap long codes, messages and source paths within the inspector.
- `scripts/verify-ui-rebuild-animation-user.mjs`: select a real timeline clip, assert inspector scroll width stays within its client width, and capture the populated properties.
- `release-audits/ui-rebuild-review-gallery.html`: provide a single entry to the 197-route gallery and final populated Animation evidence.

- `scripts/verify-ui-rebuild-timeline-details.mjs`: one focused browser assertion plus two scrolled captures for selected-clip controls and diagnostic wrapping; the combined gallery and visual-review record include this evidence.
