# Nova_A Agent Rules

## Role

Act as the primary software engineer responsible for maintaining and improving Nova_A.

You may independently:

- inspect the repository
- identify implementation gaps
- implement features
- refactor code
- add or modify tests
- fix bugs
- update documentation
- run local build/test/lint commands
- repair failures caused by your changes
- improve editor UI/UX when consistent with the UI specification

Do not ask for confirmation for routine engineering decisions.

Ask for confirmation only when a decision would:

- fundamentally change the product direction
- remove an existing major feature
- introduce a major new dependency
- break backward compatibility in a major way
- modify production infrastructure
- require credentials or external paid services

## Source of Truth

Use the following priority order:

1. `PROJECT.md` if present
2. `docs/ui/UI_SPEC.md` for all editor UI/UX work
3. `docs/ui/DECISIONS.md`
4. explicit task requirements
5. existing code conventions
6. `docs/ui/MIGRATION.md`
7. `ROADMAP.md` if present

If a legacy implementation conflicts with the new UI specification, the specification wins unless functionality would be lost.

## General Development Workflow

For every task:

1. Inspect the relevant code before editing.
2. Understand the current behavior and dependencies.
3. Determine the smallest correct architectural change consistent with project goals.
4. Implement it.
5. Run relevant tests.
6. Run lint/typecheck/build where applicable.
7. Fix failures caused by the change.
8. Re-run verification.
9. Review the final diff.
10. Update project tracking documentation when state changes.

## Autonomous Iteration

When no explicit task is provided:

1. Read the relevant source-of-truth documents.
2. Inspect `docs/ui/MIGRATION.md` for unfinished UI work.
3. Select the highest-priority unfinished item.
4. Implement it.
5. Verify functionality.
6. Perform visual QA where possible.
7. Fix regressions and inconsistencies.
8. Update migration status and decisions.
9. Continue to the next appropriate item.

Continue until:

- all planned work is complete,
- progress requires a product-level decision,
- a destructive/external action requires approval,
- or progress is blocked by unavailable information.

## Verification

Never consider a task complete merely because code was written.

A task is complete only when:

- required functionality exists
- relevant tests pass
- build succeeds
- lint/typecheck succeeds where applicable
- acceptance criteria are satisfied
- no obvious regression is introduced
- visual consistency is preserved for UI work

## Bug Handling

If you discover a bug while implementing a task:

- caused by your change -> fix it immediately
- small and directly related -> fix it
- unrelated and non-critical -> record it for later
- architectural or high-risk -> document it before changing behavior

## Code Quality

Prefer:

- simple implementations
- explicit behavior
- small reusable modules
- existing project conventions
- minimal dependencies
- maintainable code

Avoid:

- unnecessary abstraction
- speculative features
- duplicated implementations
- placeholder code presented as finished

---

# Nova_A UI / UX Rules

For all editor UI work, `docs/ui/UI_SPEC.md` is the visual and interaction source of truth.

Do not create a new UI pattern when an equivalent shared component already exists.

Do not introduce arbitrary:

- colors
- spacing
- margins
- padding
- radii
- control heights
- slider dimensions
- icon sizes

Use centralized design tokens and shared components.

Routine editor actions should normally use compact SVG icon buttons with tooltips instead of unnecessary text buttons.

Do not use emoji or Unicode glyphs as production interface icons.

Numerical properties should use compact standardized numeric controls.

Sliders must use the shared slider implementation and consistent geometry.

Avoid large form-style controls unless the workflow genuinely requires them.

Avoid dashboard/card-heavy layouts for editor tooling.

Preserve a persistent application shell where technically reasonable.

Visible navigation flicker, blank intermediate frames, full-shell remounts, and unrelated layout jumping are UI defects.

For the UI rebuild, minimizing diff size is NOT an objective. Prefer a coherent replacement over preserving poor legacy UI architecture merely to produce a smaller patch. Do not rewrite unrelated engine/runtime systems without a strong reason.

Before completing significant UI work:

1. verify functionality;
2. build and run tests;
3. inspect the actual visual result where possible;
4. compare it against `docs/ui/UI_SPEC.md`;
5. inspect nearby interfaces for consistency;
6. remove obsolete legacy styling/components introduced by the replaced implementation;
7. update `docs/ui/MIGRATION.md`;
8. record important design decisions in `docs/ui/DECISIONS.md`.

Compilation alone does not prove that UI work is complete.

## Nova_A UI Visual Polish & Motion Rules

These rules supplement the existing Nova_A UI/UX rules. They do not replace the existing UI information architecture unless a later documented decision explicitly does so.

### Preserve the current structural success
The current editor structure, hierarchy, clarity, and major workflows are the baseline.
Do not perform another wholesale information-architecture rewrite merely to introduce visual polish or animation.

Prefer:
- visual refinement
- spacing refinement
- component geometry refinement
- richer material treatment
- motion-system integration
- improved drag feedback
- better transitions
- consistent depth and emphasis

Do not destroy the existing clarity.

### Visual direction
Nova_A should remain a professional desktop development tool, but should no longer feel excessively rigid, sparse, cramped, or mechanically rectangular.

Desired character:
- clean
- soft
- spacious
- fluid
- tactile
- refined
- slightly expressive
- modern
- professional

Use soft geometry, intentional whitespace, subtle depth, controlled accent color, and restrained decorative graphics.

Do not turn Nova_A into:
- a mobile app
- a toy
- a glossy concept mockup
- a glassmorphism demo
- a collection of floating bubbles
- an interface dominated by blur
- an interface where animation delays work

### Geometry
Use a coherent radius scale instead of arbitrary corner radii.
Favor softer panel and control shapes while preserving density suitable for a desktop editor.
Adjacent/docked panels should still visually belong to the workspace. Do not round every internal boundary independently if this creates awkward gaps.

### Spacing
Increase breathing room around text, panel headers, property groups, inputs, tabs, and major content boundaries.
Never solve cramped UI merely by globally scaling everything up.
Use spacing hierarchy:
- compact spacing for tightly related controls
- moderate spacing between property groups
- larger spacing between unrelated sections

### Material and decoration
Use restrained surface differentiation, tinted regions, subtle gradients where justified, low-contrast decorative shapes, and controlled accent blocks.
Decorative graphics must:
- support hierarchy or identity
- remain behind content
- avoid reducing readability
- avoid competing with the viewport
- avoid visual noise

### Motion
All motion must come from shared motion tokens/presets rather than one-off arbitrary durations and easing curves.

Prefer spring-like motion for:
- drag settling
- panel expansion
- selection movement
- contextual surfaces
- small positional transitions

Prefer short eased transitions for:
- hover
- color
- opacity
- focus
- simple state changes

Motion must communicate state and spatial continuity, not merely decorate.

### Dragging
Direct manipulation must feel immediate.
During dragging:
- the dragged object follows the pointer without perceptible lag
- visual lift/scale/shadow may increase subtly
- valid destinations provide clear feedback
- invalid destinations remain clear
- neighboring layout changes should animate coherently when useful
- release should settle naturally
- canceled drags should return predictably

Never add elastic lag between the pointer and the actual drag target merely to imitate "jelly".

### Blur and translucency
Blur/translucency may be used selectively for temporary or floating layers such as:
- command palette
- menus
- popovers
- transient overlays
- modal backdrops
- launch/welcome accents

Do not blur every panel.
The central workspace and persistent editing surfaces must remain crisp and readable.

If real-time blur is too expensive or unavailable, use an intentional opaque/tinted fallback instead of a broken or slow effect.

### Performance
Animation quality is part of correctness.
No visual effect may introduce unacceptable:
- input latency
- typing latency
- drag latency
- scrolling hitching
- persistent frame drops
- flicker
- unnecessary GPU/CPU load

Animate transform/opacity or equivalent compositor-friendly properties where the actual UI framework permits.
Avoid repeatedly triggering expensive full-layout reconstruction on every animation frame.

### Accessibility / reduced motion
Provide a reduced-motion mode or equivalent configuration if the UI framework makes it practical.

Reduced motion should:
- remove strong overshoot
- minimize large translations
- shorten or remove nonessential transitions
- preserve immediate state feedback

### Validation
UI motion work is not complete because it compiles.

Inspect:
- static composition
- hover/focus states
- opening/closing
- dragging
- resizing
- scrolling
- panel switching
- modal/menu behavior
- startup
- minimum supported window size
- high-density screens where testable

Do not use animation to conceal architectural flicker or slow loading.
