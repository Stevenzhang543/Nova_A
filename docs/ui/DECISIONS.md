# Nova_A UI/UX Decisions

Use this file to prevent repeated reversal of already-settled design/architecture decisions.

For each significant decision, record:

- decision
- rationale
- alternatives considered
- consequences
- conditions for reconsideration

Do not repeatedly reverse decisions without a concrete technical or product reason.

---

## UI-001 — Legacy UI Is Not the Visual Reference

**Decision**  
The existing Nova_A UI is treated primarily as a source of functional requirements, not as the visual/layout reference for the rebuild.

**Rationale**  
The purpose of this project is a genuine UI/UX rebuild rather than a cosmetic reskin.

**Alternatives considered**

- preserve layouts and only restyle controls
- gradually tweak existing pages without a unified design system

**Consequences**

- layouts/components may be deleted or replaced
- feature behavior must still be preserved
- migration requires explicit tracking

**Reconsider only if**  
A specific legacy structure proves essential to a core workflow or technical constraint.

---

## UI-002 — Professional Compact Desktop Tool Aesthetic

**Decision**  
Nova_A uses a professional, compact, dark, restrained desktop-tool design language.

**Rationale**  
Nova_A is an editor/game-engine tool, not a website or mobile application.

**Avoid**

- dashboard/card-heavy layouts
- oversized controls
- high-saturation/neon styling
- decorative effects that reduce information density

**Reconsider only if**  
The product direction changes away from a desktop development/creative tool.

---

## UI-003 — Centralized Design System

**Decision**  
Colors, spacing, typography, control geometry, icons, and common widgets must be centralized.

**Rationale**  
Per-screen invention caused visual inconsistency and unpredictable control sizing.

**Consequences**

- new UI work should reuse shared components
- arbitrary local visual constants require justification

**Reconsider only if**  
A framework limitation requires a narrowly scoped exception.

---

## UI-004 — Icon-First Routine Actions

**Decision**  
Routine editor actions use compact SVG icon buttons with tooltips where appropriate.

**Rationale**  
This reduces visual noise and improves information density in toolbars and repeated action regions.

**Text remains appropriate for**

- Create Project
- Import
- Apply
- Cancel
- Save Changes
- other actions where wording materially improves comprehension

**Reconsider only if**  
An icon materially reduces clarity or accessibility.

---

## UI-005 — No Emoji/Unicode Production Icons

**Decision**  
Production UI icons use a coherent SVG icon system.

**Rationale**  
Emoji and arbitrary Unicode symbols create inconsistent visual weight and platform-dependent rendering.

**Reconsider only if**  
The UI framework cannot render SVG and an alternative coherent vector/icon solution is selected.

---

## UI-006 — One Shared Slider System

**Decision**  
All sliders use one shared geometry and interaction pattern.

**Rationale**  
Current slider inconsistency is a major visual/interaction defect.

**Rules**

- no giant standalone sliders
- stable width behavior
- numeric companion input when precision matters

**Reconsider only if**  
A special editor (for example a timeline curve control) is semantically not a standard scalar slider.

---

## UI-007 — Persistent Editor Shell

**Decision**  
Major shell regions should remain persistent during navigation where technically reasonable.

**Rationale**  
This reduces flicker, geometry jumps, and unnecessary reinitialization.

**Consequences**

- content should switch inside stable containers
- full-shell reconstruction should be avoided

**Reconsider only if**  
A framework constraint makes persistence technically unsafe or significantly more complex; document evidence before deviating.

---

## UI-008 — Visual QA Is Part of Correctness

**Decision**  
Build success and test success are necessary but insufficient for UI completion.

**Rationale**  
A UI can compile and still be visually broken, inconsistent, clipped, unstable, or unpleasant.

**Consequences**

- major UI work requires actual visual inspection where possible
- nearby screens must be checked for consistency

**Reconsider only if**  
Never; only the exact QA mechanism may change.

---

## UI-009 — Replace the Editor Cascade, Preserve Native Event Contracts

**Decision:** One editor token/style entry replaces four overlapping global layers. Shared Vue primitives own repeated structure; semantic native form controls share centralized geometry where wrappers would alter v-model.lazy/.number, refs, validation or event bubbling.

**Rationale:** The audit found 6,325 literal declarations and incompatible control systems. Another override stylesheet would retain the source of regressions. Native event targets are part of history/preview contracts.

**Alternatives:** Blanket component substitution, or adding another specificity layer. Both risk silent behavior changes or continuing style conflicts.

**Consequences:** Preserve NumericExpressionInput's draft/validation behavior, replace its presentation; migrate all standard ranges to UiSlider with one precision/event implementation; remove private rows/toggles/ranges and obsolete editor-only layers. main.css remains used by the separate exported player until a separately scoped player redesign.

**Reconsider only if:** A measured native control limitation requires a documented specialized primitive.

## UI-010 — Resolve Before Navigation Commit, Cache with Explicit Lifetimes

**Decision:** Shared async hosts retain the outgoing view until imports resolve and use bounded known-view caching. Remove out-in workspace transitions and keyed Manage main reconstruction. Add activation/deactivation handling for visibility-only work.

**Evidence:** Baseline rAF samples show near-blank central intervals while shell/canvas identities remain stable; profiler annotation and console filter disappear on route round trips.

**Alternatives:** Eager-loading every tool; hiding the gap with animation; blanket v-show with unreviewed background listeners. Rejected for startup cost, masking defects, or lifecycle leaks.

**Consequences:** Draft/filter state survives ordinary navigation; previews stop when hidden; project replacement still disposes cached state. Intentional saved workspace layouts remain supported.

**Reconsider only if:** Component lifetime evidence shows caching unsafe; move its presentation state to a project-scoped owner and keep a stable host instead.

## UI-011 — Functional Spatial Geometry and Theme Compatibility

**Decision:** Standard controls use the spec's exact centralized geometry. Timeline, canvas, graph, virtual-tree and collision-matrix coordinate geometry retain their domain meanings. Existing theme and accessibility preferences remain supported, with the new dark design as default.

**Rationale:** Removing theme choice or changing coordinate math would lose capabilities without improving presentation architecture.

**Alternatives:** Force dark mode for everyone; normalize every numeric CSS value indiscriminately. Rejected for compatibility and functional risk.

**Consequences:** Visual QA includes alternate themes/scales; virtual row JS and CSS metrics must agree. Exceptions are functional, not permission for arbitrary per-page controls.

**Reconsider only if:** A specific exception no longer represents functional geometry.

## UI-012 — Snapshot Mutating Serialization Outside Render Computations

**Decision:** Project Health and the persistent asset browser read a shallow project inspection snapshot refreshed at project/history/asset/scene boundaries and activation. They do not call getSceneJSON from computed rendering dependencies.

**Evidence:** Real browser navigation into Project Health stalled beyond 30 seconds. A paused stack showed graph normalization/canonical serialization reached through projectSource. That serializer also updates active-scene data and asset dependency metadata, so two persistent computed readers could invalidate each other.

**Consequences:** No serializer output or health validation is removed. A copied history-entry dependency and history index detect array-splice updates, merged edits and undo/redo. The exact failing route and repeated navigation now pass. Broad engine changes and increased timeouts were unnecessary.

## UI-013 — Keep Project Replacement a Disposal Boundary

**Decision:** App's async editor host is keyed by project session, while ordinary workspace and tool switches retain cached views. Visibility-only timers/listeners/previews suspend; explicit user-started network hosting remains live until stopped or the project closes.

**Evidence:** Browser checks retain console/profiler/source/graph state during navigation and reset cached console/profiler state after a real project replacement without page reload. Project save still blocks unsaved asset drafts; tests save those assets through their actual commands before saving the project.

**Consequences:** Persistent navigation cannot leak drafts, filters or listeners between projects. A running network host is not made undiscoverable by merely hiding its configuration panel.

## 26.33: preserve the integrated editor system

The Phase II defects concern hierarchy identity, runtime save transactions, gameplay keyboard ownership and missing joint descriptors. Repair their owning systems rather than introducing parallel editor UI. Shared numeric controls, SVG commands and persistent panels remain authoritative. Play mode owns gameplay shortcuts; editor transform shortcuts resume when editing resumes.

## UI-014 — Expose the actual evidence boundary

Profiler GPU timing remains unavailable when the host cannot measure it. Estimated profiler overhead is labelled estimated and excluded from measured CI certification; empty/invalid frame captures cannot pass. The legacy inputToPixelMs field remains compatible while the user-facing label says Input to CPU submission. Font advanced modes remain saved metadata with EN/DE/ZH availability copy, instead of implying implemented rasterizers. Existing tokens/shared controls/hint styling are retained.

## UI-015 — Each game surface owns unhandled wheel input

Each cached WorldCanvas marks its game input surface. Game UI consumes handled scroll before named gameplay actions; unhandled bare-canvas wheel is forwarded once. Native fields/editor panels remain normal scrolling surfaces. A single mutable global canvas registration was rejected because cached Design/Game views can coexist. Real browser and module regressions verify routing without changing keyboard behavior.

## UI-016 — Evolve geometry without changing spatial contracts (26.35)

V3 supersedes the old rigid radius rules: shared 4/6/9/12/16 px radii distinguish controls, floating surfaces, dialogs and the welcome accent. Group/header insets and semantic spacing improve comfort; tree rows, slider tracks, numeric widths, native input semantics and scaled canvas coordinates retain their existing geometry. Docks stay connected and square. The launcher uses the existing N mark as an inert SVG and a quiet node motif, with Create/Open/Continue and all existing project actions retained.

Actual large-text launcher inspection found fragmented Chinese template labels and a crowded German recent-project hint. Whole labels now wrap as units and the hint occupies its own row. The hierarchy resize separator is aligned to the actual right edge of its left dock; pointer mathematics are unchanged. Actual native drag input reproduced a 29 px source shift when selection inserted the breadcrumb row. The path band is now always reserved at a bounded central control-plus-scroll-gutter height; empty navigation is hidden/inert, while horizontal scrolling and immediate selection remain intact.

## UI-017 — Finite springs after immediate state changes (26.35)

Use src/ui/motion.ts and motion.css for shared presence, indicator continuity and post-commit FLIP. Sample a damped oscillator once per finite batch; animate transform/opacity through Web Animations, without an idle timer. Cancel superseded work. Dialogs, menus and the command palette become inert immediately when closing; focus and commands never wait for animation. Persistent workspace content remains unfaded and cached.

Native dragging owns the pointer image; targets expose valid, invalid or insertion state. Hierarchy, asset/folder, dock and bottom-tab operations keep their existing validation, confirmation, GUID, history and persistence contracts. Viewport/tile/keyframe/graph/waveform/resize coordinates stay direct. General resource-field drop assignment, arbitrary floating-window positioning and clip dragging are currently absent. Keyframe neighbor settling is deferred because changing index identities cannot safely identify animated keys.

Selective 10 px blur applies only to transient menu/palette surfaces, with opaque low-end, high-contrast, reduced-motion and unsupported-browser fallbacks. Live reduced-motion policy settles active jobs and disables decorative CSS. Software-browser diagnostics qualify their measured host scope; they do not certify physical pointer-image appearance, device GPU costs or prolonged comfort.

## UI-018 — Preserve names in narrow hierarchy docks (26.35)

Actual 200% text inspection found that disclosure and four inline actions consumed the selected object name. A font-relative container breakpoint replaces those actions with the existing shared SVG menu, containing Pin/Unpin, Visibility, Lock and Enabled. Scene and selection navigation use the same bounded overflow pattern. Empty disclosure placeholders and redundant row ID/status presentation yield space; full names, IDs and statuses remain available in tooltips and the object menu. Existing handlers, native drag targets, fixed virtual row heights and breadcrumb geometry remain authoritative. The hierarchy's edit guard now also honors the existing recovery read-only flag, matching the toolbar. Closing or hiding the owning interface, or deleting the menu's object UUID, disposes its transient menu; it never retargets actions to a new selection.

Actual public read-only recovery testing exposed an all-disabled Scene menu whose trigger retained focus. The shared menu now focuses its existing keyboard-focusable root when no enabled entry exists. Escape remains usable without enabling a forbidden action or changing normal first-entry focus.
