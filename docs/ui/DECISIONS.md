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
