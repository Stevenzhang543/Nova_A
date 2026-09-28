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
