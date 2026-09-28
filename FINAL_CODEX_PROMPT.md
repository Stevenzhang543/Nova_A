# Nova_A — Autonomous Complete UI/UX Rebuild

You are now responsible for a complete UI/UX redesign and reimplementation of the Nova_A editor.

For this task, act simultaneously as:

1. Lead Product Designer
2. Senior Desktop UI/UX Engineer
3. UI Architecture Engineer
4. Visual QA Reviewer

You have substantial design authority.

Do not repeatedly ask the user how every button, panel, spacing value, or control should look.

Use professional product-design judgment and create a coherent design language for Nova_A.

## Mandatory repository instructions

Before doing anything else, read:

- `AGENTS.md`
- `docs/ui/UI_SPEC.md`
- `docs/ui/UI_AUDIT.md`
- `docs/ui/MIGRATION.md`
- `docs/ui/DECISIONS.md`

Treat `docs/ui/UI_SPEC.md` as the UI/UX source of truth.

Treat `docs/ui/MIGRATION.md` as the live implementation tracker.

Treat `docs/ui/DECISIONS.md` as persistent design/architecture memory.

---

# CORE OBJECTIVE

Completely rebuild the Nova_A editor interface into a coherent, compact, professional desktop development tool.

This is NOT:

- a cosmetic refresh
- a recoloring task
- a CSS cleanup
- a request to replace several text buttons with icons
- a request to preserve the current layouts
- a request to keep the existing widgets
- a request to minimally modify the current interface

The current interface has fundamental issues involving:

- visual hierarchy
- inconsistent control dimensions
- excessive text buttons
- excessive form-like controls
- inconsistent sliders
- inconsistent spacing
- weak information architecture
- poor visual cohesion
- inefficient use of space
- navigation flickering
- layout jumping
- duplicated UI patterns
- inconsistent styling
- weak professional-tool aesthetics

Treat the existing UI primarily as a source of FUNCTIONAL REQUIREMENTS.

Do NOT treat the existing UI as the visual reference for the new design.

Core principle:

**Preserve capability. Replace presentation.**

---

# DEFINITION OF COMPLETE REBUILD

The following existing elements are NOT required to be preserved:

- layout structure
- panel organization
- toolbar structure
- button styles
- input styles
- slider styles
- property editors
- navigation structure
- dialogs
- visual hierarchy
- spacing
- control dimensions
- style infrastructure
- reusable UI components
- inspector layouts
- tabs
- menus
- visual grouping

You are explicitly authorized to:

- delete old UI components
- rewrite shared widgets
- replace existing controls
- restructure screens
- reorganize navigation
- redesign the editor shell
- redesign the inspector
- redesign the hierarchy
- redesign toolbars
- redesign dialogs
- redesign property editors
- redesign asset interfaces
- redesign settings
- consolidate duplicated functionality
- move actions to more appropriate places
- replace text controls with icon controls
- introduce a centralized design system
- remove obsolete legacy UI code

Do NOT preserve a poor implementation merely because it already exists.

Do NOT perform a cosmetic reskin.

For this project, minimizing diff size is NOT an objective.

Prefer a clean and coherent UI replacement over preserving poor UI architecture for the sake of a smaller patch.

Do not unnecessarily rewrite unrelated engine/runtime systems.

---

# PRODUCT DIRECTION

Nova_A must feel like a serious desktop creative/development tool.

Its visual character should be:

- professional
- compact
- dark
- restrained
- low-saturation
- technically precise
- efficient
- visually quiet
- information-dense
- modern
- predictable
- cohesive

High-level inspiration may be taken from the interaction quality of Figma, VS Code, Blender, modern Godot, and JetBrains IDEs, but do not directly copy any of them.

Nova_A must not feel like:

- a website
- a web dashboard
- a mobile application
- a settings form
- a collection of cards
- a collection of random widgets
- a student project

---

# PHASE 0 — AUDIT BEFORE IMPLEMENTATION

Do NOT begin with random visual modifications.

First perform a repository-wide UI audit and update `docs/ui/UI_AUDIT.md` with actual findings.

Inspect:

- every major editor screen
- every editor mode
- every toolbar
- navigation mechanisms
- dialogs and popups
- inspectors/property editors
- sliders
- numerical inputs
- text buttons
- icons
- trees/lists/tabs
- asset interfaces
- reusable UI components
- hard-coded control dimensions
- hard-coded colors
- duplicated styles
- inconsistent margins/padding
- inconsistent control heights/widths
- unnecessary large inputs
- unnecessary text
- excessive whitespace
- overcrowded regions

For every major screen, document:

1. purpose
2. existing functionality
3. functionality that must survive
4. UX problems
5. visual problems
6. architectural problems
7. proposed replacement structure
8. shared components required
9. migration complexity
10. regression risks

---

# NAVIGATION FLICKER — P0 DEFECT

Visible flickering during navigation is a P0 UI defect.

Investigate the actual technical cause.

Check for:

- unnecessary component destruction
- component remounting
- full-window rebuilding
- temporary empty states
- theme reinitialization
- style reloads
- unnecessary repainting
- layout invalidation
- geometry recalculation
- synchronous resource loading
- parent container reconstruction
- window resizing
- state resets
- expensive initialization during page switches

Document evidence and root-cause candidates in `UI_AUDIT.md`.

Do not hide the issue using animation.

Fix the architectural cause.

---

# DESIGN SYSTEM FIRST

Before migrating the entire application, finalize and implement the shared design system described in `UI_SPEC.md`.

At minimum, converge on shared implementations for:

- semantic colors
- typography
- spacing tokens
- SVG icons
- icon button
- text button
- input
- numeric input
- slider
- dropdown
- checkbox
- tabs
- tree row
- property row
- property section
- menu
- tooltip
- scrollbar
- divider
- dialog/popup
- panel header

Individual screens must not independently invent control geometry or styling.

---

# ICON-FIRST ROUTINE ACTIONS

Routine editor actions should normally use compact SVG icon buttons with tooltips.

Examples:

- New
- Open
- Save
- Undo
- Redo
- Add
- Remove
- Delete
- Duplicate
- Play
- Pause
- Stop
- Search
- Visibility
- Lock
- Unlock
- Refresh
- Settings
- Expand
- Collapse
- Move
- More actions

Do not use emoji or random Unicode symbols as production icons.

Do not blindly eliminate useful text. Keep text where wording materially improves comprehension.

---

# NUMERIC CONTROLS AND SLIDERS

Redesign numeric property editing for desktop-tool workflows.

Avoid giant full-width inputs for short values.

Prefer compact aligned property rows.

All standard sliders must use one shared implementation and consistent geometry.

Do not create giant standalone sliders.

When precision matters, pair the slider with a compact numeric input.

Slider width must not unpredictably change between screens, values, labels, or parent layouts.

---

# PERSISTENT EDITOR SHELL

Evaluate and rebuild the editor around a persistent shell where technically reasonable.

Likely persistent regions:

- top toolbar/navigation
- left dock
- central workspace container
- right inspector dock
- bottom dock where applicable

Switching tools/pages should replace only the relevant content region.

During navigation:

- no visible white flash
- no visible black flash
- no blank intermediate frame
- no full-shell disappearance
- no unrelated panel resize
- no random geometry jump

---

# INSPECTOR

Build a coherent reusable inspector/property system.

Use compact property rows, concise labels, collapsible sections where appropriate, and shared numeric/slider controls.

Avoid verbose labels and oversized inputs.

---

# NO CARD HELL

Do not redesign Nova_A as a collection of cards.

Prefer:

- panels
- docks
- sections
- tabs
- trees
- lists
- inspectors
- property rows
- toolbars
- menus
- dialogs

Cards should exist only where they have clear semantic value.

---

# AUTONOMY

You are expected to make routine UI/UX decisions independently.

Do not ask for approval for normal choices such as:

- exact padding
- control alignment
- icon placement
- minor color tuning
- ordinary component restructuring
- reasonable panel dimensions

Use the design system and professional judgment.

Ask for user input only when a decision would:

- fundamentally change the product's purpose
- remove significant existing functionality
- introduce a major new dependency
- significantly change a core workflow
- require irreversible/destructive external action

---

# IMPLEMENTATION ORDER

Use `docs/ui/MIGRATION.md` as the authoritative tracker.

General order:

1. complete UI audit
2. finalize specification
3. implement design-system foundation
4. implement SVG icon system
5. rebuild persistent application shell
6. eliminate navigation flicker/layout jumping
7. migrate hierarchy/scene navigation
8. migrate inspector/property editing
9. migrate viewport/toolbar
10. migrate asset interfaces
11. migrate console/debug UI
12. migrate animation UI
13. migrate dialogs/contextual interfaces
14. migrate project management UI
15. migrate settings/secondary screens
16. eradicate legacy UI
17. perform complete visual QA/polish

You may adjust this sequence for strong technical reasons, but record that decision in `DECISIONS.md`.

---

# VISUAL QA IS PART OF CORRECTNESS

A UI task is NOT complete simply because:

- code compiles
- tests pass
- old functionality still exists

For each significant screen, verify:

- no oversized controls
- no inconsistent input heights
- no inconsistent button sizes
- no giant standalone sliders
- no inconsistent slider geometry
- no unnecessary text buttons
- no emoji icons
- no mismatched SVG styles
- no unexplained large empty areas
- no overcrowded sections
- no inconsistent padding/margins
- no misaligned labels
- no clipped text
- no overlapping controls
- no accidental horizontal scrolling
- no unnecessary scrollbars
- no controls touching panel boundaries
- no duplicated actions without purpose
- no unexpected layout jumps
- no navigation flicker
- no temporary blank frames
- no arbitrary component dimensions
- no screen that looks like it belongs to a different application

---

# VISUAL ITERATION LOOP

Whenever technically possible:

Implement
-> Build
-> Launch Nova_A
-> Open the affected interface
-> Inspect the actual visual result
-> Compare against `UI_SPEC.md`
-> Identify inconsistencies
-> Fix them
-> Launch and inspect again
-> Verify functionality
-> Update migration status
-> Continue

Do not use:

Implement -> Build succeeds -> Done

for significant UI work.

If screenshot/visual regression testing is practical without disproportionate complexity, use it for major surfaces at representative desktop sizes such as:

- 1920x1080
- 1600x900
- 1366x768

---

# FUNCTIONAL SAFETY

Before replacing an old screen:

1. identify its user-facing functionality
2. identify data flows and callbacks
3. identify keyboard shortcuts/interactions
4. identify important edge cases
5. preserve required behavior
6. replace the presentation

Do not accidentally remove useful functionality because the old interface is being discarded.

---

# LEGACY UI ERADICATION

Near the end, systematically search for:

- deprecated UI components
- legacy style definitions
- old sliders
- old text-button implementations
- hard-coded colors
- arbitrary widths/heights
- duplicate controls
- old icon systems
- obsolete panel implementations

Remove or migrate them where safe.

Important legacy components should ideally reach zero usages.

Do not leave multiple competing UI systems active without a documented technical reason.

---

# CONTINUOUS DOCUMENTATION

During implementation:

- keep `UI_AUDIT.md` accurate
- update `MIGRATION.md` after every milestone
- add significant decisions to `DECISIONS.md`
- update `UI_SPEC.md` only when a deliberate system-level improvement is made

Do not casually rewrite the design system during each screen migration.

---

# FINAL DEFINITION OF DONE

The Nova_A UI rebuild is complete only when:

- major editor surfaces use the new design system
- major legacy UI patterns are removed
- controls have consistent geometry
- routine commands use a coherent SVG icon system
- numerical properties are compact and predictable
- sliders are standardized
- navigation flicker has been eliminated or any remaining technical limitation is explicitly documented
- panel geometry is stable
- the inspector is coherent
- spacing and typography are consistent
- no major screen visibly belongs to an older UI generation
- relevant functionality still works
- builds/tests pass
- visual QA has been performed
- `MIGRATION.md` accurately reflects completion

The goal is not merely:

"Nova_A looks better than before."

The goal is:

"Nova_A now has a coherent professional editor UI and a maintainable design system."

Begin with the repository audit now. Once the audit and migration plan are coherent, proceed with implementation autonomously without asking for routine confirmation.
