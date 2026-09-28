# Nova_A UI Rebuild Pack — Setup

## 1. Recommended Branch

Create a dedicated branch before starting:

```bash
git checkout -b ui/full-rebuild
```

If the branch already exists:

```bash
git checkout ui/full-rebuild
```

## 2. Copy the Files

Place the files into the Nova_A repository root like this:

```text
Nova_A/
├── AGENTS.md
├── FINAL_CODEX_PROMPT.md
├── SETUP.md
├── PROJECT.md                 # keep your existing file if present
├── ROADMAP.md                 # keep your existing file if present
│
├── docs/
│   └── ui/
│       ├── UI_SPEC.md
│       ├── UI_AUDIT.md
│       ├── MIGRATION.md
│       └── DECISIONS.md
│
├── src/
└── ...
```

## 3. If You Already Have AGENTS.md

Do NOT blindly delete useful existing project rules.

Either:

1. merge this pack's `AGENTS.md` into your existing one, or
2. replace the existing one only if it contains nothing important.

The UI/UX section must remain intact.

## 4. Do Not Pre-Fill the Audit With Guesses

`UI_AUDIT.md` intentionally contains structured placeholders.

Codex should inspect the actual repository and replace them with real findings before implementation.

This is important: do not manually invent audit results just to make the document look complete.

## 5. Start Codex From the Repository Root

Make sure Codex has access to the entire repository and starts with the repository root as its working directory.

Then paste the entire contents of:

`FINAL_CODEX_PROMPT.md`

as the initial task.

## 6. What Codex Should Do First

It should NOT immediately start changing random UI controls.

It should first:

1. read `AGENTS.md`
2. read `docs/ui/UI_SPEC.md`
3. inspect the repository
4. complete `docs/ui/UI_AUDIT.md`
5. refine `docs/ui/MIGRATION.md`
6. record any necessary architecture decisions
7. then begin implementation

## 7. How You Should Supervise It

Do not micromanage individual buttons unless necessary.

Prefer feedback at the specification/system level.

Bad feedback pattern:

```text
Make this button 4 px smaller.
Make that slider longer.
Move this label left.
```

Better feedback pattern:

```text
The inspector still has inconsistent control density. Update UI_SPEC.md with a clearer property-row rule and migrate all inspector sections to it.
```

or:

```text
Routine actions in the viewport toolbar still rely too heavily on text. Re-audit the toolbar against the icon-first rules and update all equivalent controls consistently.
```

## 8. Recommended Commit Boundaries

Keep commits milestone-oriented, for example:

```text
ui: establish design tokens and shared controls
ui: introduce unified SVG icon system
ui: rebuild persistent editor shell
ui: eliminate navigation flicker
ui: migrate hierarchy panel
ui: migrate inspector controls
ui: migrate viewport toolbar
ui: migrate asset browser
ui: migrate animation editor
ui: migrate dialogs and settings
ui: remove legacy widgets and styles
ui: complete visual consistency pass
```

## 9. If Codex Starts Doing a Cosmetic Reskin

Stop that direction and use this correction:

```text
You are drifting into a cosmetic reskin of the legacy UI.
Return to AGENTS.md and UI_SPEC.md.
The old interface is only a functional reference, not a layout or visual reference.
Re-evaluate the affected surface from first principles, preserve its capabilities, and redesign its presentation using the shared design system.
Do not continue patching the legacy layout.
```

## 10. If It Declares Completion Too Early

Use:

```text
Do not declare the rebuild complete yet.
Audit the repository against MIGRATION.md and UI_SPEC.md.
Find remaining legacy components, arbitrary sizes, text-button-heavy toolbars, inconsistent sliders, flicker/layout-jump paths, and screens that still use the old visual language.
Update MIGRATION.md and continue until the final definition of done is actually satisfied.
```
