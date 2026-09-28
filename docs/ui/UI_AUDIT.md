# Nova_A UI audit — repository findings

Status: Phase 0 audit complete; structural implementation and risk-focused verification recorded below (2026-09-28). This audit uses source inspection plus measured production-browser navigation; the existing 26.32 UI is a capability reference, not the new visual design.

## Coverage and evidence

- `scripts/audit-ui-system.mjs` parses all 85 editor Vue files and four CSS files (exported PlayerApp excluded). The preserved baseline is `release-audits/ui-rebuild/source-inventory-before.json`; `UI_INVENTORY.json` records the latest source inventory.
- Baseline: 1,083 native button sites, 222 native numeric inputs, 34 native template ranges, 6,325 literal color/dimension declarations. These are source counts, not unique capabilities or runtime coverage.
- The private render-function NumberRange in ConfigPanel adds another range implementation outside template counts.
- Actual baseline screenshots and requestAnimationFrame observations: `release-audits/ui-rebuild/navigation-baseline.json`, `navigation-baseline-frames.json`, `secondary-baseline.json`.
- Complete per-surface findings and retained capabilities follow below. Supporting low-level components are individually listed in UI_INVENTORY.json; no assertion of testing every conditional branch is made.

## Executive findings and priorities

P0: outgoing workspace removal/opacity plus first-use async loading creates measured near-blank central frames. Root shell and canvas identities remain stable; the defect is content navigation, not proven full-window reconstruction. Manage additionally keys its main host by section. Profiler annotation and console search state are demonstrably lost on route round trips.

P0: four overlapping global layers (main, editorReadability, editorStudio, editorForms), scoped forms and private render-function widgets compete for control sizing. Replace this editor cascade with tokens and shared native/component primitives; preserve exported-player styling separately.

P1: hierarchy, inspector, toolbar, assets, scripts, animation and secondary studios use independently styled commands, form grids and cards. Replace primary structures and command grouping while preserving their existing domain handlers. Source editor, graph, timeline, waveform, collision matrix and virtual-list coordinate geometry are functional exceptions, not ordinary control styling.

P1: duplicate icon strategies and platform-dependent glyphs; replace with one original SVG family and accessible names. Context-menu placement and keyboard behavior, and Shift+A firing inside editable fields, are directly related defects.

## Shell contract and replacement

The current `App.vue` uses a project-manager/editor v-if boundary. Project replacement is an intentional lifetime boundary and must continue to dispose project-owned views. Normal workspace navigation must not cross it. `EditorLayout.vue` already retains WorldCanvas; keep that capability and its node identity.

Replace `Transition mode="out-in"` with a shared async content host: resolve the requested module before swapping displayed content; reject stale async completions; retain established views through Vue KeepAlive. A failed load keeps the previous usable content and shows a retryable error. Remove route opacity/translation animation instead of masking the gap. Keep the Manage host node stable. Keep hierarchy and bottom-dock hosts alive during ordinary navigation while suspending preview/visibility-specific work on deactivation. Pending drafts remain project scoped and remain available to save validation.

User-requested workspace presets and explicit focus/maximize/dock moves may intentionally alter geometry. Switching content within an existing workspace must not resize unrelated regions. Existing resize, keyboard, history, focus, pin, split and floating-dock capabilities remain. Full-window floating native windows are not introduced.

## Shared component disposition

| Current implementation | Decision | Replacement / retained contract |
|---|---|---|
| Four editor global CSS imports | Retire from editor | Single editor.css with tokens.css; main.css remains player-only |
| EditorIcon plus Unicode/inline variants | Rewrite/migrate | Original coherent SVG family; semantic names and accessible controls |
| NumericExpressionInput | Preserve behavior, replace presentation | Shared compact numeric primitive; draft registry, validation, keyboard and history events survive |
| LimitNumberInput / PathTextInput | Preserve behavior | Shared control geometry; Infinity and path grammar remain semantic content |
| ConfigPanel private row/section/toggle/range | Replace | Shared property components and slider with bound precision companion |
| Settings private row/toggle | Replace | Same shared property system |
| Raw ranges | Replace | UiSlider with one native track/thumb and event contract |
| Native inputs/selects/checkboxes/textareas | Shared native primitives | Central tokens/classes; preserve native v-model modifiers and event sequencing where wrappers add risk |
| PanelResizeHandle | Preserve logic | Tokenized appearance; pointer/Escape/keyboard/Home/End/reverse/reset behavior |
| modalFocus directive | Retain | Shared dialog shell reuses nested focus containment and restoration |
| Repeated panel/dialog/menu/tree/tab presentation | Replace | Shared button, panel header, tree row, tabs, menu/dialog contracts |

## Validation strategy

Test source-independent behavior: cold and warm navigation frames, persistent shell/canvas/main identities, draft/filter round trips, project replacement isolation, actual numeric input/slider/history/save, hierarchy virtual geometry, shortcuts in text fields, modal keyboard/focus, asset operations and animation preview lifetime. Build and typecheck after integration. Inspect actual representative surfaces at 1366×768, 1600×900 and 1920×1080 plus supported scale/locale stress cases. Record failures and repairs, not only final passes. Do not spend checks on unrelated solver/performance/security matrices.

## Detailed surface audits
# Phase 0 surface audit — hierarchy, viewport commands, assets, animation and dialogs

Read-only audit against AGENTS.md, docs/ui/UI_SPEC.md, UI_AUDIT.md, MIGRATION.md, DECISIONS.md and the complete rebuild request. No production source changed. Existing code supplies capability contracts, not the replacement's visual reference. Numbers below count template elements statically, not every rendered control or conditional state.

## 1. Hierarchy and scenes

**Purpose/entry:** SceneSideBar.vue is the resizable entity/scene dock in EditorLayout; SceneTabs.vue selects loaded scenes above the viewport; LayerBar.vue manages authoring layers in the viewport.

**Capabilities to preserve:** active and additive-loaded scenes; scene reload, create and rename; scene navigation history; dirty/validation/external/prefab markers; templates, inheritance, tags, named layers and dependencies; entity search including tags/components and ancestor retention; selection filters and saved filters; pinning and selection history; shift-range and Ctrl/Meta-toggle multi-selection; inline rename; visibility/lock/enabled toggles; entity context menu; root/parent/sibling drag/drop; preserve-world reparenting; docking, collapse, resize and maximize.

**Data/callbacks:** physicsState and sceneManager are authoritative. Scene activation uses setSceneLoaded/setActiveScene plus synchronizeHistoryBaseline. Rename/change actions push resource-scoped history. Hierarchy selection calls selectEntities and setActiveLayer. Dragging operates on selectionRoots, then setParent; drops distinguish reorder vs parent insertion. canEdit enforces editing mode; entity locks block rename/drag. SceneTabs changed() and creation helpers preserve authoring validation and history. Layer context actions use editor store functions.

**UX/visual problems:** separate scene list and scene tabs duplicate navigation; hierarchy header stacks filters ahead of the actual tree; four persistent row actions consume name width. Disclosure/shape/pin/visibility/lock/power/scene controls still use Unicode. LayerBar overlays a rounded floating box on useful canvas. SceneSideBar uses 29px scaled rows while spec suggests24px. SceneSidebar scrollbar and indentation create independent geometry.

**Architecture:** expandedUuids, searchQuery, selectedSavedFilter, selection history, rename draft and scroll refs live in the dock instance. EditorLayout destroys SceneSideBar via v-if when routes/focus mode change. Virtual padding and overscan depend on hierarchyRowHeight=Math.ceil(29*uiScale); migrating row CSS alone will desynchronize scrolling. SceneTabs owns another local settingsOpen state. Three surfaces each invent buttons and headers.

**Replacement:** one persistent scene/explorer dock with scene switcher and hierarchy; one compact shared search/filter toolbar, with advanced filter menu. Shared tree rows with explicit disclosure, object icon, name, status and hover/focus-revealed secondary actions. Keep loaded-scene document tabs in the central region, with creation/settings in its overflow; avoid removing additive scene controls. Move layer controls into a small dock section or viewport-layer popup rather than a floating card.

**Shared controls:** PanelHeader, TreeRow, IconButton, Input/Search, Menu, Tabs, PropertyRow, PanelResizeHandle (behavior retained, tokenized presentation).

**Complexity/risk:** high. Virtualization, drag boundaries, locked objects, selection ranges, ancestor search, undo and scene activation cannot be redesigned by substituting generic rows without adapters. Check 1000+ objects and deep trees; resize while scaled; reorder/reparent undo; dirty scene switching; rename Enter/Escape/blur.

## 2. Workspace/context and viewport toolbars

**Purpose:** WorkspaceBar selects task presets/history/layout/commands; SideBar exposes context tools; ToolBar owns transforms, creation, snapping, guides, alignment and camera framing; ActionBar controls runtime.

**Capabilities/data:** keep applyEditorWorkspace, openEditorTool, openManageSection and navigationHistory; state.activeTool select/move/rotate/scale plus drawing and pivot/rect/path/polygon/collider/measure tools; alignSelection/distributeSelection/groupSelection/mirrorSelection/rotateSelection90; requestViewport and isolate; preferences snapToGrid plus authoring snap flags; ruler/guide add/lock/clear; overlay aspect/custom resolution. ActionBar's physics WASM readiness, preflight, gameplay session begin/step/stop and restoration remain unchanged.

**Problems:** WorkspaceBar, context rail and bottom tabs duplicate several destinations; context rail uses56px label tiles; ToolBar exposes four labeled menus and mixes local inline SVG with authoring glyphs. Several rows of chrome precede content. Hardcoded34/36/38px controls and local9px radii conflict with shared28px toolbar geometry. Large scale legacy global flex-basis fixes exemplify layered override risk.

**Replacement:** one persistent top command strip with document/project menu, concise workspace tabs, shared play transport and status. One compact context rail only for distinct destinations; central viewport toolbar groups primary transform icons, mode-dependent tools, snap and view menus. Menu items retain meaningful labels and shortcuts. Layout affordances in panel headers reuse one shared implementation.

**Architecture/risk:** medium-high. ToolBar registers global keydown only while mounted. `handleShortcut` checks Shift+A before checking editable target, so typing capital A in inputs can open Create Object; capture as directly related bug. Generic keyguard should consider contenteditable and active modal, not only INPUT/TEXTAREA/SELECT. Persistence requires explicit active-tool keyboard guard rather than multiple hidden toolbars retaining global listeners.

**Verification:** transform shortcuts outside text fields; uppercase-A text entry; all creation/arrange/snap commands; tool selection without state reset; preflight blocking; play/pause/step/stop restore; keyboard focus and scaled viewport fit.

## 3. Asset browser and importer

**Purpose/entry:** EditorBottomPanel.vue currently combines bottom dock navigation and most asset browser/importer behavior (860 lines). ContentAssetInspector and AssetImagePreview provide specialized views.

**Capabilities:** file/folder selection and moves; search/type/tag/favorite/collection filters and saved filters; grid/list virtualized browser and thumbnails; import with cancellable job queue/retry; batch reimport and apply; create folder/script/graph/scene/resource; asset rename/trash/reference cleanup; instantiate prefab/scene and replace selection; open script/graph/event/animation editors; source/import/dependency/provenance/platform importer pages; sprite slicing/trim/pivot/frame animation; texture/audio profiles; font coverage/fallback/features; platform overrides and presets; external source comparison/revert/resolve; dependency navigation, missing-reference repair and unused assets; deterministic atlas/content closure diagnostics; project-folder export; plugin contributions.

**Dataflow:** AssetDatabase state/operations owns content. Changes record pushHistory or pushAssetReimportHistory; delete uses requestConfirmation, moveAssetToProjectTrash and reference-clearing functions. Opening an asset invokes the corresponding studio API; selection GUID/path and resource refs must remain stable. Browser virtualization recalculates rows using viewport width, thumbnail size and display mode. Folder display names must never replace full folder keys/drop targets. Local preview URLs need lifetime cleanup.

**Problems:** browse, creation, content validation, import pipeline and dock routing share one component.67 template button sites,34inputs and1rawrange, plus highly specialized children. Toolbar reflows across multiple rows. Folder tree/asset content/importer form a squeezed three-column dock. Same component owns many rounded importer cards, duplicated CSS blocks (atlas-report/content-closure repeated), responsiveness and emergency full-page modes. View changes can reset local importer selection/error state.

**Replacement:** extract a stable AssetsWorkspace with explorer/list/inspector slots and a dock adapter; AssetToolbar gives import/add/filter/view actions as compact shared controls. Search stays adjacent to breadcrumb path. List and thumbnail modes share a common selection model. Asset inspector uses shared property sections and structured diagnostics, not nested cards. On narrow docks choose a deliberate browser/details split rather than automatic conditional wrapping.

**Shared:** PanelHeader, TreeRow/ListRow, IconButton, Menu, Search, Tabs, PropertySection/Row, NumericInput/Slider, progress/task list and splitter.

**Complexity/risk:** high. onBeforeUnmount(cancelAssetBatch), ResizeObserver disconnects and draft ownership are observable semantics. Replacing parent teardown with v-show must not leave import jobs accidentally cancelled or abandoned; explicit project/session lifecycle required. Preserve selection/drag MIME and destructive confirmation. Test actual import/rename/move/reimport/repair/trash undo; list virtualization; plugin entries; source profiles and export.

## 4. Animation editor

**Purpose:** AnimationPanel.vue implements six asset families and multiple canvas/property modes.

**Capabilities:** clip dope sheet, curves/tangents/interpolation/easing, tracks/keys with range/box/drag selection and clipboard, retime/ripple/reduce/slice, record mode, markers/events/sprite frames/command tracks and root-motion diagnostics; controller states/parameters/layers/blend trees/transitions/conditions/synchronization; rig bones/poses/IK/constraints/attachments/retargeting; skin rig weights/auto-weight/heat view; timeline tracks/clips/markers/skip/resume; animation masks; preview/pause/seek/stop/record; dirty draft retention/conflict/validation and explicit save/discard; resizable synchronized track/property panes.

**Dataflow/lifecycle:** assetReference/readTextAsset/updateTextAsset and animationAuthoring decode/encode/normalize own persistence; animationStudioState owns recording/view; studioDraftRetention registers ownership and retains candidate docs. selectedGuid watcher retains old draft and stops preview before loading next. createAnimationPreviewSession owns restoration. onBeforeUnmount retains draft, stops preview, disposes session, unregisters draft owner, clears inspectionTimer and observers, cancels key drag, clears open recording doc. Current document ref is intentionally editable only when not previewActive (inert).

**Problems:** 82rawinputs,4rawranges,78button sites. Six create text buttons precede asset choice; transport mixes recording, time, zoom, fps, speed, tangent and edit commands. State/layer/transition/root-motion diagnostic cards compete with actual canvas. Dense forms and property editors independently implement field geometry. Unicode transport, track and rig icons. Source compressed into long lines impedes review.

**Replacement:** persistent studio frame: compact asset picker/create/save and transport; shared track/entity list left; primary timeline/curve/controller/rig canvas center; shared property inspector right. Context mode selects relevant list and canvas but keeps geometry stable. Asset-family create actions in one labeled add menu. Move advanced editing into inspector sections/menus. Use shared slider+numeric for scalar zoom/weight; timeline curve/key geometry is a specialized editor, not a standard slider and must retain coordinate mapping.

**Complexity/risk:** very high. Do not indiscriminately KeepAlive it: preview must stop when deactivated and drafts must remain project-scoped. Check document dirty-save-reopen, draft conflict, preview stop restoration, selection drag Escape, tangent editing, synchronized scroll, each of six asset families and timeline events. Pure UI migration does not require replacing animation maths.

## 5. Project manager and creation/migration

**Purpose:** ProjectManager launches/continues/imports/creates/upgrades projects, with templates and recent projects.

**Capabilities/data:** retain createNewProject/openProjectDocument/openRecentProject/continueCurrentProject, file/folder/archive flows, path/name validation, busy/error state, locale/manual, template categories/search/difficulty/sort/counts/previews/details/manual tasks, pending upgrade preflight/backups/migration plan/lock conflict/read-only fallback/rollback, read-only original download. Hidden file inputs are platform integration, not redundant UI.

**Problems:** marketing-like hero with large whitespace; recents card and many template cards; creation action below long scrolling gallery/details; name field visually disconnected from location; multiple bespoke nested modal implementations and category glyphs.25button sites and8inputs, extensive local dimensions.

**Replacement:** compact launch window with recent-project list and a small command toolbar. New Project shared dialog has fixed project identity/location area, template list with preview/details adjacent, and persistent footer with Create/Cancel. Template image tiles may remain only where semantically useful for choosing a game template, per spec's card exception. Upgrade/read-only views become distinct shared dialog content; destructive/open-readonly wording must remain explicit.

**Complexity/risk:** high because project IO and migration are not cosmetic. Preserve no-mutation-before-preflight guarantees, schema compatibility, path validation, locks and rollback. Verify existing/open ZIP/create template/save/reopen and migration controls. Retain useful template tutorial content behind details/manual actions, not delete it as 'excess text'.

## 6. Dialogs, menus and creation/command palettes

**Surfaces:** ConfirmDialog, ExternalChangeDialog, StudioStatusDialog, WorkspaceManager, CreateObjectPalette, CommandPalette, ContextMenu, SceneTabs settings popover and ProjectManager overlays.

**Capabilities:** confirmation Promise resolution/cancel-default; nested modal focus and restore via vModalFocus; Escape and backdrop rules; external version diff/reload/keep-editor/keep-disk; diagnostic privacy toggles; workspace profile/layout CRUD/import/export; object category/search/favorites/recent/compatibility and creation at intended canvas point; command/quick-open search with active index/arrows/Enter; plugin command contributions; entity/layer context commands and destructive guards.

**Problems:** independent scrims, blur, card radii18/10/8, z-indices4000/8000/9200, width/padding/button definitions. Creation palette uses per-object Unicode glyphs; command palette command.icon strings use another family. ContextMenu is a div with buttons and hardcoded viewport clamping (height390,width220) rather than measured placement; no menu semantics/roving keyboard system. Several close glyphs lack explicit accessible labels. WorkspaceManager repeats text CRUD commands.

**Replacement:** one Dialog shell with named header/body/footer slots, centralized overlay token and modal-focus behavior; one anchored Menu with measurement, Escape/outside dismissal and keyboard navigation; compact searchable list palettes sharing list row/icon/shortcut styling. Safety text actions remain labeled. Modal focus directive behavior should survive or be integrated into shared shell, not duplicated. Source-preview textareas and script editors are not ordinary compact inputs.

**Complexity/risk:** medium-high. Nested confirmation must resolve the correct pending request and restore previous focus. Modal hierarchy and runtime locks cannot be lost. Test multiple modal layers, confirmation cancel default, Escape, backdrop, keyboard-only menu and command execution, external conflict resolution and export privacy gates.

## 7. Shared-system conclusions and regression boundaries

- Existing EditorIcon mixes Godot-derived16px filled shapes with Nova24px outlines; ToolBar has independent inline SVG; data catalogs and menus still emit Unicode. The new source-of-truth requests one coherent family and forbids direct imitation. Replace the icon implementation with one original, consistent16px strategy and semantic alias map; preserve attribution while any copied geometry remains. Don't remove legal notice prematurely.
- PanelResizeHandle already has meaningful reusable logic: scaled drag coordinates, pointer capture, Escape cancel, keyboard/Home/End, reverse orientation, reset, disabled handling and cleanup. Preserve behavior and tokenize appearance. vModalFocus handles nested overlays/focus restoration; reuse it.
- Raw controls in shared property/editor files must not merely receive another high-specificity overlay. Shared components need native event/attribute forwarding and explicit v-model semantics; property edits depend on both input/change and transaction boundaries.
- Current dock/workspace transitions use v-if, async loading and out-in transitions. Evidence supports teardown/blank-gap candidates, not a measured frame-by-frame flicker proof. Runtime frame capture/navigation test needed.
- Structural ownership of persisted state must be distinct from visibility. Never turn every route into v-show without active/inactive cleanup for previews, keyboard listeners, observers, timers, drag state and project identity.
- Migrate template/control structure and remove the superseded scoped CSS concurrently; retain only specialized spatial CSS for canvas/timeline/virtual-list math. Shared tokens must drive the matching JS row metrics.
- Verification should target changed behavior: typecheck/build, component model/event forwarding, hierarchy and asset virtual scrolling, object and asset transactions/undo, editor tool hotkeys, modal focus, animation draft/preview lifetime, project IO and visual snapshots at1366×768/1600×900/1920×1080 plus existing text scales. Untouched physics algorithms need no exploratory rewrite or Godot parity audit.

## Source references and review limits

Read templates, state/import/lifecycle/action definitions and local styles of the named surfaces; action helper modules were identified as contracts, not exhaustively semantically audited. The prior26.32 route captures supplied defect history only, not the new visual reference. This phase did not modify UI or run a new interactive visual audit.


---

# Phase 0 forms, inspector and secondary-tools audit

Read-only audit, 2026-09-28. Read AGENTS.md, UI_SPEC.md, UI_AUDIT.md, MIGRATION.md, DECISIONS.md and the supplied complete-rebuild request. No UI source changed. This audit supersedes the previous assumption that 26.32 containment fixes constitute a shared design system.

## Evidence and common root causes

- `src/main.ts:8-11` loads main.css, editorReadability.css, editorStudio.css and editorForms.css concurrently. They overlay scoped component rules. main.css retains older mandatory centered-field/full-width/container rules; the newer layers override those with specificity and important declarations. Retire the geometry and typography overrides once shared controls are authoritative; do not add a fifth competing emergency stylesheet.
- Static Vue start-tag inventory (not runtime instance counts): 440 NumericExpressionInput usages, 222 native number inputs, 34 native range inputs. ConfigPanel also creates its range programmatically in local NumberRange. Raw ranges: AnimationPanel4, EditorBottomPanel1, MaterialGraphEditor2, PresentationPanel3, RenderingPanel11, RuntimeComponentsInspector4, VisualGraphEditor1, WorldComponentsInspector1, SettingsPanel7.
- Existing geometry is not centralized: NumericExpressionInput owns 28px step buttons and character-based flex sizing; SettingsPanel owns 47px property rows/230px control columns; ConfigPanel owns 58% controls and 92px numeric ranges; Gameplay/World inspectors use 56% columns overridden by stacked labels; WorldTools uses independent 280px form-grid columns; Network uses independent row/grid controls. Previous visual failures (20px search, 100px-tall numeric fields, 693px slider, 62px annotation) were consequences of incompatible flex bases, font-relative bounds and cross-axis stretching.
- Shared behavior exists but shared presentation does not: NumericExpressionInput, LimitNumberInput, PathTextInput are real behavior owners. ConfigPanel defines private InspectorSection, PropertyRow, ToggleSwitch and NumberRange; SettingsPanel independently defines SettingRow and ToggleSwitch. Reuse behavior; extract shared widgets and delete private visual implementations.
- Routine controls still use Unicode: ConfigPanel ComponentTools reset/up/down/delete and section chevron/star; numeric +/- steppers; WorldTools add/remove/bake actions; Rendering layer arrows/remove; Physics material addition and network channel/RPC actions. Existing callback logic should remain. SVG tooltips and accessible names replace the representation.
- Most precision-relevant scalar ranges have only a slider or output, not editable precision: runtime spatial blend/restitution/shadow softness/opacity, world avoidance priority, rendering ambient/material/post-process, settings volume/scale/zoom/thickness, audio gain/wet/send. Consolidate all standard range UI into one slider plus numeric companion; timeline scrub/graph zoom remain specialized semantics but use the same track/thumb primitive.

## Preserve shared behavioral contracts

`NumericExpressionInput.vue`: expression parsing, finite/integer/range checks; keep invalid draft visible; Escape resets; Enter/blur/change commits; ArrowUp/Down and buttons step on the minimum-relative grid with decimal precision/clamping. `data-resource-key`, `data-numeric-expression`, invalid flags, aria-describedby and all forwarded attrs must survive. It registers with pendingDrafts so project save validates every draft before committing any. Synthetic bubbling change from programmatic/keyboard commits reaches history and prefab normalization owners. Do not double-dispatch change after a pointer release.

`LimitNumberInput.vue`: +Infinity means unlimited; last finite value remembered per resource and reset when identity changes; toggling emits model update and native bubbling change. Infinity is semantic content, unlike decorative Unicode icons. Preserve this control's finite/unlimited workflow.

`PathTextInput.vue`: point/tangent grammar, finite coordinates, count limits, dirty text retention, resource-identity reset, external clean-value updates, pending-save integration, invalid aria state. Keep multiline editing; do not constrain source/code editors to scalar-control geometry.

`simulationForm17.ts`: focus remembers original native number; change rejects NaN and browser min/max under/overflow, restores previous text and dispatches guarded change, then invokes owning commit. Replacing native numbers by expression controls changes event target type from number to text: validation must be carried by the new numeric component, and the owning commit callback must still run. Avoid globally removing this guard before every dependent field has equivalent validation.

## Per-surface findings and replacements

### Inspector — ConfigPanel.vue (1180 lines)
Purpose/capability: selection and multiselection, entity ownership/visibility/layers/tags, transform/rigid body/collider, sprite/text/camera/scripts, path authoring, component add/reset/copy/paste/preset/reorder/remove, prefab apply/revert/variant/unpack/conflicts, property defaults/units/overrides/pin/modified filters, keyframe recording, plugin contributions, runtime impulses and connection controls.

Must preserve: onConfigChange normalizes entities, captures prefab overrides, records animation properties, and merges history with resource/control identity. Component paste runs a rollback-capable history transaction. Range pointer gesture belongs to inspector, cancels on selection identity change and unmount, commits once on pointerup. Multi-position center/shared and mixed states differ. PropertyRow recursively adds accessible labels and X/Y suffixes; that behavior cannot disappear with markup extraction. Transform component removal is forbidden. Path and collider geometry special cases remain in the domain code.

UX/visual problems: crowded repeated component command strips; all details/defaults visible in repeated rows; X/Y mainly exist as accessible suffixes instead of visual axis labels; nested form-card density; local primitives produce a separate visual family; several runtime inspectors have their own form systems. Local NumberRange passes min/max to range but does not pass them to NumericExpressionInput, so the companion's bounds contract differs (eventual entity normalization may still clamp).

Replacement: a persistent inspector header (selection, search, filters), reusable collapsible PropertySection, compact PropertyRow and explicit axis-labelled NumericField pairs, contextual property-details disclosure/menu, shared component action toolbar with SVG IconButton. Keep ConfigPanel domain handlers while extracting presentation. Shared SliderField replaces local NumberRange, carries min/max/step/resource key and inspector-owned gesture hooks. Complexity HIGH; risks draft loss, duplicate/absent history commits, filter omissions, prefab/animation record loss, plugin actions and multiselection.

### Component families — RuntimeComponentsInspector.vue, GameplayComponentsInspector.vue, WorldComponentsInspector.vue
Purpose/capability: animator/skeleton/timeline/audio/tilemap/particle/light/shadow/joints/game UI; grid/platform/top-down movement, health/damage/collectibles/projectiles/spawner/cooldown/lifetime/camera follow; navigation/baking/AI/world chunks/pools/particle production.

Counts: runtime132 expression fields+4 ranges; gameplay35 expression fields; world31 expression fields+1 lazy range. Preserve optional package gates, controller-default parameter synchronization, directional-light disabled state/explanation, map resizing/editor entry, joint initialized=false resets, UI image import, navigation bake/cancel/clear/history, dependency limit128, simulation guard, pool/stream diagnostics and entity resource identity.

Problems: bespoke repeated section/card markup, 56% control columns then unconditional stacking, verbose headers, raw sliders bypass shared geometry and precision. Replacement: common property sections and rows with domain-specific slot controls, shared axis fields/resource picker/checkbox/slider. Inspector must remain the parent change/transaction owner; family components should not create unrelated new history owners. Complexity HIGH; risks conditional component coverage and new wrappers swallowing native focus/change/pointer propagation.

### Settings — src/panels/SettingsPanel.vue
Purpose/capability: editor/project/runtime scope and search, theme/palette/locale/scale/accessibility preferences, performance presets/overrides, script configuration, audio levels, devices/input mappings/advanced bindings/conflicts/recording, physics settings, editor grid/snapping/render settings, save/autosave/recovery/defaults.

Must preserve: editor preference changes must not become project mutations; theme-light clears high contrast; some fields author project state. Input actions keep original array index under filtering. Device polling is installed/cleared on lifecycle. Autosave availability and scope labels remain. Current seven sliders include UI scale and audio volume; numeric companion permits precise input without removing outputs/units.

Problems: page-scale Settings heading, card hierarchy, 47px rows and separate switch definitions; long-form appearance in editor workspace. Replacement: compact settings navigation/search at panel top, categorized PropertySections, shared rows and switch/checkbox, SliderField plus compact values; detailed help in disclosures rather than paragraphs in every row. Complexity MEDIUM/HIGH because editor/project scope and input binding paths differ; regression tests must include scale/locale and preference persistence without dirtying project.

### Physics settings — PhysicsSettingsPanel.vue
Purpose/capability: profiles, fixed timestep/catch-up/interpolation/budgets, gravity/damping/time scale, diagnostics/units, named collision layers and symmetric32x32 matrix, collision preset pairs, material assets, shape conformance, debug/test entry.

Must preserve: syncProfile copies tick/catchup/interpolation, commit normalizes globals/pushes history; collision bits use unsigned32 arithmetic including bit31; matrix edits are symmetric; material defaults/selection/save and density semantics survive. Simulation guard controls invalid values.

Problems: physics subpage composed of cards, horizontal table regions and detached labels; layers and matrix are semantically tables and should remain so rather than being turned into arbitrary stacked cards. Replacement: tabbed Simulation/Layers/Materials/Diagnostics panel, compact property groups, virtualized/scrolling layer rows and matrix, split material list/property editor. Shared rows/numeric/resource selector/icon toolbar. Complexity MEDIUM; risks bit masks, preset commit ordering and live running simulation edits.

### Rendering — RenderingPanel.vue
Purpose/capability: lighting/material/shader/visual-material graph/particles/postprocess/production-media/diagnostics/quality; material typed uniforms, graph layers, raw JSON, source preview, asset save; particle asset graphs; post and quality volumes; texture streaming/captures/recommendations.

Must preserve: dirty material/particle draft retention; external-source conflict blocks overwrite; pending fields settled before save; malformed uniforms/textures JSON remains visible and neither half is partially saved; debounced120ms preview and canvas choice; preview timers and registration cleaned on unmount. schedulePreview, setScalar/setScalarValue, setUniformComponent, syncPostPreset and renderer-reset callbacks have different semantics. Material source and JSON textareas require wide code surfaces, not short property sizing.

Problems: repeated card grids, arbitrary numeric/grid rules and11 raw ranges; material layer toolbar uses glyph arrows/cross; same postprocess fields repeated under different tabs. Replacement: asset list + main source/graph/preview document + shared right property pane; diagnostics as dense table/list; sectioned project render settings. Reuse source editor geometry, consolidate duplicated property presentation without dropping routes. Complexity HIGH; risks external conflict handling, preview lifecycle, asset selection drafts, shader fallback and source editing widths.

### World Tools — WorldToolsPanel.vue
Purpose/capability: character motion, areas/effectors, navigation agents/regions/obstacles/links/cost areas, AI/behavior/state machine, streaming/chunks/portals, pooling, simulation diagnostics and rope lattice creation.

Must preserve: 66 native numeric bindings mostly lazy; simulation focus/change guard; JSON/polygon validation; package enablement; navigation bake/cancel; live status; selected entity component requirements; history for link/cost/effector add/remove. Runtime/navigation/streaming engine operations remain domain functions.

Problems: high duplicated inspector capacity presented again as large form grids; every numeric owns width/min-height patches; production lists were reduced to stacked blocks by emergency rules. Replacement: stable tool subnavigation, component-required empty state, sectioned selected-object property editor using shared controls, dense link/cost tables, adjacent diagnostics. Share presentation schemas/rows with world inspector where functionality overlaps without moving domain ownership casually. Complexity HIGH; risks lazy commit timing, invalid values reaching simulation, optional packages and bake job state.

### Network Studio — NetworkStudioPanel.vue (726 lines)
Purpose/capability: permission/session/transports/services/local discovery/connect/reconnect; channels/RPC/security/protocol bounds; replication/interest/authority/scene handoff; local multi-instance builds/launch/stop/logs; latency/loss simulation; multiplayer replay/session save/restore; diagnostics/packet/rollback timelines.

Must preserve: optional package disabled empty state and dynamic loading; permission grants/revocations require existing confirmations; connectionIdentity watcher disconnects changed active connections rather than silently reusing stale identity; commit awaits nextTick then serialize/normalize/push project history. Built-in channels cannot be removed; custom removal migrates RPC references. Multi-instance platform/role/permission/template prerequisites remain. Diagnostic interval and local lobby directory teardown currently depend on unmount; persisting the panel requires explicit active lifecycle suspension, not simply removing cleanup.

Problems:31 raw numeric fields, numerous bespoke cards/channel/rpc grids and duplicated tab handling, long explanations mixed with form data. Replacement: shared keyboard Tabs + persistent session status bar; compact session properties; channel/RPC/replication tables with selected-row property inspector; orchestration and diagnostics as lists/timelines. Keep external/network commands visibly distinct and existing authorization prompts. Complexity HIGH; risks unintended connection/start, timer leaks from keepalive, prerequisite bypass, commit normalization and transport identity.

### Presentation / device / build secondary forms
PresentationPanel owns responsive UI/theme/localization drafts plus audio mixer/audition and accessibility. Preserve retained studio drafts/conflict guards, CSV/PO imports, target canvas preview, mixer gesture rollback and waveform ownership. Audio gain/wet/send ranges need shared SliderField but existing beginMixerGesture/commitAudio must remain. Do not replace waveform/curve surfaces with ordinary form sliders. DeviceInputPanel preserves capture/listeners/polling cleanup, sensor permissions/orientation and calibration; use compact grouped rows. BuildSettingsPanel preserves platform/profile/preset scene ordering, preflight/build/progress/cancel/history and actual export commands; stage checklist and diagnostics table replace dashboard tiles. Complexity HIGH for audio/drafts, MEDIUM for device/build presentation.

## Replacement architecture recommendation

One editor design-token layer plus shared components under src/components/ui. Suggested primitives: UiIconButton, UiButton, UiTextInput, UiSelect, UiCheckbox, UiNumberField (existing expression behavior adapted), UiSlider (native range geometry and events), UiSliderField (UiSlider + UiNumberField), UiPropertyRow, UiPropertySection, UiTabs and UiPanelHeader. Names can follow consolidated architecture, but no duplicate local equivalents should survive.

Event contract must be explicit: update:modelValue for reactive values; input for live previews; change/native bubbling boundary for guarded domain commits; pointerdown forwarded from actual range input so existing target checks still work; disabled/readOnly/aria/min/max/step/resource metadata passed to the actual input. Preserve modifier semantics (lazy vs live), never assume every scalar uses identical history routing. Pure UI wrappers do not import engine stores or grant network permissions.

Define numeric width, expression width, slider track length, thumb size, axis label measure, row height, icon button geometry and property-column measures once. For narrow docks stack controlled rows, allow vertical scrolling, and retain readable min field width. Sliders stay the same intended measure independent of value/label, clamped only to supported host constraints. Remove per-screen numeric/range CSS in the same migration as replacing its controls.

## Verification that buys risk reduction

1. Shared numeric behavior regression: valid expressions, invalid/empty/NaN, min/max/integer, decimal stepping, mixed state, resource change, save while focused, Escape restore, no duplicate history.
2. Slider live/update/change and keyboard route; one gesture one undo; cancellation and selected entity change rollback; pointer events reach existing owner; bounded numeric companion shares limits.
3. Inspector single/multi selection + prefab override + animation record + property copy/paste/reset/pin/modified + component controls; preserve data/control audit selectors or intentionally migrate tests with evidence.
4. World/physics invalid lazy native numeric rollback before simulation; bit31/matrix symmetry; navigation link/bake conditional forms.
5. Rendering and presentation dirty asset switch/unmount/reopen/external conflict and save focused field; lifecycle repeated navigation. Network keepalive must stop diagnostics/discovery when inactive without disconnecting intentionally running sessions merely because a UI tab changes.
6. Actual docked/maximized screenshots at1920x1080,1600x900,1366x768, selected/pending/error/disabled states and supported type scale/locales; verify stable geometry, no source textarea/gutter damage, no competing legacy control rules.

No claim of exhaustively testing all these behaviors in Phase0. This is source-based audit evidence and migration guidance; the consolidated audit and implementation verification must record executed coverage.


---

# Phase 0 — navigation, script, debug and ecosystem audit

Read-only application audit, 2026-09-28. Read AGENTS.md, UI_SPEC.md, UI_AUDIT.md, MIGRATION.md, DECISIONS.md and the complete attached rebuild request. PROJECT.md is absent. Only disposable `.cache` diagnostics and `release-audits/ui-rebuild` evidence were created; no application source was edited.

## Measured navigation findings

Evidence: `release-audits/ui-rebuild/navigation-baseline.json`, `navigation-baseline-frames.json`, and route PNGs. Baseline viewport1366×768, production26.32, actual mouse/keyboard inputs. Each rAF sample reads DOM node identity, geometry, visible central surfaces and effective ancestor opacity. This measures application rendering state, not physical-monitor flicker; PNGs are stable route captures.

- The editor root, workspace control row, main container, content container and WorldCanvas retained their node identities across all tested workspace switches. Do **not** describe the current defect as a proven full-shell remount.
- First Design→Script switch recorded6 near-blank samples spanning308.6ms between first and last affected sample. Script→Manage had3 spanning97.1ms; Manage→UI had5 spanning63.9ms. Warm repeats still had2–3 affected samples. These spans are sampled intervals, not frame-rate or exact blank-duration guarantees.
- `EditorLayout.vue:29` wraps async Manage/Script/Presentation components in `Transition mode="out-in"` with150ms opacity/180ms transforms (`:177`). The persistent viewport is immediately hidden when the active page changes (`:167`). These are evidence-backed causes of a central empty/dim interval while old content leaves and replacement loads/enters.
- Manage section switches replaced `.manage-body>main` node identity (19→21→23→25→27→29→31 in this run). `ManageWorkspace.vue` explicitly keys main by section and mounts async components through v-if. First Automation/Packages/Project/Rendering/Build transitions each had2 empty child samples; settings revisits had0. The parent shell stayed stable.
- The control-row geometry remained stable. Editor-content geometry had2 states on Manage→UI and UI→Design: current preset switching intentionally changes content/dock availability. Do not call all such changes random without a defined new layout contract.
- An unsent Profiler annotation typed as `baseline annotation draft` became empty after Design→Script→Design and returning to Profiler. A Console search filter became empty after Console→Profiler→Console. These are actual observed local-state losses, separate from saved project data.

## Architectural replacement and meaningful regression

Retain shell hosts and canvas identity. Switch visible content inside stable regions, without out-in fades or translating workspace surfaces. Resolve first-use async content before hiding the old surface, or render a deliberate nonblank loading view; retain per-workspace instances/state only where lifecycle safety is understood. Manage main should be a stable host. Bottom tools need deliberate project-scoped draft/filter ownership or retained instances, not incidental destruction.

Do not blindly KeepAlive all tools: audio auditions, device listeners, timers, profiler jobs and plugin sessions currently rely on onBeforeUnmount cleanup. Inactive panes must stop visibility-only activity through activation/deactivation or explicit visibility input. Clear retained project drafts on project replacement, not ordinary tab navigation.

Proposed regression: install observation-only rAF collector, activate workspace and Manage navigation through real input, require stable shell/canvas identities and no empty/near-transparent central frame; keep route-specific intentional layout changes separate. Enter a real Profiler annotation and Console filter, switch away/back, assert both survive without writing source fixtures. Add project replacement isolation to ensure retained drafts do not leak to another project. Verify actual downloaded numeric edit/save using the existing browser helper after controls migrate. Preserve before/after traces and inspect representative screenshots at1366,1600,1920 widths. Tests must target these behaviors, not CSS selectors that merely assert a particular implementation exists.

## Secondary surface map

| Surface | Purpose and workflow | Must preserve | Current UX/visual/architecture issues | Replacement and shared components | Complexity / regression risk |
|---|---|---|---|---|---|
| Script workspace | Rhai source, linked visual graph, event sheet with guarded conversion | Real draft saves, review/blocked conversion, source-span navigation, keyboard tabs, project scripts, find/replace, diagnostics, debugger/tests/signals/API | `ScriptWorkspace.vue` uses Unicode { }/⌘/lightning mode marks; `ScriptStudio.vue` has a long text toolbar, multirow inspector tabs, local32–36px button rules and repeated append-only CSS; source area competes with three navigation levels | Stable Script host, shared tabs, compact icon command strip, resizable project tree, central source/graph canvas and one contextual details pane; reusable panel header/menu/icon buttons/tree/tabs | High; mode conversion must remain awaited; preserve save rejection and source-backed semantics, code editor whitespace/caret and undo |
| Visual graph / events | Graph nodes and linked source; event conditions/actions | Graph pan/zoom, pins/connections, type diagnostics, source provenance, event validation/save | Graph and events have separate local toolbars and geometry systems; semantic colors are meaningful and need centralized semantic exceptions, not removal | Shared document toolbar and selection inspector; retain graph canvas/math and source provenance; shared property rows, menu and icon controls | High; do not rewrite graph runtime or conversion mathematics |
| Console | Filter logs by text/level/category and navigate asset sources | Log severity/category filters, clear, source-link navigation, empty state | Search/filter state is local refs and lost on tab replacement. Three broad filters dominate compact dock; clear exists both dock header and console toolbar | One dense filter strip, compact selects/search and one clear icon; persistent project-session filter state, shared list rows | Low/medium; preserve source resolution and avoid duplicated clear actions |
| Profiler / Debug | Trace, memory/lifetimes, replay, tests, data import, jobs, script profiles, runtime debug | All8tabs, budgets, capture/compare/export, cancellation, data diagnostics, annotations and runtime measurements | Dashboard/card grids, verbose header hints, metric boxes, local34px controls; annotationDraft/local selection refs reset on unmount; async work must be cancelled correctly when hidden | Stable tool host, shared compact tabs, split trace/list/details panes, flat section separators and consistent property rows; virtualized tables only if measured necessary | High; runtime jobs/replay/testing remain behaviorally intact; hiding must not leak jobs or discard user input |
| Ecosystem | Extension lifecycle, package wizard/signing, export templates, delivery, shipping, audit | Safe-mode toggle; explicit load/reload/unload/invoke; canonical signing request; verify/trust; permissions, certification and local registry; platform evidence truth | Many rounded cards (`.card`, `.studio-grid`), explanatory paragraphs, repeated text actions; all tab/draft/public-key/signature state locally owned and lost with parent unmount | Shared section navigation, table/list for extensions/evidence and compact split form only for explicit package workflow; routine lifecycle SVG actions with names/tooltips; danger semantics retained | High; never auto-invoke plugin actions or imply external certification/signing; preserve local-first/security boundaries |
| Manage secondary sections | Learning, settings, automation, packages, health, rendering, build | All sections and nested branches, draft validation, explicit execution/export actions | Keyed main recreates content host; async first-use blank frames observed; page-like headers duplicate section navigation | Stable Manage host with shared navigation and section header; retained local presentation state, separately scoped project drafts | Medium/high; automatic caching must not revive stale project state or background activity |

## Priorities for consolidation

P0: central blank frames/opacity transitions, keyed Manage host replacement, explicit draft-state survival, shared compact numeric/slider architecture. P1: script/debug/console/ecosystem migration to shared structure; remove Unicode production icons and per-screen geometry. P2: simplify repeated instructional paragraphs into help/details without removing critical security/validation explanations.

No engine/runtime feature removals or mathematical changes are proposed.

## Implemented resolutions and verification

- Four competing global editor imports replaced by one shared entry; the three editor-only override files are deleted. Exported-player main.css is a separate retained scope.
- Shared property rows/sections, original SVG commands, tabs, trees, dialogs, numeric presentation and slider implementation are in use across the major surfaces. Existing native numeric models/events remain intentionally native.
- Current source inventory: 97 Vue files + 4 CSS files, 730 native button sites, 222 native numeric sites, one native range inside UiSlider, and 1,388 literal visual declarations. Counts include shared tokens and retained player/domain geometry; they are not feature counts or proof that every conditional branch executed.
- Fifteen measured cold/warm workspace/Manage transitions have zero absent/near-transparent content samples and stable shell/canvas node identities. Console filter, profiler annotation, source draft/search, graph zoom/search, actual asset/project save and property undo/redo pass. Project replacement resets cached state.
- Full visual traversal covers 197 routes and ten assertions, with per-route screenshots at representative desktop sizes, docked/maximized tools, conditional populated fixtures, dialogs, locale/palette/scale and narrow cases. Screenshot review found faint slider tracks, leftover Settings sizing and crowded Build helper text despite passing geometry; these were corrected and receive separate targeted checks.
- Nine focused primitive checks cover exact native range event/bubble boundaries, lazy updates, invalid/disabled drafts, atomic save validation, resource reset, precision stepping, scale and saved label/compact preferences.
- Project Health's newly exposed reactive serialization loop was fixed at the inspection boundary; exact and repeated route probes pass without extending timeouts.
- Final tracking/evidence: MIGRATION.md, EDIT_LEDGER.md and release-audits/ui-rebuild. Physical display/compositor behavior, native assistive technology, native OS file pickers and unavailable external services remain outside the headless browser evidence. The rebuild does not requalify or overwrite published 26.32 release files.

- Populated Animation follow-up reviewed eleven asset/mode views plus docked and selected-clip captures. Fixed descendant SVG canvas rules stretching command icons, overlapping layer/skin/rig fields, timeline marker overflow and concatenated diagnostics. Real asset/project save and preview suspension pass.
