# 26.13 independent workspace review

Integration notice: this journal preserves the original staged findings, failure results and pending-at-the-time entries. The reviewed files are now integrated for the26.13 candidate after26.12 was finalized. Final scope/status is in [26.13 release notes](RELEASE_NOTES_26_13.md) and its executed-gate evidence. Historical measurements are not relabeled as production qualification.

All edits and reports in this review were created under `.cache/development-v26.13`; active 26.12 source remained frozen. The file-by-file edit ledger is in `VERSION_26_13_WORKSPACES.md`. This is staged evidence, not a packaged release qualification.

## Reproduced persistence failures

Five added state-test groups failed before correction:

- Start in Script, then select a project whose layout JSON is truncated. The page became Scene while the active workspace stayed Script. Recovery now resets both consistently.
- Keep a user-level legacy layout with hierarchy width 499, then open a fresh project scope. The new project inherited 499. Project namespaces now use their own versioned data and a fresh Design fallback; project reset cannot delete global legacy data.
- Save three distinct custom layouts and delete a different one. The selected custom ID changed unnecessarily. Deleting the active layout also failed to apply the selected replacement's dimensions. Both paths now maintain matching selection and layout.
- Save more than 24 custom layouts. They were accepted, but only 24 survived the existing load normalization. New creation, duplication and import now refuse to exceed the existing persisted limit before mutating the list. Import files with more than 24 entries are rejected rather than silently truncated. The manager displays the refusal. Updating an existing custom layout remains possible at capacity. Imported duplicate IDs receive separate identities.
- Deny storage removal, then reset. The exception prevented layout recovery. Storage cleanup is now optional; in-memory Design recovery still runs.

The audit also verified project switching, preset memory, maximum presentation state, finite bounds and reset behavior using the actual workspace module with in-memory browser storage. The custom-layout limit remains 24; this change does not expand the storage format or claim recovery of entries already discarded by older sessions.

## Resize and panel consequences

A bottom dock may retain a 520px preference while CSS renders 268px at a short viewport. Starting a drag at 520 produced a large dead zone. Pointer and arrow-key resizing now starts at the measured visible extent. A click without movement retains the original preference, while Escape, lost capture and disable restore it. Scaled pointer deltas still use the physical-to-logical scale ratio.

The hierarchy used every pointer-down to mark dragging, including rejected right-button input. It now receives an explicit accepted-drag event. Component disposal restores pointer styles and capture without committing an old panel dimension into a newly selected workspace. Handled resize keys stop propagation; unrelated shortcuts such as Ctrl+S remain available to the editor.

Source review identified three geometry/focus defects: a zero-width paint-contained hierarchy clipped its expand control, a sole visible split-dock panel had a 50% maximum height, and SceneTabs remained outside the inert subtree when the bottom dock covered them. The staged corrections reserve a 22px expansion rail, distribute available split height among visible flex items, and mark covered scene tabs and physics-monitor controls inert. Panel-drag initiation ignores descendant entity drags and resets its state when a drag ends. These CSS/inert changes still require observed browser verification.

## Executed checks

```powershell
node .cache/development-v26.13/scripts/verify-v26.13-workspaces.mjs --source-root=.cache/development-v26.13
node .cache/development-v26.13/scripts/verify-v26.13-panel-controls.mjs --source-root=.cache/development-v26.13
```

Results: **13 workspace/state groups passed; 9 compiled Vue component-handler groups passed**. Reports are `reports/workspace-verification.json` and `reports/panel-controls-verification.json`. The latter executes the actual compiled separator through Vue's custom renderer and compiles all edited component scripts, templates and scoped styles. It does not simulate browser layout, paint, hit-testing, actual focus or a complete TypeScript project check.

## Browser checks after promotion

- At the required viewport/scale combinations, resize a viewport-capped bottom dock and Inspector by pointer and keyboard. Verify immediate visible motion, Home/End, double-click reset, Escape, pointer cancellation and restored dimensions.
- Right-click the hierarchy separator, then switch workspaces; its restored width must still update. Begin a drag and change workspace or maximize via an available shortcut; old dimensions must not overwrite the destination layout.
- Collapse hierarchy in both docks, activate its visible expansion rail, and confirm the previous preferred width returns.
- Enable split docking with one visible panel, then two; each must use its available height without a blank reserved half.
- Maximize/restore hierarchy, Inspector and bottom in docked/floating forms. Tab must not enter covered scene tabs, main content, other docks or physics-monitor controls. Restore actions and application navigation must remain reachable.
- Drag an entity inside hierarchy and end the drag; a later unrelated file or asset drop must not dock the hierarchy unexpectedly.
- In the workspace manager, fill the 24-custom-layout capacity and attempt save/duplicate/import. Verify visible refusal, no lost entries, rename/update at capacity and reload preservation. Delete active and inactive custom layouts with different dimensions and check selection matches what is shown.

ConfigPanel, EditorBottomPanel and global main.css were reviewed without additional direct edits by this reviewer; they receive the shared separator behavior. A full merged-source TypeScript check and actual browser matrix remain integration gates owned by the coordinating agents.
