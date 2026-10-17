# Nova_A 26.11 UI source audit and focused layout repairs

This document distinguishes a complete **source inventory** from a completed interactive qualification. `scripts/audit-v26.11-ui-source.mjs` reads every Vue SFC under `src/` and records control/handler counts, child-panel imports, fixed width rules, container-query counts and ellipsis rules. The current inventory contains 70 SFCs. Reading this inventory does not prove that every control, translation, viewport, state or native dialog works.

The implementation work below targets confirmed source problems and browser findings communicated during the audit. The existing 26.10 layout documents are historical evidence; they do not certify these changed sources. Browser evidence must be regenerated against the current build.

## Findings and consequences checked before editing

| Finding | User-visible consequence | 26.11 edit and consequence |
| --- | --- | --- |
| ProjectManager searches only original English catalog text | A displayed German/Chinese name cannot reliably be found | Search includes displayed and original text; all filters share one pure function |
| Filtering leaves a hidden selected template active | Create can launch a different template than the visible results suggest | Selection reconciles with visible results; zero results disable creation |
| Keyboard Enter bypasses the busy button state | Repeated Enter can dispatch a duplicate create request | The create handler uses the same busy/path/name/selection guards |
| Three categories and no sorting must serve 40 cards | New starters become hard to discover | All category, counts, reset, newest/name/time sort; stable IDs preserve existing creation contracts |
| ConfigPanel divides narrow rows between a label and 58% control width | Labels wrap into very tall fragments while paired numbers remain tiny | Actual inspector-width query stacks fields below 360px; longer scrolling is an intentional tradeoff |
| ConfigPanel PropertyRow wraps several inputs in one implicit label; switches receive no explicit contextual name | Only one input may receive the implicit name; switches can be announced as a generic button | Each slot control receives an explicit contextual name; X/Y pairs are named separately; property row becomes a named group; NumberRange forwards the label to both internal inputs |
| Runtime/world/gameplay child inspectors retain fixed 55–56% field widths | Narrow docks remain cramped even on a wide monitor | Same actual-dock query stacks text, number and selection rows; checkbox and color rows remain compact |
| Asset Inspector uses fixed field sizes and ellipsized labels | Narrow asset metadata and import settings are hard to read | Its own 330px container query stacks fields and wraps action labels |
| BuildSettings hides startup-scene radio labels below 480px | A core build operation disappears in a narrow panel | The startup selector is visible on a second row; scene names wrap |
| Manage nav uses ellipsis for both title and explanatory text | Navigation descriptions become unreadable | Normal-width navigation titles and descriptions wrap |
| Live layout rerun found eight Settings failures: wrapped Manage labels exceeded 57–64px buttons at normal/150% scale | Navigation text overlaps neighboring choices | Buttons now retain natural content height with `flex: 0 0 auto`; the navigation owns scrolling |
| Live German 1024×640/200% layout showed every top menu button shrinking below its text width | Menu names are clipped despite available horizontal navigation | Menu items keep intrinsic widths and the row scrolls; dropdowns use the positioned top bar outside the scroller as their containing block |
| Opening File in the rebuilt German 1024×640/200% UI showed the first command behind the workspace toolbar | A geometrically contained menu can still have an unclickable/hidden first row | TopBar's stacking level increases from 500 to 650, above the workspace row at 600 and below dialogs/palettes; no menu geometry or command changes |
| Final live Settings inspection exposed local switches under the generic name `button` | Screen-reader users cannot distinguish preference switches | SettingsPanel's local SettingRow provides its translated label to its own ToggleSwitch; explicit accessible names retain priority |

Slot cloning preserves existing values, event handlers and component identity. Explicit accessible names supplied by individual controls remain authoritative. Layout edits do not alter project schema, persisted values, physics units, commands, undo transactions or export formats. More vertical scrolling at narrow widths is expected. No remote assets or dependencies were introduced.

## Every-panel/source coverage register

The following register names every Vue file. **Inventory** means its entire source was read by the inventory script and its structure, control surface and layout patterns were recorded; it is not a manual review of every handler. **Focused** marks direct source review of the stated problem. **Delegated** identifies work owned by the scripting/runtime audit. Untouched panels retain their current behavior and require the user checks below before a release-wide claim.

| Source | Role / scope | 26.11 review |
| --- | --- | --- |
| `src/App.vue` | Application entry, launch/editor routing | Inventory |
| `src/PlayerApp.vue` | Exported game shell and loading | Inventory |
| `src/layout/EditorLayout.vue` | Persistent viewport, dock groups, floating panels, async workspaces | Focused shell and import mapping |
| `src/layout/TopBar.vue` | Project/edit/view menus | Focused live German/200% text overflow and dropdown containment repair |
| `src/layout/SideBar.vue` | Main workspace navigation | Inventory |
| `src/layout/StatusBar.vue` | Status and current operation | Inventory |
| `src/panels/SettingsPanel.vue` | Actual Settings route and subpanels | Focused local switch accessible-name repair after live inspection |
| `src/panels/ScenePanel.vue` | Legacy 13-line wrapper; no current `src` import | Focused route search; retained |
| `src/panels/RendererPanel.vue` | Legacy 13-line wrapper; no current `src` import | Focused route search; retained |
| `ProjectManager.vue` | Launcher, template library, recents, migration | Focused; discovery and selection repaired |
| `ConfigPanel.vue` | Component Inspector and property editor | Focused; actual-width stacking and accessible names |
| `RuntimeComponentsInspector.vue` | Render/audio/UI/tile component fields | Focused form layout; shared CSS repair |
| `WorldComponentsInspector.vue` | Navigation, AI, chunks, pools and world fields | Focused form layout; shared CSS repair |
| `GameplayComponentsInspector.vue` | Movement, health, projectiles, collectables | Focused form layout; shared CSS repair |
| `EditorBottomPanel.vue` | Assets and bottom-panel routing | Focused narrow asset fields/actions |
| `BuildSettingsPanel.vue` | Targets, startup scene, delivery, outputs | Focused missing narrow startup selector |
| `ManageWorkspace.vue` | Management route navigation | Focused explanatory-text wrapping |
| `WorldCanvas.vue` | Scene/game rendering, pointer and gizmo interactions | Inventory; runtime audit owns behavior |
| `SceneSideBar.vue` | Entity hierarchy and scene organization | Inventory and dock layout read |
| `SceneTabs.vue` | Scene tab operations | Inventory |
| `ActionBar.vue` | Play/pause/stop and workspace actions | Inventory |
| `ToolBar.vue` | Drawing, selection, transform tools | Inventory |
| `LayerBar.vue` | Scene layer switch | Inventory |
| `WorkspaceBar.vue` | Workspace selection and layout actions | Inventory |
| `WorkspaceManager.vue` | Saved workspace and dock configuration | Inventory |
| `ScriptWorkspace.vue` | Code/graph/event authoring handoff | Delegated scripting audit |
| `ScriptStudio.vue` | Source editing, language tools, debugger | Delegated scripting audit |
| `VisualGraphEditor.vue` | Blocks/nodes and graph inspector | Delegated scripting audit |
| `EventSheetEditor.vue` | Event conditions/actions and object workflow | Inventory; conversion scope is separate |
| `AnimationPanel.vue` | Timeline, clips, rig and animation tools | Inventory; dense-control risk retained |
| `PresentationPanel.vue` | Canvas/UI layout and accessibility authoring | Inventory; dense-control risk retained |
| `RenderingPanel.vue` | Actual rendering workspace | Inventory; dense-control risk retained |
| `MaterialGraphEditor.vue` | Material node editing | Inventory |
| `ParticleGraphEditor.vue` | Particle node editing | Inventory |
| `GraphProductionPanel.vue` | Shader/pass/cache production controls | Inventory |
| `ContentAssetInspector.vue` | Reimport, metadata and reusable resources | Inventory |
| `TilemapPanel.vue` | Tile painting, layers and world metadata | Inventory |
| `WorldToolsPanel.vue` | Navigation, AI, world tools | Inventory |
| `PhysicsSettingsPanel.vue` | Solver, layers and physical materials | Inventory |
| `PhysicsRuntimePanel.vue` | Live body/constraint diagnostics | Inventory |
| `ProfilerPanel.vue` | Performance, capture and budgets | Inventory |
| `ConsolePanel.vue` | Runtime/editor log filtering and navigation | Inventory |
| `UndoHistoryPanel.vue` | History navigation | Inventory |
| `ProjectHealthPanel.vue` | Project validation and repairs | Inventory |
| `NetworkStudioPanel.vue` | Session, peers, replication and diagnostics | Inventory; existing container queries retained |
| `EcosystemStudioPanel.vue` | Packages, publisher, shipping | Inventory |
| `PackageManagerPanel.vue` | Package catalog and dependency actions | Inventory |
| `PluginSettings.vue` | Plugin permissions and lifecycle | Inventory |
| `AutomationStudio.vue` | Permission-bound editor automation | Inventory |
| `TeamWorkflowPanel.vue` | Change lists and semantic merge | Inventory |
| `DeviceInputPanel.vue` | Device input and mapping | Inventory |
| `AccessibilityEvidencePanel.vue` | Runtime accessibility evidence | Inventory |
| `VirtualControlsOverlay.vue` | In-game touch controls | Inventory |
| `AudioSystemPanel.vue` | Mixer controls | Inventory |
| `AndroidDeliveryPanel.vue` | Experimental Android build gates | Inventory; no physical-device certification |
| `SaveDataSettings.vue` | Save slots and data configuration | Inventory |
| `ShortcutEditor.vue` | Keyboard shortcut configuration | Inventory |
| `CreatorLearningCenter.vue` | Feature guides and readiness | Inventory |
| `CreatorOnboarding.vue` | Initial teaching flow | Inventory |
| `ManualViewer.vue` | Bundled manual display | Inventory |
| `CommandPalette.vue` | Searchable commands | Inventory |
| `CreateObjectPalette.vue` | Object/component creation | Inventory |
| `ConnectionBuilder.vue` | Rope/joint connection dialog | Inventory |
| `ContextMenu.vue` | Contextual actions | Inventory |
| `ConfirmDialog.vue` | Confirmation dialog | Inventory |
| `ExternalChangeDialog.vue` | External edits and conflict choices | Inventory |
| `ErrorRecovery.vue` | Error display and safe recovery | Inventory |
| `RecoveryCenter.vue` | Recovery actions and backups | Inventory |
| `EditorFeedback.vue` | Task status and notifications | Inventory |
| `StudioStatusDialog.vue` | Studio status and report dialog | Inventory |

Component filenames without a directory prefix above are under `src/components/`.

## Programmer checks and actual-user checks

Completed local checks for this work: Vue/TypeScript checking after the property-control and launcher changes; the source inventory script; and 57 new template/discovery/component/particle/WASM behavior checks. The main audit separately records live launcher search, no-results disabled creation, and creation from the visible filtered selection. Do not infer coverage of unrelated controls from those checks.

The subsequent browser interaction report records 214 navigation actions passed. Its 260 settings outcomes comprise 241 passed, 5 normalized, 13 blocked, and 1 covered; its seven drag outcomes comprise 4 passed, 2 source-bound/context-reviewed, and 1 context-blocked. Of 579 registered controls, 189 were clicked and 390 were reviewed or blocked. Those reviewed/blocked records are not successful clicks. The layout rerun passed its 257 states (258 results including the console check), including all 27 required Settings combinations, and produced 25 captures. These numbers describe the recorded report scope, not every possible panel state.

After the first passing matrix, an actual opened File-menu inspection found first-row occlusion by the workspace toolbar. Following the stacking repair and rebuild, File, Edit and Help were opened at 1024×640 with German and 200% editor scale. All command centers passed DOM hit testing against their own buttons, all commands fit inside the viewport, and visual inspection confirmed that the first File command was no longer covered. The final rebuilt editor subsequently passed the complete recorded interaction/layout suites again. This distinguishes geometry/overflow qualification from visual and pointer-accessibility checks of an opened overlay.

Required interaction matrix for final UI qualification: English/German/Chinese; light/dark themes; normal and large editor scale; 200% browser text/zoom; narrow/normal/wide windows; Inspector widths 252/320/480px; both dock sides, floating mode, and bottom-panel resizing. For each edited surface, Tab through every field, verify its accessible name, edit both axes, toggle a boolean, undo/redo, save/reopen, and confirm the same runtime/export values. In Build, explicitly change the startup scene below 480px. In Assets, change import settings at narrow width. In the launcher, combine category, difficulty and query, then clear them and check the exact created project.

The entire 70-file source inventory is not a complete 70-panel interactive pass. Dense animation, rendering and presentation studios; every component subtype; all plugins/packages; native file dialogs; physical input hardware; and every translated overflow condition remain to be exercised. A later release must fail its qualification if those required scenarios are not actually run.

The final live accessibility inspection found root Settings switches exposed with the generic accessible name `button`. A focused SettingsPanel repair now supplies each local ToggleSwitch with its enclosing SettingRow's translated label. Explicit `aria-label`/`aria-labelledby` values retain priority. Existing row markup, IDs, model values and mutation handlers are preserved. The rebuilt browser exposed `Compact controls`, `Reduce motion`, `High contrast` and the other row names; toggling Reduce motion on and off updated `aria-checked`, and changing locale changed its name to `Bewegung reduzieren` while retaining the restored false value. This repair does not claim complete screen-reader coverage for every other panel or custom control.

A fresh disposable project was created in the final build, the same browser tab was reloaded, and its recent-project entry was reopened through migration preflight. Open Project remained enabled, no foreign-lock warning appeared, and the editor exposed enabled File save commands. Existing orphan leases created before the fix were deliberately left protected. In the reopened project, the Inspector exposed contextual Camera2D and Transform2D labels; Camera zoom changed from 1 to 1.5, the named `Edit Camera zoom` undo transaction restored 1, and Redo restored 1.5. These are focused user observations, not all-property save/export certification.

## Exact UI edits

- `src/components/ConfigPanel.vue`: contextual native/custom-control accessible names, X/Y naming, named property groups, actual-inspector-width container, stacked property controls below 360px, visible category scrollbar, wrapping search/actions, stacked narrow prefab controls.
- `src/panels/SettingsPanel.vue`: local SettingRow provides its translated label through scoped Vue injection; local ToggleSwitch uses that reactive label only when no explicit accessible name is provided. The row DOM, control IDs, values and update handlers are preserved.
- `src/assets/main.css`: inspector-scoped narrow-width stacking for runtime/world/gameplay forms, wrapping headers/actions and two-column navigation-link fields; checkbox/color rows retain compact geometry.
- `src/components/EditorBottomPanel.vue`: actual asset-inspector container, stacked narrow import/property fields, readable label and action wrapping.
- `src/components/BuildSettingsPanel.vue`: restores the startup-scene selector below 480px and allows scene labels to wrap.
- `src/components/ManageWorkspace.vue`: wraps navigation titles/descriptions and adds vertical padding for readability.
- The same file prevents navigation items shrinking below wrapped content height; longer lists remain vertically scrollable.
- `src/layout/TopBar.vue`: prevents translated menu triggers and status labels shrinking; provides horizontal menu scrolling; anchors dropdowns to measured button/menu geometry in the positioned top bar outside the menu scroller; bounds overlay size and closes stale positioning on scroll/resize. All command actions are retained.
- The same file raises the top-bar stacking context from 500 to 650 so dropdowns paint and receive input above the workspace toolbar's 600 context, while existing modal/palette layers retain precedence. The first-row occlusion was found through an opened-menu visual check, not the rectangle-containment matrix.
- `src/components/ProjectManager.vue`: all library/UI edits are listed in `TEMPLATE_LIBRARY_26_11.md`.
- `scripts/audit-v26.11-ui-source.mjs`: reproducible source-only inventory for every Vue file; does not emit an interactive pass.
- This document records source coverage, confirmed findings, consequences, edits and unrun user checks.
